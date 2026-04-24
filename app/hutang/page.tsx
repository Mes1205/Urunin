"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Send,
  CheckCircle2, Clock, AlertCircle, ChevronRight
} from 'lucide-react';

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

export default function HutangPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hutangList, setHutangList]   = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [paying, setPaying]           = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setCurrentUser(user);

        const { data: debts } = await supabase
          .from('debts')
          .select(`
            id, amount, status, is_paid, created_at, debtor_note,
            receipt:receipts(id, store_name, total_amount, created_at),
            lender:profiles!lender_id(id, name, email)
          `)
          .eq('debtor_id', user.id)
          .eq('is_paid', false)
          .order('created_at', { ascending: false });

        setHutangList((debts || []).filter(d => d.receipt && d.lender));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [router]);

  const handleConfirmPayment = async (debtId: string, lenderId: string, receiptName: string) => {
    const note = prompt('Masukkan catatan transfer (opsional):', 'Sudah transfer ya!');
    if (note === null) return;
    setPaying(debtId);
    try {
      await supabase.from('debts')
        .update({ status: 'waiting_confirmation', debtor_note: note })
        .eq('id', debtId);

      await supabase.from('notifications').insert({
        user_id: lenderId,
        sender_id: currentUser.id,
        message: `💰 ${currentUser.user_metadata?.full_name || currentUser.email} konfirmasi pembayaran: ${receiptName}`,
      });

      alert('Konfirmasi pembayaran terkirim! ✅');
      window.location.reload();
    } catch (err: any) {
      alert(`Gagal konfirmasi pembayaran: ${err.message}`);
    } finally { setPaying(null); }
  };

  const groupByLender = () => {
    const grouped = new Map<string, { lender: any; debts: any[]; total: number }>();
    hutangList.forEach((debt: any) => {
      if (!debt.lender?.id) return;
      const lid = debt.lender.id;
      if (!grouped.has(lid)) grouped.set(lid, { lender: debt.lender, debts: [], total: 0 });
      const g = grouped.get(lid)!;
      g.debts.push(debt);
      g.total += debt.amount;
    });
    return Array.from(grouped.values());
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
      paid:                 { label: 'Lunas',              color: C.green,   bg: '#EBF7F1', Icon: CheckCircle2 },
      waiting_confirmation: { label: 'Menunggu Konfirmasi', color: '#B07A1A', bg: '#FEF3C7', Icon: Clock        },
    };
    const cfg = map[status] || { label: 'Belum Bayar', color: C.red, bg: '#FEE8E8', Icon: AlertCircle };
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
        style={{ background: cfg.bg }}>
        <cfg.Icon size={10} style={{ color: cfg.color }} />
        <span style={{ fontFamily: SF, fontWeight: 700, fontSize: '10px', color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin mb-4"
        style={{ borderColor: C.border, borderTopColor: C.primary }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>Memuat hutang…</p>
    </div>
  );

  const groupedData = groupByLender();
  const totalHutang = hutangList.reduce((a, c) => a + c.amount, 0);

  return (
    <div className="min-h-screen pb-20" style={{ background: C.bg, fontFamily: SF, color: C.text }}>
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-16 pt-8">

        {/* ── Back ──────────────────────────────────────────────────────────── */}
        <button onClick={() => router.push('/')}
          className="mb-6 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>
          <ArrowLeft size={15} /> Kembali
        </button>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '15px', color: C.textLt, marginBottom: '2px' }}>
            Tagihan yang perlu kamu bayar
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: 700, fontSize: '28px', color: C.text, letterSpacing: '-0.3px' }}>
            Hutang
          </h1>
        </div>

        {/* ── Summary Card ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 border mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadowHv }}>
          <div>
            <div className="w-8 h-1.5 rounded-full mb-3" style={{ background: C.red }} />
            <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '13px', color: C.textLt }}>Total Hutang Aktif</p>
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '32px', color: C.red, letterSpacing: '-0.5px', marginTop: '2px' }}>
              Rp {totalHutang.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '12px', color: C.textLt, marginBottom: '2px' }}>Tagihan</p>
              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.text }}>{hutangList.length}</p>
            </div>
            <div>
              <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '12px', color: C.textLt, marginBottom: '2px' }}>Orang</p>
              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.text }}>{groupedData.length}</p>
            </div>
          </div>
        </div>

        {/* ── Tips ──────────────────────────────────────────────────────────── */}
        {hutangList.length > 0 && (
          <div className="rounded-2xl p-4 border mb-5 flex items-start gap-3"
            style={{ background: C.accent, borderColor: C.border }}>
            <div className="text-lg shrink-0">💡</div>
            <div>
              <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: C.text, marginBottom: '2px' }}>
                Tips Pembayaran
              </p>
              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textMid, lineHeight: '1.6' }}>
                Klik "Konfirmasi Bayar" setelah transfer. Pemilik bill akan approve pembayaranmu.
              </p>
            </div>
          </div>
        )}

        {/* ── List ──────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {groupedData.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3"
              style={{ borderColor: C.border, background: C.card }}>
              <CheckCircle2 size={40} style={{ color: C.green }} />
              <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '15px', color: C.textMid }}>
                Tidak ada hutang! 🎉
              </p>
              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
                Kamu sudah lunas semua tagihan
              </p>
            </div>
          ) : (
            groupedData.map((group, idx) => (
              <div key={idx} className="rounded-2xl border overflow-hidden"
                style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>

                {/* Person header */}
                <div
                  onClick={() => router.push(`/profile/${group.lender.id}`)}
                  className="flex items-center justify-between px-6 py-4 cursor-pointer transition-colors hover:bg-[#FAFAFE]"
                  style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                      style={{ background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length], fontSize: '16px' }}>
                      {group.lender.name ? group.lender.name[0].toUpperCase() : <User size={18} />}
                    </div>
                    <div>
                      <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '15px', color: C.text }}>
                        {group.lender.name || 'Tanpa Nama'}
                      </p>
                      <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                        {group.lender.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total
                      </p>
                      <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '18px', color: C.red }}>
                        Rp {group.total.toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: C.textLt }} />
                  </div>
                </div>

                {/* Debt rows */}
                <div className="p-4 space-y-2">
                  {group.debts.map((debt) => {
                    const receiptName = debt.receipt?.store_name || 'Struk Tanpa Nama';
                    const receiptId   = debt.receipt?.id;

                    return (
                      <div key={debt.id}
                        className="flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 hover:border-[#D0CCEC] hover:bg-[#FAFAFE] group"
                        style={{ borderColor: C.border }}>

                        <div
                          onClick={() => receiptId && router.push(`/receipt/${receiptId}`)}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: C.red }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="truncate" style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>
                                {receiptName}
                              </p>
                              <StatusBadge status={debt.status} />
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                                {new Date(debt.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '13px', color: C.red }}>
                                Rp {debt.amount.toLocaleString()}
                              </p>
                            </div>
                            {debt.debtor_note && (
                              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '11px', color: C.textMid, marginTop: '2px' }}>
                                📝 {debt.debtor_note}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        {debt.status === 'pending' && (
                          <button
                            onClick={() => handleConfirmPayment(debt.id, debt.lender.id, receiptName)}
                            disabled={paying === debt.id}
                            className="ml-3 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                            style={{ background: C.green, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '12px',
                              boxShadow: '0 2px 8px rgba(61,170,114,0.28)' }}>
                            {paying === debt.id
                              ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Mengirim…</>
                              : <><Send size={12} /> Konfirmasi Bayar</>}
                          </button>
                        )}

                        {debt.status === 'waiting_confirmation' && (
                          <div className="ml-3 flex items-center gap-1.5 px-3 py-2 rounded-xl shrink-0"
                            style={{ background: '#FEF3C7', fontFamily: SF, fontWeight: 600, fontSize: '12px', color: '#B07A1A' }}>
                            <Clock size={12} /> Menunggu
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}