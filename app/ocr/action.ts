"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseServer } from "@/lib/supabase/server";

/* =========================
   Setup Gemini
========================= */
const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  throw new Error("GEMINI_API_KEY belum diset di environment.");
}

const genAI = new GoogleGenerativeAI(apiKey);

/* =========================
   Helper
========================= */
const safeNumber = (val: any): number => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : num;
};

const cleanJson = (text: string): string => {
  try {
    // Hapus markdown code blocks jika ada
    let cleaned = text.trim();
    
    // Hapus ```json di awal dan ``` di akhir
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    // Cari kurung kurawal pertama dan terakhir
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error("JSON object not found in response");
    }
    
    return cleaned.substring(startIdx, endIdx + 1);
  } catch (e) {
    console.error("cleanJson error:", e);
    throw new Error(`Failed to extract JSON: ${e}`);
  }
};

/* =========================
   Server Action
========================= */
export async function processReceipt(base64Image: string, userId?: string) {
  try {
    console.log("🔍 Starting receipt processing...");

    /* ===== Gemini Model (PERBAIKAN: Gunakan model yang benar) ===== */
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // ✅ Model yang valid
    });

    // ✅ Prompt yang lebih spesifik dan tegas
    const prompt = `
You are a receipt OCR system. Analyze this receipt image and extract ALL information.

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown, no explanations
2. Do NOT wrap output in \`\`\`json blocks
3. If you cannot read a value, use 0 for numbers or "Unknown" for text
4. Parse ALL items on the receipt

Required JSON format (example):
{
  "storeName": "Restaurant ABC",
  "items": [
    { "name": "Nasi Goreng", "price": 25000, "qty": 2 },
    { "name": "Es Teh", "price": 5000, "qty": 1 }
  ],
  "subtotal": 55000,
  "tax": 5500,
  "serviceCharge": 2750,
  "discount": 0,
  "totalAmount": 63250
}

NOW ANALYZE THIS RECEIPT:
`.trim();

    const imageData = base64Image.split(",")[1];
    const mimeType = base64Image.includes("png") ? "image/png" : "image/jpeg";

    console.log("📤 Sending to Gemini...");
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType,
        },
      },
    ]);

    /* ===== Parse JSON Aman ===== */
    const rawText = result.response.text();
    console.log("📥 Raw AI Output:", rawText.substring(0, 200) + "..."); // Log partial untuk debug

    const cleaned = cleanJson(rawText);
    console.log("🧹 Cleaned JSON:", cleaned.substring(0, 200) + "...");
    
    const parsed = JSON.parse(cleaned);
    console.log("✅ Parsed successfully:", {
      storeName: parsed.storeName,
      itemCount: parsed.items?.length,
      total: parsed.totalAmount
    });

    /* ===== PERBAIKAN: Validasi data ===== */
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error("Invalid items array in response");
    }

    // Sanitize items
    const sanitizedItems = parsed.items.map((item: any) => ({
      name: item.name || "Unknown Item",
      price: safeNumber(item.price),
      qty: safeNumber(item.qty) || 1
    }));

    /* ===== PERBAIKAN: Simpan ke Supabase dengan user_id ===== */
    const receiptData = {
      store_name: parsed.storeName || "Unknown Store",
      subtotal: safeNumber(parsed.subtotal),
      tax: safeNumber(parsed.tax),
      service_charge: safeNumber(parsed.serviceCharge),
      discount: safeNumber(parsed.discount),
      total_amount: safeNumber(parsed.totalAmount),
      items_raw: JSON.stringify(sanitizedItems),
      ...(userId && { user_id: userId }), // ✅ Tambahkan user_id jika ada
    };

    console.log("💾 Saving to database:", receiptData);

    const { data: saved, error } = await supabaseServer
      .from("receipts")
      .insert(receiptData)
      .select()
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("✅ Saved to database:", saved.id);

    // Return format yang sama dengan yang diharapkan frontend
    return {
      id: saved.id,
      store_name: saved.store_name,
      items: sanitizedItems,
      subtotal: saved.subtotal,
      tax: saved.tax,
      serviceCharge: saved.service_charge,
      discount: saved.discount,
      totalAmount: saved.total_amount,
    };
    
  } catch (err: any) {
    console.error("💥 processReceipt error:", {
      message: err.message,
      stack: err.stack?.substring(0, 500)
    });
    
    // Return error yang informatif
    throw new Error(`OCR Failed: ${err.message || 'Unknown error'}`);
  }
}