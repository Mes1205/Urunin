"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Clock, ChevronRight, Receipt } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const SF     = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const SFText = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const C = {
  bg:      '#ffffff',
  card:    '#FFFFFF',
  border:  '#E8E6F0',
  shadow:  '0 2px 10px rgba(107,99,148,0.08)',
  shadowHv:'0 4px 18px rgba(107,99,148,0.14)',
  primary: '#6B63A8',
  accent:  '#F0EEF8',
  text:    '#2E2C3A',
  textMid: '#6B6880',
  textLt:  '#A8A5B8',
  green:   '#3DAA72',
  red:     '#E05B5B',
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#b8b3d8,#8B7DB8)',
  'linear-gradient(135deg,#95c8a8,#3DAA72)',
  'linear-gradient(135deg,#b8d4f0,#3D7FBB)',
  'linear-gradient(135deg,#f0c8b8,#E05B5B)',
  'linear-gradient(135deg,#f7c948,#e8903a)',
];

export default function ProfilePage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, name, email, image_url')
        .eq('id', id)
        .single();
      setProfile(userData);

      const { data: historyData } = await supabase
        .from('receipts')
        .select('id, store_name, total_amount, created_at, items_raw')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (historyData) setHistory(historyData);
      setLoading(false);
    })();
  }, [id]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin mb-4"
        style={{ borderColor: C.border, borderTopColor: C.primary }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>Memuat profil…</p>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
      <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '16px', color: C.textMid }}>User tidak ditemukan.</p>
      <button onClick={() => router.back()} className="mt-4 hover:opacity-70 transition-opacity"
        style={{ fontFamily: SFText, fontWeight: 600, fontSize: '14px', color: C.primary }}>
        ← Kembali
      </button>
    </div>
  );

  const totalSpend = history.reduce((a, c) => a + c.total_amount, 0);

  return (
    <div className="min-h-screen pb-20" style={{ background: C.bg, fontFamily: SF, color: C.text }}>
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-16 pt-8">

        {/* ── Back ──────────────────────────────────────────────────────────── */}
        <button onClick={() => router.back()}
          className="mb-6 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>
          <ArrowLeft size={15} /> Kembali
        </button>

        {/* ── Profile Card ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 border mb-5 flex flex-col sm:flex-row sm:items-center gap-5"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadowHv }}>

          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0 overflow-hidden"
            style={{ background: AVATAR_GRADIENTS[0], fontSize: '26px', fontWeight: 700 }}>
            {profile.image_url
              ? <img src={profile.image_url} alt={profile.name} className="w-full h-full object-cover" />
              : profile.name ? profile.name[0].toUpperCase() : <User size={28} />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="w-8 h-1.5 rounded-full mb-3" style={{ background: C.primary }} />
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '22px', color: C.text, letterSpacing: '-0.2px' }}>
              {profile.name || 'Tanpa Nama'}
            </p>
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt, marginTop: '2px' }}>
              {profile.email}
            </p>
          </div>

          {/* Mini stats */}
          <div className="flex gap-6 shrink-0">
            <div>
              <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Transaksi</p>
              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.text }}>{history.length}</p>
            </div>
            <div>
              <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Total</p>
              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.primary }}>
                Rp {(totalSpend / 1000).toFixed(0)}k
              </p>
            </div>
          </div>
        </div>

        {/* ── History Section ───────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 border"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: C.accent }}>
              <Receipt size={16} style={{ color: C.primary }} />
            </div>
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '16px', color: C.text }}>
              Riwayat Split Bill
            </p>
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
              {history.length} transaksi
            </p>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-12 gap-2"
              style={{ borderColor: C.border }}>
              <Receipt size={36} style={{ color: C.border }} />
              <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.textMid }}>
                Belum ada riwayat transaksi
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                let previewItems = '';
                try {
                  const parsed = JSON.parse(item.items_raw || '[]');
                  const names  = parsed.slice(0, 2).map((i: any) => i.name);
                  const more   = parsed.length - 2;
                  previewItems = names.join(', ') + (more > 0 ? ` +${more} lainnya` : '');
                } catch {}

                return (
                  <div key={item.id}
                    onClick={() => router.push(`/receipt/${item.id}`)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-200 hover:border-[#D0CCEC] hover:bg-[#FAFAFE] group"
                    style={{ borderColor: C.border }}>

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: C.primary }} />
                      <div className="min-w-0">
                        <p className="truncate" style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>
                          {item.store_name || 'Struk Tanpa Nama'}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Clock size={11} style={{ color: C.textLt }} />
                            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                              {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          {previewItems && (
                            <p className="truncate max-w-[200px]"
                              style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                              {previewItems}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '14px', color: C.primary }}>
                        Rp {item.total_amount.toLocaleString()}
                      </p>
                      <ChevronRight size={15} className="opacity-30 group-hover:opacity-100 transition-opacity"
                        style={{ color: C.primary }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}