"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Users, Receipt } from 'lucide-react';
import { ReceiptData, Participant, SplitSessionData } from '@/lib/types';
import { useModal } from '@/components/Modal';
import { useInputModal } from '@/components/InputModal';

const SF     = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const SFText = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const C = {
  bg: '#ffffff', card: '#FFFFFF', border: '#E8E6F0',
  shadow: '0 2px 10px rgba(107,99,148,0.08)', shadowHv: '0 4px 18px rgba(107,99,148,0.14)',
  primary: '#6B63A8', primary2: '#8B7DB8', accent: '#F0EEF8',
  text: '#2E2C3A', textMid: '#6B6880', textLt: '#A8A5B8',
  green: '#3DAA72', red: '#E05B5B', darkBg: '#0D044B',
};

export default function SplitPage() {
  const router = useRouter();
  const { success, error, info } = useModal();
  const { prompt: promptInput, ModalComponent: InputModalComponent } = useInputModal();

  const [user, setUser]                         = useState<SupabaseUser | null>(null);
  const [loading, setLoading]                   = useState(false);
  const [receipt, setReceipt]                   = useState<ReceiptData | null>(null);
  const [preview, setPreview]                   = useState<string | null>(null);

  // ── Pisahkan "data ready" dari "guest name ready" ──────────────────────────
  const [dataReady, setDataReady]               = useState(false);  // data sudah load
  const [guestNameNeeded, setGuestNameNeeded]   = useState(false);  // perlu tanya nama
  const [ready, setReady]                       = useState(false);  // boleh render UI penuh

  const [participants, setParticipants]         = useState<Participant[]>([]);
  const [selectedLenderId, setSelectedLenderId] = useState<string>('');
  const [friendsList, setFriendsList]           = useState<any[]>([]);
  const [searchQuery, setSearchQuery]           = useState('');
  const [showFriendSelector, setShowFriendSelector] = useState(false);

  // ── STEP 1: load data tanpa blocking untuk prompt ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = sessionStorage.getItem('urunin_split_data');
        if (!raw) { router.push('/'); return; }

        const { receipt: r, preview: p }: SplitSessionData = JSON.parse(raw);
        setReceipt(r);
        setPreview(p);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        if (authUser) {
          // User login: langsung siapkan participant & render
          setParticipants([{
            id: authUser.id,
            name: authUser.user_metadata?.full_name || 'Saya',
            type: 'friend', items: [], email: authUser.email,
          }]);
          setSelectedLenderId(authUser.id);

          // Load friends di background, tidak blocking
          supabase
            .from('friends')
            .select('friend:profiles!friend_id(id, name, email, image_url)')
            .eq('user_id', authUser.id)
            .then(({ data: fd }) => setFriendsList(fd?.map(f => f.friend) || []));

          setReady(true); // langsung ready, tidak perlu tanya nama
        } else {
          // Guest: siapkan placeholder dulu, render dulu, BARU tanya nama
          const guestId = `guest-${Date.now()}`;
          setParticipants([{ id: guestId, name: 'Guest', type: 'guest', items: [] }]);
          setSelectedLenderId(guestId);
          setDataReady(true);        // data sudah siap
          setGuestNameNeeded(true);  // trigger modal setelah render
        }
      } catch (e) {
        console.error('Split init failed:', e);
        router.push('/');
      }
    })();
  }, []);

  // ── STEP 2: tanya nama guest SETELAH komponen render ─────────────────────
  // Ini jalan setelah dataReady=true, artinya DOM sudah ada, portal bisa mount
  useEffect(() => {
    if (!dataReady || !guestNameNeeded) return;

    (async () => {
      const guestName = await promptInput('Siapa nama kamu?', {
        description: 'Masukkan nama kamu untuk mulai split bill.',
        placeholder: 'Nama kamu…',
        defaultValue: '',
        confirmLabel: 'Mulai Split',
      });

      // Update nama participant dengan nama yang diinput
      setParticipants(prev => prev.map((p, i) =>
        i === 0 ? { ...p, name: guestName || 'Guest' } : p
      ));
      setGuestNameNeeded(false);
      setReady(true); // baru boleh render UI penuh
    })();
  }, [dataReady, guestNameNeeded]);

  // ── calculations ──────────────────────────────────────────────────────────
  const extraCosts = receipt
    ? (receipt.tax || 0) + (receipt.serviceCharge || 0) - (receipt.discount || 0) : 0;

  const getFinalTotal = () => {
    if (!receipt) return 0;
    return receipt.items.reduce((a, it) => a + it.price * (it.qty || 1), 0) + extraCosts;
  };

  const calculateItemExtraCost = (base: number) => {
    if (!receipt) return 0;
    const sub = receipt.items.reduce((a, it) => a + it.price * (it.qty || 1), 0);
    return sub === 0 ? 0 : base * (extraCosts / sub);
  };

  const calcShare = (p: Participant) => {
    if (!receipt) return 0;
    const finalTotal      = getFinalTotal();
    const currentSubtotal = receipt.items.reduce((a, it) => a + it.price * (it.qty || 1), 0);
    const feeRatio        = (finalTotal - currentSubtotal) / (currentSubtotal || 1);
    const personSub = p.items.reduce((sum, idx) => {
      const item    = receipt.items[idx];
      if (!item) return sum;
      const sharers = participants.filter(pp => pp.items.includes(idx)).length;
      return sum + (item.price * (item.qty || 1)) / (sharers || 1);
    }, 0);
    return Math.round(personSub + personSub * feeRatio);
  };

  // ── participant actions ───────────────────────────────────────────────────
  const addFriend = (friend: any) => {
    setParticipants(prev => [...prev, { id: friend.id, name: friend.name, type: 'friend', items: [], email: friend.email }]);
    setSearchQuery(''); setShowFriendSelector(false);
  };
  const addDummy = (name: string) => {
    if (!name.trim()) return;
    setParticipants(prev => [...prev, { id: `dummy-${Date.now()}`, name: name.trim(), type: 'dummy', items: [] }]);
    setSearchQuery(''); setShowFriendSelector(false);
  };
  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    if (selectedLenderId === id) setSelectedLenderId('');
  };
  const toggleItem = (participantId: string, itemIdx: number) => {
    setParticipants(prev => prev.map(p => {
      if (p.id !== participantId) return p;
      const has = p.items.includes(itemIdx);
      return { ...p, items: has ? p.items.filter(i => i !== itemIdx) : [...p.items, itemIdx] };
    }));
  };

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const handleFinishSplit = async () => {
    if (!receipt || !selectedLenderId) {
      error('Oops', 'Pilih dulu siapa yang bayar struk ini ya!');
      return;
    }
    setLoading(true);
    try {
      const finalTotal      = getFinalTotal();
      const currentSubtotal = receipt.items.reduce((a, it) => a + it.price * (it.qty || 1), 0);

      if (!user) {
        const payer = participants.find(p => p.id === selectedLenderId);
        const rows  = participants.filter(p => p.id !== selectedLenderId && calcShare(p) > 0);
        info('📊 Hasil Split Bill', <>
          <div className="flex justify-between items-center mb-3 pb-3 border-b" style={{ borderColor: C.border }}>
            <span style={{ fontFamily: SFText, fontWeight: 600, fontSize: '12px', color: C.textLt, textTransform: 'uppercase' }}>
              {receipt.store_name || 'Struk'}
            </span>
            <span style={{ fontFamily: SF, fontWeight: 700, fontSize: '15px', color: C.primary }}>
              Rp {finalTotal.toLocaleString()}
            </span>
          </div>
          <p style={{ fontFamily: SFText, fontSize: '13px', color: C.textMid, marginBottom: '12px' }}>
            💳 Dibayar oleh <strong style={{ color: C.text }}>{payer?.name}</strong>
          </p>
          <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', marginBottom: '8px' }}>
            Yang harus bayar:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl px-4 py-2" style={{ background: C.accent }}>
                <span style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>{p.name}</span>
                <span style={{ fontFamily: SF, fontWeight: 700, fontSize: '14px', color: C.primary }}>Rp {calcShare(p).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t" style={{ borderColor: C.border }}>
            <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '12px', color: '#b45309' }}>⚠️ Data tidak disimpan (Mode Guest)</p>
            <p style={{ fontFamily: SFText, fontSize: '12px', color: C.textMid, marginTop: '2px' }}>Login untuk simpan & kirim tagihan.</p>
          </div>
        </>);
        setLoading(false);
        return;
      }

      const { data: rcpt, error: rcptErr } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id, payer_id: selectedLenderId,
          store_name: receipt.store_name || 'Struk Baru',
          subtotal: currentSubtotal,
          tax: receipt.tax || 0, service_charge: receipt.serviceCharge || 0,
          discount: receipt.discount || 0, total_amount: finalTotal,
          items_raw: JSON.stringify(receipt.items),
          participants_snapshot: JSON.stringify(participants),
        })
        .select().single();

      if (rcptErr || !rcpt) {
        error('Gagal Simpan Struk', rcptErr?.message || 'Terjadi kesalahan.');
        return;
      }

      const debts = participants
        .filter(p => p.id !== selectedLenderId)
        .map(p => ({
          receipt_id: rcpt.id, lender_id: selectedLenderId,
          debtor_id: p.type === 'friend' ? p.id : null,
          debtor_name: (p.type === 'dummy' || p.type === 'guest') ? p.name.trim() : null,
          amount: calcShare(p), is_paid: false, status: 'pending', admin_id: user.id,
        }))
        .filter(d => d.amount > 0 && (d.debtor_id || d.debtor_name));

      if (debts.length > 0) {
        const { error: debtErr } = await supabase.from('debts').insert(debts);
        if (debtErr) { error('Gagal Simpan Hutang', `${debtErr.code} — ${debtErr.message}`); return; }
      }

      sessionStorage.removeItem('urunin_split_data');
      success('Tagihan Tersimpan 🚀', 'Struk & hutang sudah berhasil disimpan!', () => router.push('/'));

    } catch (err: any) {
      error('Kesalahan', err?.message || 'Sesuatu yang tidak diharapkan terjadi.');
    } finally {
      setLoading(false);
    }
  };

  // ── guards ────────────────────────────────────────────────────────────────
  // Tampilkan loading spinner sampai ready (untuk login user)
  // Kalau guest: tampilkan backdrop loading tipis sambil modal muncul di atas
  const showFullLoading = !dataReady && !ready;
  const showModalOverlay = dataReady && guestNameNeeded; // modal lagi tanya nama

  if (showFullLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg,#0D044B 0%,#3C327B 30%,#7870AB 53%,#C7C3DF 78%,#fff 100%)' }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
    </div>
  );

  if (!receipt) return null;

  const filteredFriends = friendsList.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !participants.some(p => p.id === f.id)
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-40" style={{ background: C.bg, fontFamily: SF, color: C.text }}>

      {/* Modal selalu di-render agar portal tersedia */}
      {InputModalComponent}

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        <button onClick={() => router.push('/')}
          className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>
          <ArrowLeft size={15} /> Kembali
        </button>

        <div className="rounded-[32px] p-8 border"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadowHv }}>
          <h2 style={{ fontFamily: SF, fontWeight: 700, fontSize: '26px', color: C.text, letterSpacing: '-0.3px', marginBottom: '4px' }}>
            Bagi-Bagi Bill 🍕
          </h2>
          <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '14px', color: C.textMid }}>
            Tentuin siapa bayar apa, lalu simpan tagihannya.
          </p>
        </div>

        {!user && (
          <div className="rounded-2xl p-4 border flex items-start gap-3"
            style={{ background: '#FFF8EC', borderColor: '#F0D080' }}>
            <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '13px', color: '#92680A' }}>
              ⚠️ Mode Guest — hasil split tidak disimpan.{' '}
              <span className="underline cursor-pointer" onClick={() => router.push('/login')}>Login →</span>
            </p>
          </div>
        )}

        {/* Konten di-blur sementara nunggu nama guest */}
        <div style={{ opacity: showModalOverlay ? 0.3 : 1, pointerEvents: showModalOverlay ? 'none' : 'auto', transition: 'opacity 0.2s' }}>

          {/* ── SIAPA YANG BAYAR ── */}
          <div className="rounded-[28px] p-6 border mb-6" style={{ background: C.accent, borderColor: C.border }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} style={{ color: C.primary }} />
              <p style={{ fontFamily: SFText, fontWeight: 700, fontSize: '11px', color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Siapa yang bayarin struk ini?
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <button key={p.id} onClick={() => setSelectedLenderId(p.id)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{
                    background:  selectedLenderId === p.id ? C.primary : C.card,
                    color:       selectedLenderId === p.id ? 'white'   : C.textMid,
                    border:      `1.5px solid ${selectedLenderId === p.id ? C.primary : C.border}`,
                    fontFamily:  SF,
                    boxShadow:   selectedLenderId === p.id ? `0 4px 14px rgba(107,99,168,0.30)` : 'none',
                    transform:   selectedLenderId === p.id ? 'scale(1.04)' : 'scale(1)',
                  }}>
                  {p.name}{p.id === user?.id ? ' (Me)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAMBAH PESERTA ── */}
          <div className="rounded-[28px] p-6 border mb-6" style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={15} style={{ color: C.primary }} />
                <h3 style={{ fontFamily: SF, fontWeight: 700, fontSize: '15px', color: C.text }}>Siapa Aja yang Makan? 👥</h3>
              </div>
              <span style={{ fontFamily: SFText, fontWeight: 500, fontSize: '12px', color: C.textLt }}>{participants.length} orang</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                  style={{
                    background:  p.type === 'friend' ? '#EEF0FF' : C.accent,
                    borderColor: p.type === 'friend' ? '#BFC4F0' : C.border,
                    fontFamily:  SFText, fontWeight: 600, fontSize: '12px',
                    color:       p.type === 'friend' ? '#3C3476' : C.textMid,
                  }}>
                  <span>{p.type === 'friend' ? '👤' : '👻'} {p.name}</span>
                  {p.id !== user?.id && (
                    <button onClick={() => removeParticipant(p.id)}
                      style={{ color: C.red, fontWeight: 800, fontSize: '15px', lineHeight: 1 }}>×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="relative">
              <input
                placeholder="Cari teman atau ketik nama baru…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowFriendSelector(e.target.value.length > 0); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    const match = filteredFriends.find(f => f.name.toLowerCase() === searchQuery.toLowerCase());
                    match ? addFriend(match) : addDummy(searchQuery);
                  }
                }}
                className="w-full outline-none"
                style={{
                  padding: '14px 100px 14px 18px', borderRadius: '16px',
                  border: `1.5px solid ${C.border}`,
                  fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.text, background: C.bg,
                }}
              />
              {searchQuery.trim() && (
                <button onClick={() => addDummy(searchQuery)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '12px' }}>
                  + Tambah
                </button>
              )}
            </div>

            {showFriendSelector && filteredFriends.length > 0 && (
              <div className="mt-2 rounded-2xl border overflow-hidden"
                style={{ borderColor: C.border, boxShadow: C.shadowHv, background: C.card, maxHeight: '240px', overflowY: 'auto' }}>
                <p style={{ fontFamily: SFText, fontWeight: 700, fontSize: '10px', color: C.textLt,
                  textTransform: 'uppercase', padding: '10px 16px 4px', letterSpacing: '0.08em' }}>
                  Teman ({filteredFriends.length})
                </p>
                {filteredFriends.map(f => (
                  <button key={f.id} onClick={() => addFriend(f)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F0EEF8]">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
                      style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primary2})` }}>
                      {f.image_url ? <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" /> : f.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: C.text }}>{f.name}</p>
                      <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '11px', color: C.textLt }}>{f.email}</p>
                    </div>
                    <span style={{ fontFamily: SF, fontWeight: 600, fontSize: '11px', color: C.primary }}>Pilih →</span>
                  </button>
                ))}
              </div>
            )}

            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt, marginTop: '10px', paddingLeft: '4px' }}>
              💡 Cari nama teman yang sudah ditambah, atau ketik nama baru untuk dummy participant.
            </p>
          </div>

          {/* ── ITEM ASSIGNMENT ── */}
          <div className="rounded-[28px] p-6 border mb-6" style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt size={15} style={{ color: C.primary }} />
                <h3 style={{ fontFamily: SF, fontWeight: 700, fontSize: '15px', color: C.text }}>Siapa Makan Apa? 🍽️</h3>
              </div>
              <span style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: C.primary }}>
                Rp {getFinalTotal().toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {receipt.items.map((item, itemIdx) => {
                const itemBase  = item.price * (item.qty || 1);
                const extra     = calculateItemExtraCost(itemBase);
                const itemFinal = itemBase + extra;
                const sharers   = participants.filter(p => p.items.includes(itemIdx)).length;
                const perPerson = sharers > 0 ? itemFinal / sharers : itemFinal;

                return (
                  <div key={itemIdx} className="p-5 rounded-[20px] border transition-colors"
                    style={{ background: C.bg, borderColor: C.border }}>
                    <div className="flex justify-between items-start mb-3">
                      <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: C.text, flex: 1, marginRight: '8px' }}>{item.name}</p>
                      <div className="text-right shrink-0">
                        <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '13px', color: C.primary }}>Rp {itemBase.toLocaleString()}</p>
                        {extra > 0 && <p style={{ fontFamily: SFText, fontSize: '10px', color: C.textLt }}>+ Rp {Math.round(extra).toLocaleString()} (tax/svc)</p>}
                      </div>
                    </div>
                    {sharers > 0 && (
                      <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '10px', color: C.primary, marginBottom: '8px' }}>
                        @ Rp {Math.round(perPerson).toLocaleString()} / orang
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-dashed" style={{ borderColor: C.border }}>
                      {participants.map(p => {
                        const on = p.items.includes(itemIdx);
                        return (
                          <button key={p.id} onClick={() => toggleItem(p.id, itemIdx)}
                            className="px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
                            style={{
                              background: on ? C.primary : C.accent,
                              color:      on ? 'white'   : C.textMid,
                              fontFamily: SFText, fontWeight: 600,
                              transform:  on ? 'scale(1.05)' : 'scale(1)',
                              boxShadow:  on ? `0 2px 8px rgba(107,99,168,0.25)` : 'none',
                            }}>
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── PER-PERSON SUMMARY ── */}
          {participants.length > 1 && (
            <div className="rounded-[28px] p-6 border mb-6" style={{ background: C.accent, borderColor: C.border }}>
              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '13px', color: C.textMid,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                📋 Ringkasan per Orang
              </p>
              <div className="space-y-2">
                {participants.map(p => {
                  const total   = calcShare(p);
                  const isPayer = p.id === selectedLenderId;
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full"
                          style={{ background: isPayer ? C.primary : p.type === 'friend' ? '#7B8CDE' : C.textLt }} />
                        <span style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>
                          {p.name}
                          {isPayer && <span style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.primary, marginLeft: '6px' }}>(Payer)</span>}
                        </span>
                      </div>
                      <span style={{ fontFamily: SF, fontWeight: 700, fontSize: '14px', color: isPayer ? C.primary : C.text }}>
                        {isPayer ? '— bayar' : `Rp ${total.toLocaleString()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SAVE ── */}
          <button
            onClick={handleFinishSplit}
            disabled={loading || !selectedLenderId}
            className="w-full py-5 rounded-[20px] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: C.primary, color: 'white',
              fontFamily: SF, fontWeight: 700, fontSize: '17px', letterSpacing: '-0.1px',
              boxShadow: `0 6px 20px rgba(107,99,168,0.38)`,
            }}>
            {loading ? 'Menyimpan…' : 'Simpan Tagihan ✨'}
          </button>

        </div>
      </div>
    </div>
  );
}