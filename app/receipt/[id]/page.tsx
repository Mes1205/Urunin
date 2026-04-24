"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, Receipt as ReceiptIcon,
  Users, CheckCircle2, Send, Ghost, Store, CreditCard, Clock
} from 'lucide-react';
import { useModal } from '@/components/Modal';
import { useInputModal } from '@/components/InputModal';

const SF     = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const SFText = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const C = {
  bg:       '#ffffff',
  card:     '#FFFFFF',
  border:   '#E8E6F0',
  shadow:   '0 2px 10px rgba(107,99,148,0.08)',
  shadowHv: '0 4px 18px rgba(107,99,148,0.14)',
  primary:  '#6B63A8',
  primary2: '#8B7DB8',
  accent:   '#F0EEF8',
  text:     '#2E2C3A',
  textMid:  '#6B6880',
  textLt:   '#A8A5B8',
  green:    '#3DAA72',
  greenBg:  '#EDF7F2',
  greenBd:  '#B8E0CC',
  amber:    '#D4910A',
  amberBg:  '#FEF6E4',
  amberBd:  '#F0D080',
  red:      '#E05B5B',
  redBg:    '#FEF2F2',
  redBd:    '#FECACA',
};

export default function ReceiptDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const { confirm, success, error } = useModal();
  const { prompt: promptInput, ModalComponent: InputModalComponent } = useInputModal();

  const [receipt, setReceipt]           = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [items, setItems]               = useState<any[]>([]);
  const [debts, setDebts]               = useState<any[]>([]);
  const [currentUser, setCurrentUser]   = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: rcpt, error: rcptErr } = await supabase
        .from('receipts').select('*').eq('id', id).single();

      if (rcptErr || !rcpt) {
        error('Tidak Ditemukan', 'Struk ini tidak ditemukan.');
        router.back();
        return;
      }

      const { data: debtData } = await supabase
        .from('debts').select('*').eq('receipt_id', id);

      setReceipt(rcpt);
      setDebts(debtData || []);
      setItems(JSON.parse(rcpt.items_raw || '[]'));
      if (rcpt.participants_snapshot) setParticipants(JSON.parse(rcpt.participants_snapshot));
      setLoading(false);
    })();
  }, [id]);

  const getAdditionalFees = (price: number) => {
    if (!receipt || receipt.subtotal === 0) return 0;
    const totalFees = receipt.total_amount - receipt.subtotal;
    return Math.round(totalFees * (price / receipt.subtotal));
  };

  const getPersonDetails = (personIdx: number) => {
    const person = participants[personIdx];
    if (!person?.items) return [];
    return person.items.map((itemIdx: number) => {
      const item = items[itemIdx];
      if (!item) return null;
      const sharers    = participants.filter((p: any) => p.items?.includes(itemIdx));
      const basePrice  = (item.price || 0) * (item.qty || 1);
      const additional = getAdditionalFees(basePrice);
      return {
        name:         item.name || 'Item',
        priceEach:    Math.round((basePrice + additional) / (sharers.length || 1)),
        sharersCount: sharers.length || 1,
      };
    }).filter(Boolean);
  };

  // FIX 2: cari debt untuk dummy pakai debtor_name, bukan debtor_id
  const findDebtForParticipant = (p: any) => {
    if (p.type === 'dummy' || p.type === 'guest') {
      return debts.find(d => d.debtor_name === p.name && d.debtor_id === null);
    }
    return debts.find(d => d.debtor_id === p.id);
  };

  const handleConfirmPayment = async (debtId: string) => {
    const note = await promptInput('Catatan Transfer', {
      description: 'Tambahkan catatan untuk konfirmasi pembayaranmu.',
      placeholder: 'cth: Sudah transfer ya!',
      defaultValue: '',
      confirmLabel: 'Kirim Konfirmasi',
    });
    if (note === null) return;

    setIsSubmitting(true);
    const { error: updErr } = await supabase
      .from('debts')
      .update({ status: 'waiting_confirmation', debtor_note: note || 'Sudah ya!' })
      .eq('id', debtId);

    if (!updErr) {
      await supabase.from('notifications').insert({
        user_id:    receipt.user_id,
        sender_id:  currentUser.id,
        receipt_id: receipt.id,
        message:    `${currentUser.email} konfirmasi bayar: ${receipt.store_name}`,
      });
      success('Konfirmasi Terkirim', 'Menunggu persetujuan dari penagih.', () => window.location.reload());
    } else {
      error('Gagal', 'Tidak bisa mengirim konfirmasi. Coba lagi ya.');
    }
    setIsSubmitting(false);
  };

  const handleApprovePayment = async (debtId: string) => {
    // FIX 2: guard jika debtId undefined
    if (!debtId) {
      error('Gagal', 'Data hutang tidak ditemukan di database.');
      return;
    }
    confirm('Konfirmasi Lunas', 'Tandai pembayaran ini sebagai lunas?', async () => {
      setIsSubmitting(true);
      const { error: updErr } = await supabase
        .from('debts').update({ status: 'paid', is_paid: true }).eq('id', debtId);
      if (!updErr) {
        success('Pembayaran Dikonfirmasi', 'Hutang sudah ditandai lunas.', () => window.location.reload());
      } else {
        error('Gagal', 'Tidak bisa mengkonfirmasi. Coba lagi.');
      }
      setIsSubmitting(false);
    }, { confirm: 'Ya, Lunas', cancel: 'Batal' });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg,#0D044B 0%,#3C327B 30%,#7870AB 53%,#C7C3DF 78%,#fff 100%)' }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '14px' }}>
        Memuat struk...
      </p>
    </div>
  );

  // FIX 1: payer adalah receipt.payer_id, bukan receipt.user_id
  const payerId  = receipt.payer_id || receipt.user_id;
  const isLender = currentUser?.id === receipt.user_id;
  const paidCount  = debts.filter(d => d.is_paid).length;
  const totalDebts = debts.length;

  return (
    <div className="min-h-screen pb-24" style={{ background: C.bg, fontFamily: SF, color: C.text }}>
      {InputModalComponent}

      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 py-10">

        <button onClick={() => router.push('/')}
          className="mb-8 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>
          <ArrowLeft size={15} /> Kembali
        </button>

        {/* ── 2-column layout ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* LEFT — sticky receipt card */}
          <div className="lg:sticky lg:top-24 space-y-4">

            {/* Hero card */}
            <div className="rounded-[28px] overflow-hidden border" style={{ borderColor: C.border, boxShadow: C.shadowHv }}>

              {/* Gradient header */}
              <div className="relative px-7 pt-7 pb-8"
                style={{ background: 'linear-gradient(135deg,#0D044B 0%,#3C327B 60%,#6B63A8 100%)' }}>

                <div className="absolute top-5 right-5 px-3 py-1 rounded-full"
                  style={{ background: isLender ? C.primary2 : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <p style={{ fontFamily: SFText, fontWeight: 700, fontSize: '10px', color: 'white',
                    textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {isLender ? 'Penagih' : 'Pembayar'}
                  </p>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <Store size={18} color="white" />
                  </div>
                  <div>
                    <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '10px',
                      color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Struk dari
                    </p>
                    <h1 style={{ fontFamily: SF, fontWeight: 800, fontSize: '22px',
                      color: 'white', letterSpacing: '-0.3px', lineHeight: 1.15 }}>
                      {receipt.store_name}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-5 flex-wrap mb-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} color="rgba(255,255,255,0.45)" />
                    <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                      {new Date(receipt.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={11} color="rgba(255,255,255,0.45)" />
                    <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                      {participants.length} orang
                    </p>
                  </div>
                </div>

                <div className="pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                  <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '10px',
                    color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                    Total Tagihan
                  </p>
                  <p style={{ fontFamily: SF, fontWeight: 800, fontSize: '32px', color: 'white', letterSpacing: '-0.5px' }}>
                    Rp {receipt.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress */}
              {totalDebts > 0 && (
                <div className="px-7 py-4 border-b flex items-center gap-3"
                  style={{ background: C.accent, borderColor: C.border }}>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(paidCount / totalDebts) * 100}%`, background: C.green }} />
                  </div>
                  <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '12px', color: C.textMid, whiteSpace: 'nowrap' }}>
                    {paidCount}/{totalDebts} lunas
                  </p>
                </div>
              )}

              {/* Breakdown */}
              <div className="px-7 py-5 space-y-3">
                {[
                  { label: 'Subtotal',     value: receipt.subtotal,                              color: C.text },
                  { label: 'Tax',          value: receipt.tax,                                   color: C.text },
                  { label: 'Service',      value: receipt.service_charge,                        color: C.text },
                  { label: 'Diskon',       value: -(receipt.discount || 0),                      color: C.green },
                ].filter(r => r.value !== 0).map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>{label}</p>
                    <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color }}>
                      {value < 0 ? `- Rp ${Math.abs(value).toLocaleString()}` : `Rp ${value.toLocaleString()}`}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.border }}>
                  <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '14px', color: C.text }}>Total</p>
                  <p style={{ fontFamily: SF, fontWeight: 800, fontSize: '16px', color: C.primary }}>
                    Rp {receipt.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer watermark */}
            <div className="flex items-center justify-center gap-2" style={{ opacity: 0.3 }}>
              <ReceiptIcon size={13} style={{ color: C.textLt }} />
              <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt }}>
                {receipt.store_name} · {new Date(receipt.created_at).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>

          {/* RIGHT — participant list */}
          <div className="space-y-4">
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.text, marginBottom: '4px' }}>
              Rincian per Orang
            </p>

            {participants.map((p: any, i: number) => {
              const details    = getPersonDetails(i);
              // FIX 2: gunakan helper yang benar
              const personDebt = findDebtForParticipant(p);
              const totalAmt   = details.reduce((acc: number, curr: any) => acc + curr.priceEach, 0);
              const isDummy    = p.type === 'dummy' || p.type === 'guest';
              // FIX 1: payer tidak punya status hutang
              const isPayer    = p.id === payerId;
              const status     = isPayer ? 'payer' : (personDebt?.status || 'pending');

              const statusMap = {
                payer:                 { label: 'Bayar Struk',           bg: C.accent,   bd: C.border,  dot: C.primary, text: C.primary },
                paid:                  { label: 'Lunas',                 bg: C.greenBg,  bd: C.greenBd, dot: C.green,   text: C.green   },
                waiting_confirmation:  { label: 'Menunggu Konfirmasi',   bg: C.amberBg,  bd: C.amberBd, dot: C.amber,   text: C.amber   },
                pending:               { label: 'Belum Bayar',           bg: C.redBg,    bd: C.redBd,   dot: C.red,     text: C.red     },
              } as const;

              const sc = statusMap[status as keyof typeof statusMap] ?? statusMap.pending;

              return (
                <div key={i} className="rounded-[24px] border overflow-hidden"
                  style={{ background: sc.bg, borderColor: sc.bd, boxShadow: C.shadow }}>

                  {/* Header */}
                  <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: isDummy ? 'rgba(107,99,168,0.10)' : C.primary + '18' }}>
                        {isDummy
                          ? <Ghost size={18} style={{ color: C.textLt }} />
                          : <Users size={18} style={{ color: C.primary }} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '15px', color: C.text }}>{p.name}</p>
                          {isDummy && (
                            <span className="px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(107,99,168,0.10)', fontFamily: SFText,
                                fontWeight: 700, fontSize: '9px', color: C.textMid,
                                textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Dummy
                            </span>
                          )}
                          {isPayer && (
                            <span className="px-2 py-0.5 rounded-full"
                              style={{ background: C.primary + '18', fontFamily: SFText,
                                fontWeight: 700, fontSize: '9px', color: C.primary,
                                textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Payer
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                          <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: sc.text }}>
                            {sc.label}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Amount — sembunyikan untuk payer karena dia yang bayar semua */}
                    {!isPayer && (
                      <div className="text-right shrink-0">
                        <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '10px',
                          color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                          Tagihan
                        </p>
                        <p style={{ fontFamily: SF, fontWeight: 800, fontSize: '19px', color: C.primary }}>
                          Rp {totalAmt.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Item list */}
                  {details.length > 0 && (
                    <div className="mx-6 mb-4 rounded-2xl overflow-hidden border"
                      style={{ background: 'rgba(255,255,255,0.7)', borderColor: sc.bd }}>
                      {details.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-2.5"
                          style={{ borderBottom: idx < details.length - 1 ? `1px solid ${sc.bd}` : 'none' }}>
                          <div>
                            <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '13px', color: C.text }}>
                              {item.name}
                            </p>
                            {item.sharersCount > 1 && (
                              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '10px', color: C.textLt }}>
                                Dibagi {item.sharersCount} orang
                              </p>
                            )}
                          </div>
                          <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '13px', color: C.textMid }}>
                            Rp {item.priceEach.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Debtor note */}
                  {personDebt?.debtor_note && (
                    <div className="mx-6 mb-4 px-4 py-3 rounded-xl flex items-start gap-2"
                      style={{ background: C.amberBg, border: `1px solid ${C.amberBd}` }}>
                      <CreditCard size={13} style={{ color: C.amber, marginTop: '1px', flexShrink: 0 }} />
                      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '12px', color: C.amber }}>
                        {personDebt.debtor_note}
                      </p>
                    </div>
                  )}

                  {/* Action buttons — jangan tampilkan untuk payer */}
                  {!isPayer && (
                    <div className="px-6 pb-5">
                      {/* Debtor kirim konfirmasi */}
                      {!isLender && currentUser?.id === p.id && status === 'pending' && personDebt && (
                        <button onClick={() => handleConfirmPayment(personDebt.id)}
                          disabled={isSubmitting}
                          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                          style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 700, fontSize: '14px',
                            boxShadow: `0 4px 14px rgba(107,99,168,0.28)` }}>
                          <Send size={14} /> Kirim Konfirmasi Bayar
                        </button>
                      )}

                      {/* Lender approve — FIX 2: pakai personDebt?.id yang sudah benar */}
                      {isLender && (status === 'waiting_confirmation' || (isDummy && status === 'pending')) && (
                        <button onClick={() => handleApprovePayment(personDebt?.id)}
                          disabled={isSubmitting}
                          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                          style={{ background: C.green, color: 'white', fontFamily: SF, fontWeight: 700, fontSize: '14px',
                            boxShadow: `0 4px 14px rgba(61,170,114,0.25)` }}>
                          <CheckCircle2 size={14} />
                          {isDummy ? 'Tandai Lunas (Manual)' : 'Konfirmasi Pembayaran'}
                        </button>
                      )}

                      {/* Waiting — info for lender */}
                      {isLender && status === 'waiting_confirmation' && (
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{ background: C.amberBg }}>
                          <Clock size={12} style={{ color: C.amber }} />
                          <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.amber }}>
                            Menunggu konfirmasi dari {p.name}
                          </p>
                        </div>
                      )}

                      {/* Paid badge */}
                      {status === 'paid' && (
                        <div className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2"
                          style={{ background: C.greenBg, border: `1px solid ${C.greenBd}` }}>
                          <CheckCircle2 size={14} style={{ color: C.green }} />
                          <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: C.green }}>Sudah Lunas</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}