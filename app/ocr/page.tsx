"use client";

import React, { useState, useRef, useEffect } from 'react';
import { processReceipt } from './action';

// Tipe data disesuaikan dengan return dari action.ts & Prisma
interface ReceiptData {
  id: string;
  items: { name: string; price: number; qty: number }[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  totalAmount: number;
}

export default function OcrPage() {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null); // State diganti jadi object
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageProcess = async (file: File) => {
    setReceipt(null);
    setLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreview(base64);

      try {
        const result = await processReceipt(base64);
        setReceipt(result as unknown as ReceiptData); // Type assertion biar aman
      } catch (err) {
        alert("Gagal membaca struk.");
      } finally {
        setLoading(false);
      }
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageProcess(file);
  };

  // ... (Bagian useEffect Paste Ctrl+V biarkan sama, tidak perlu diubah) ...
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;
      for (const item of Array.from(clipboardItems)) {
        if (item.type.startsWith("image")) {
          const file = item.getAsFile();
          if (file) handleImageProcess(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#4A4238] font-sans pb-20">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Header & Dropzone (Sama seperti sebelumnya) */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-[#2D2924] mb-2 tracking-tight">
            Split Bill <span className="text-amber-600 font-black">AI</span>
          </h1>
          <p className="text-[#877E71]">Paste <span className="font-bold text-amber-700">Ctrl+V</span> atau Upload struk.</p>
        </header>

        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer bg-white rounded-[2rem] shadow-sm border border-amber-100 p-6 mb-10 text-center hover:shadow-md transition-all">
           {/* Isi Dropzone sama seperti kode sebelumnya */}
           <p className="font-bold text-[#2D2924]">{loading ? "Sedang Menganalisis..." : "Klik atau Paste Struk"}</p>
           <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* KIRI: Preview Foto */}
          {preview && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white p-2 rounded-[2rem] shadow-lg border border-amber-100 rotate-1">
                <img src={preview} className="w-full h-auto rounded-2xl grayscale-[10%]" />
              </div>
            </div>
          )}

          {/* KANAN: Hasil Ekstraksi */}
          {receipt && !loading ? (
            <div className="bg-white rounded-[2rem] shadow-xl border border-amber-100 overflow-hidden animate-in slide-in-from-right-8">
              
              {/* Tabel Items */}
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50/50 sticky top-0">
                    <tr className="text-[#A8A296] text-[10px] uppercase tracking-wide border-b border-amber-100">
                      <th className="px-6 py-3 text-left">Menu</th>
                      <th className="px-6 py-3 text-center">Qty</th>
                      <th className="px-6 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {receipt.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-6 py-3 font-medium">{item.name}</td>
                        <td className="px-6 py-3 text-center text-amber-600">{item.qty}</td>
                        <td className="px-6 py-3 text-right">Rp {item.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rincian Biaya (Summary) */}
              <div className="p-6 bg-[#FAF9F6] border-t border-dashed border-amber-200 space-y-2 text-sm">
                <div className="flex justify-between text-[#877E71]">
                  <span>Subtotal</span>
                  <span>Rp {receipt.subtotal.toLocaleString()}</span>
                </div>
                {receipt.serviceCharge > 0 && (
                  <div className="flex justify-between text-[#877E71]">
                    <span>Service Charge</span>
                    <span>+ Rp {receipt.serviceCharge.toLocaleString()}</span>
                  </div>
                )}
                {receipt.tax > 0 && (
                  <div className="flex justify-between text-[#877E71]">
                    <span>Tax / PB1</span>
                    <span>+ Rp {receipt.tax.toLocaleString()}</span>
                  </div>
                )}
                {receipt.discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>- Rp {receipt.discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="p-6 bg-[#2D2924] text-white flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Total Bayar</p>
                  <p className="text-3xl font-serif italic text-amber-400">
                    Rp {receipt.totalAmount.toLocaleString()}
                  </p>
                </div>
                <button className="px-6 py-3 bg-amber-600 rounded-xl font-bold text-xs uppercase hover:bg-amber-500 transition-colors">
                  Bagi Bill →
                </button>
              </div>

            </div>
          ) : (
            loading && preview && <p className="text-center mt-10 animate-pulse text-amber-600">Sedang membaca detail struk...</p>
          )}

        </div>
      </div>
    </div>
  );
}