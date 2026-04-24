"use client";

import React, { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, Clock, XCircle,
  ThumbsUp, ThumbsDown, Send
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useModal } from '@/components/Modal';

interface OffsetOption {
  friendId: string;
  friendName: string;
  friendImage?: string;
  amountTheyOwe: number;
  amountYouOwe: number;
}

interface SettlementProposal {
  id: string;
  user_a_id: string;
  user_b_id: string;
  a_owes_b: number;
  b_owes_a: number;
  approved_by_a: boolean;
  approved_by_b: boolean;
  initiated_by: string;
  status: string;
  final_debtor_id?: string;
  final_amount?: number;
  created_at: string;
  completed_at?: string;
  user_a?: { name: string; image_url?: string };
  user_b?: { name: string; image_url?: string };
}

export default function SettlementPage() {
  const router = useRouter();
  const { success, error, confirm, info } = useModal();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [offsetSuggestions, setOffsetSuggestions] = useState<OffsetOption[]>([]);
  const [pendingProposals, setPendingProposals] = useState<SettlementProposal[]>([]);
  const [completedSettlements, setCompletedSettlements] = useState<SettlementProposal[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) await fetchSettlementData(authUser.id);
      setLoading(false);
    })();
  }, []);

  const fetchSettlementData = async (userId: string) => {
    try {
      // Get active debts for offset suggestions
      const { data: allDebts } = await supabase
        .from('debts')
        .select('*, debtor:profiles!debtor_id(name, image_url), lender:profiles!lender_id(name, image_url)')
        .or('lender_id.eq.'+userId+',debtor_id.eq.'+userId)
        .eq('is_paid', false);

      if (allDebts) {
        const balanceMap: Record<string, { name: string; image: string; credit: number; debt: number }> = {};
        allDebts.forEach(d => {
          if (d.lender_id === userId && d.debtor_id) {
            balanceMap[d.debtor_id] = balanceMap[d.debtor_id] || { 
              name: d.debtor?.name || 'Teman', 
              image: d.debtor?.image_url || '',
              credit: 0, 
              debt: 0 
            };
            balanceMap[d.debtor_id].credit += d.amount;
          } else if (d.debtor_id === userId && d.lender_id) {
            balanceMap[d.lender_id] = balanceMap[d.lender_id] || { 
              name: d.lender?.name || 'Teman',
              image: d.lender?.image_url || '',
              credit: 0, 
              debt: 0 
            };
            balanceMap[d.lender_id].debt += d.amount;
          }
        });

        // Get existing proposals to filter out
        const { data: existingProposals } = await supabase
          .from('settlement_proposals')
          .select('user_a_id, user_b_id')
          .eq('status', 'pending')
          .or('user_a_id.eq.'+userId+',user_b_id.eq.'+userId);

        const existingPairs = new Set(
          existingProposals?.map(p => [p.user_a_id, p.user_b_id].sort().join('-')) || []
        );

        setOffsetSuggestions(
          Object.entries(balanceMap)
            .filter(([friendId, v]) => {
              const pairKey = [userId, friendId].sort().join('-');
              return v.credit > 0 && v.debt > 0 && !existingPairs.has(pairKey);
            })
            .map(([id, v]) => ({ 
              friendId: id, 
              friendName: v.name,
              friendImage: v.image,
              amountTheyOwe: v.credit, 
              amountYouOwe: v.debt 
            }))
            .sort((a, b) => Math.min(b.amountTheyOwe, b.amountYouOwe) - Math.min(a.amountTheyOwe, a.amountYouOwe))
        );
      }

      // Get pending proposals
      const { data: proposals } = await supabase
        .from('settlement_proposals')
        .select('*, user_a:profiles!user_a_id(name, image_url), user_b:profiles!user_b_id(name, image_url)')
        .eq('status', 'pending')
        .or('user_a_id.eq.'+userId+',user_b_id.eq.'+userId)
        .order('created_at', { ascending: false });

      setPendingProposals(proposals || []);

      // Get completed settlements
      const { data: completed } = await supabase
        .from('settlement_proposals')
        .select('*, user_a:profiles!user_a_id(name, image_url), user_b:profiles!user_b_id(name, image_url)')
        .eq('status', 'completed')
        .or('user_a_id.eq.'+userId+',user_b_id.eq.'+userId)
        .order('completed_at', { ascending: false })
        .limit(10);

      setCompletedSettlements(completed || []);
    } catch (e) {
      console.error(e);
    }
  };

  const proposeSettlement = async (opt: OffsetOption) => {
    if (!user) return;

    const userIds = [user.id, opt.friendId].sort();
    const isUserA = userIds[0] === user.id;
    
    const aOwesB = isUserA ? opt.amountYouOwe : opt.amountTheyOwe;
    const bOwesA = isUserA ? opt.amountTheyOwe : opt.amountYouOwe;
    const netAmount = Math.abs(aOwesB - bOwesA);
    const finalDebtorId = aOwesB > bOwesA ? userIds[0] : userIds[1];

    confirm(
      '💡 Ajukan Settlement',
      <>
        <p className="mb-2">Kamu akan mengajukan settlement dengan <span className="font-black">{opt.friendName}</span>.</p>
        <p className="mb-3">Detail settlement:</p>
        <div className="bg-amber-50 p-4 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Mereka hutang ke kamu:</span>
            <span className="font-bold text-green-600">Rp {opt.amountTheyOwe.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Kamu hutang ke mereka:</span>
            <span className="font-bold text-red-600">Rp {opt.amountYouOwe.toLocaleString()}</span>
          </div>
          <div className="border-t border-amber-200 pt-2 flex justify-between font-black">
            <span>Setelah di-offset:</span>
            <span className={opt.amountYouOwe > opt.amountTheyOwe ? 'text-red-600' : 'text-green-600'}>
              {opt.amountYouOwe > opt.amountTheyOwe ? 'Kamu bayar' : 'Kamu terima'} Rp {netAmount.toLocaleString()}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          ⚠️ {opt.friendName} harus menyetujui proposal ini sebelum settlement dilakukan.
        </p>
      </>,
      async () => {
        setLoading(true);
        try {
          const { error: insertError } = await supabase
            .from('settlement_proposals')
            .insert({
              user_a_id: userIds[0],
              user_b_id: userIds[1],
              a_owes_b: aOwesB,
              b_owes_a: bOwesA,
              approved_by_a: isUserA,
              approved_by_b: !isUserA,
              initiated_by: user.id,
              status: 'pending',
              final_debtor_id: finalDebtorId,
              final_amount: netAmount,
              note: `Settlement proposal: offset ${Math.min(aOwesB, bOwesA).toLocaleString()}`
            });

          if (insertError) throw insertError;

          // Create notification for the other user
          await supabase.from('notifications').insert({
            user_id: opt.friendId,
            sender_id: user.id,
            message: `${user.user_metadata?.full_name || 'Seseorang'} mengajukan settlement utang. Cek sekarang!`
          });

          success('Proposal Terkirim! 📤', `Settlement proposal sudah dikirim ke ${opt.friendName}. Tunggu persetujuan mereka ya!`, () => {
            fetchSettlementData(user.id);
          });
        } catch (err) {
          console.error(err);
          error('Gagal', 'Tidak bisa mengirim proposal. Coba lagi ya.');
        } finally { 
          setLoading(false); 
        }
      },
      { confirm: 'Ajukan Settlement', cancel: 'Batalkan' }
    );
  };

  const handleApproval = async (proposal: SettlementProposal, approve: boolean) => {
    if (!user) return;

    const isUserA = proposal.user_a_id === user.id;
    const otherUser = isUserA ? proposal.user_b : proposal.user_a;

    if (approve) {
      confirm(
        '✅ Setujui Settlement',
        <>
          <p className="mb-2">Kamu akan menyetujui settlement dengan <span className="font-black">{otherUser?.name}</span>.</p>
          <div className="bg-green-50 p-4 rounded-xl space-y-2 text-sm mt-3">
            <div className="flex justify-between">
              <span>Yang akan di-offset:</span>
              <span className="font-bold text-gray-700">Rp {Math.min(proposal.a_owes_b, proposal.b_owes_a).toLocaleString()}</span>
            </div>
            <div className="border-t border-green-200 pt-2 flex justify-between font-black">
              <span>Sisa setelah settlement:</span>
              <span className={proposal.final_debtor_id === user.id ? 'text-red-600' : 'text-green-600'}>
                {proposal.final_debtor_id === user.id ? 'Kamu bayar' : 'Kamu terima'} Rp {proposal.final_amount?.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Setelah kamu setujui, settlement akan langsung diproses.
          </p>
        </>,
        async () => {
          setLoading(true);
          try {
            // Update approval status
            const updateData = isUserA 
              ? { approved_by_a: true, status: 'approved', approved_at: new Date().toISOString() }
              : { approved_by_b: true, status: 'approved', approved_at: new Date().toISOString() };

            await supabase
              .from('settlement_proposals')
              .update(updateData)
              .eq('id', proposal.id);

            // Execute settlement: mark old debts as paid with 'offset' status
            await supabase
              .from('debts')
              .update({ is_paid: true, status: 'offset', paid_at: new Date().toISOString() })
              .or(`and(lender_id.eq.${proposal.user_a_id},debtor_id.eq.${proposal.user_b_id}),and(lender_id.eq.${proposal.user_b_id},debtor_id.eq.${proposal.user_a_id})`)
              .eq('is_paid', false);

            // Create new debt for the remainder if any
            if (proposal.final_amount && proposal.final_amount > 0) {
              const lenderId = proposal.final_debtor_id === proposal.user_a_id ? proposal.user_b_id : proposal.user_a_id;
              const debtorId = proposal.final_debtor_id;
              
              await supabase.from('debts').insert({
                lender_id: lenderId,
                debtor_id: debtorId,
                amount: proposal.final_amount,
                note: `Sisa settlement dengan ${otherUser?.name}`,
                status: 'pending',
                admin_id: lenderId
              });
            }

            // Mark settlement as completed
            await supabase
              .from('settlement_proposals')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('id', proposal.id);

            // Notify the other user
            await supabase.from('notifications').insert({
              user_id: isUserA ? proposal.user_b_id : proposal.user_a_id,
              sender_id: user.id,
              message: `Settlement approved! ${proposal.final_amount ? `Sisa hutang: Rp ${proposal.final_amount.toLocaleString()}` : 'Semua lunas!'}`
            });

            // Create activity log
            await supabase.from('activities').insert([
              {
                user_id: proposal.user_a_id,
                action_type: 'settlement_completed',
                related_user_id: proposal.user_b_id,
                amount: proposal.final_amount || 0,
                message: `Settlement completed with ${otherUser?.name}`,
                metadata: { proposal_id: proposal.id }
              },
              {
                user_id: proposal.user_b_id,
                action_type: 'settlement_completed',
                related_user_id: proposal.user_a_id,
                amount: proposal.final_amount || 0,
                message: `Settlement completed with ${otherUser?.name}`,
                metadata: { proposal_id: proposal.id }
              }
            ]);

            success('Settlement Berhasil! 🎉', 
              proposal.final_amount 
                ? `Utang bolak-balik sudah di-offset! ${proposal.final_debtor_id === user.id ? 'Kamu' : otherUser?.name} tinggal bayar Rp ${proposal.final_amount.toLocaleString()}`
                : 'Utang bolak-balik sudah lunas sempurna!',
              () => fetchSettlementData(user.id)
            );
          } catch (err) {
            console.error(err);
            error('Gagal', 'Settlement tidak berhasil. Coba lagi ya.');
          } finally { 
            setLoading(false); 
          }
        },
        { confirm: 'Setujui', cancel: 'Batalkan' }
      );
    } else {
      confirm(
        '❌ Tolak Settlement',
        <p>Kamu yakin mau menolak proposal settlement dari <span className="font-black">{otherUser?.name}</span>?</p>,
        async () => {
          setLoading(true);
          try {
            await supabase
              .from('settlement_proposals')
              .update({ 
                status: 'rejected', 
                rejected_by: user.id,
                rejection_reason: 'Rejected by user'
              })
              .eq('id', proposal.id);

            await supabase.from('notifications').insert({
              user_id: isUserA ? proposal.user_b_id : proposal.user_a_id,
              sender_id: user.id,
              message: `Settlement proposal ditolak`
            });

            info('Proposal Ditolak', 'Settlement proposal sudah ditolak.', () => {
              fetchSettlementData(user.id);
            });
          } catch (err) {
            console.error(err);
            error('Gagal', 'Tidak bisa menolak proposal. Coba lagi ya.');
          } finally { 
            setLoading(false); 
          }
        },
        { confirm: 'Tolak', cancel: 'Batalkan' }
      );
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FDFCF0] flex flex-col items-center justify-center">
      <div className="w-20 h-20 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-6" />
      <h1 className="font-black text-2xl text-amber-800 animate-pulse tracking-tighter uppercase">Loading…</h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#4A4238] pb-20">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button 
          onClick={() => router.push('/')} 
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-[#2D2924] font-bold transition-colors"
        >
          <ArrowLeft size={18} /> Kembali
        </button>

        <header className="mb-10">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">
            Smart Settlement
          </div>
          <h1 className="text-5xl font-black text-[#2D2924] tracking-tighter italic mb-3">
            Potong Utang Otomatis 💡
          </h1>
          <p className="text-gray-500 font-medium text-lg">
            Selesaikan utang bolak-balik dengan mudah & hemat waktu
          </p>
        </header>

        <div className="space-y-8">
          {/* Pending Proposals - Need Action */}
          {pendingProposals.filter(p => {
            const isUserA = p.user_a_id === user?.id;
            return isUserA ? !p.approved_by_a : !p.approved_by_b;
          }).length > 0 && (
            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[3px] rounded-[2.5rem] shadow-xl">
              <div className="bg-white rounded-[calc(2.5rem-3px)] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-2xl">
                    <Clock className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Butuh Persetujuan Kamu</h2>
                    <p className="text-sm text-gray-500">
                      {pendingProposals.filter(p => {
                        const isUserA = p.user_a_id === user?.id;
                        return isUserA ? !p.approved_by_a : !p.approved_by_b;
                      }).length} proposal menunggu
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {pendingProposals
                    .filter(p => {
                      const isUserA = p.user_a_id === user?.id;
                      return isUserA ? !p.approved_by_a : !p.approved_by_b;
                    })
                    .map((proposal) => {
                      const isUserA = proposal.user_a_id === user?.id;
                      const otherUser = isUserA ? proposal.user_b : proposal.user_a;
                      const youOwe = isUserA ? proposal.a_owes_b : proposal.b_owes_a;
                      const theyOwe = isUserA ? proposal.b_owes_a : proposal.a_owes_b;

                      return (
                        <div key={proposal.id} className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center font-black text-white text-lg shadow-lg overflow-hidden flex-shrink-0">
                                {otherUser?.image_url ? (
                                  <img src={otherUser.image_url} alt={otherUser.name} className="w-full h-full object-cover" />
                                ) : (
                                  otherUser?.name?.charAt(0).toUpperCase() || '?'
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-black text-lg text-gray-900">
                                  Settlement dari {otherUser?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(proposal.created_at).toLocaleDateString('id-ID', { 
                                    day: 'numeric', month: 'short', year: 'numeric' 
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Mereka hutang ke kamu:</span>
                                <span className="font-bold text-green-600">Rp {theyOwe.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Kamu hutang ke mereka:</span>
                                <span className="font-bold text-red-600">Rp {youOwe.toLocaleString()}</span>
                              </div>
                              <div className="border-t border-gray-200 pt-2 flex justify-between font-black">
                                <span>Setelah di-offset:</span>
                                <span className={proposal.final_debtor_id === user?.id ? 'text-red-600' : 'text-green-600'}>
                                  {proposal.final_debtor_id === user?.id ? 'Kamu bayar' : 'Kamu terima'} Rp {proposal.final_amount?.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => handleApproval(proposal, true)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                              >
                                <ThumbsUp size={20} /> Setujui
                              </button>
                              <button
                                onClick={() => handleApproval(proposal, false)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                              >
                                <ThumbsDown size={20} /> Tolak
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Waiting for Approval */}
          {pendingProposals.filter(p => {
            const isUserA = p.user_a_id === user?.id;
            return isUserA ? p.approved_by_a : p.approved_by_b;
          }).length > 0 && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-2xl">
                  <Clock className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Menunggu Persetujuan</h2>
                  <p className="text-sm text-gray-500">
                    {pendingProposals.filter(p => {
                      const isUserA = p.user_a_id === user?.id;
                      return isUserA ? p.approved_by_a : p.approved_by_b;
                    }).length} proposal kamu menunggu
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {pendingProposals
                  .filter(p => {
                    const isUserA = p.user_a_id === user?.id;
                    return isUserA ? p.approved_by_a : p.approved_by_b;
                  })
                  .map((proposal) => {
                    const isUserA = proposal.user_a_id === user?.id;
                    const otherUser = isUserA ? proposal.user_b : proposal.user_a;

                    return (
                      <div key={proposal.id} className="flex items-center justify-between p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/30">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-white shadow-lg overflow-hidden">
                            {otherUser?.image_url ? (
                              <img src={otherUser.image_url} alt={otherUser.name} className="w-full h-full object-cover" />
                            ) : (
                              otherUser?.name?.charAt(0).toUpperCase() || '?'
                            )}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">
                              Menunggu {otherUser?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Sisa: Rp {proposal.final_amount?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-amber-600">
                          <Clock size={20} />
                          <span className="text-sm font-bold">Pending</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* New Settlement Opportunities */}
          {offsetSuggestions.length > 0 && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-2xl">
                  <RefreshCw className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Kesempatan Settlement</h2>
                  <p className="text-sm text-gray-500">
                    {offsetSuggestions.length} orang dengan utang bolak-balik
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {offsetSuggestions.map((opt, i) => {
                  const savingsAmount = Math.min(opt.amountTheyOwe, opt.amountYouOwe);
                  const netAmount = Math.abs(opt.amountTheyOwe - opt.amountYouOwe);
                  const youOwe = opt.amountYouOwe > opt.amountTheyOwe;

                  return (
                    <div 
                      key={i} 
                      className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-100 hover:border-amber-300 transition-all"
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-white text-xl shadow-lg overflow-hidden flex-shrink-0">
                            {opt.friendImage ? (
                              <img src={opt.friendImage} alt={opt.friendName} className="w-full h-full object-cover" />
                            ) : (
                              opt.friendName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-lg text-gray-900 mb-2 truncate">
                              {opt.friendName}
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <TrendingUp size={14} className="text-green-600 flex-shrink-0" />
                                <span className="text-gray-600">Mereka hutang:</span>
                                <span className="font-bold text-green-600">
                                  Rp {opt.amountTheyOwe.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <TrendingDown size={14} className="text-red-600 flex-shrink-0" />
                                <span className="text-gray-600">Kamu hutang:</span>
                                <span className="font-bold text-red-600">
                                  Rp {opt.amountYouOwe.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between items-end gap-3 md:min-w-[200px]">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">💰 Hemat Transaksi</p>
                            <p className="text-2xl font-black text-green-600">
                              Rp {savingsAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">
                              {youOwe ? '🔴 Kamu bayar sisa' : '🟢 Kamu terima sisa'}
                            </p>
                            <p className={`text-lg font-black ${youOwe ? 'text-red-600' : 'text-green-600'}`}>
                              Rp {netAmount.toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => proposeSettlement(opt)}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-all w-full md:w-auto flex items-center justify-center gap-2"
                          >
                            <Send size={18} /> Ajukan Settlement
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Opportunities */}
          {offsetSuggestions.length === 0 && pendingProposals.length === 0 && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <RefreshCw size={64} className="mx-auto mb-4 text-gray-300" />
                <p className="font-black text-xl text-gray-400 mb-2">
                  Tidak Ada Settlement Saat Ini
                </p>
                <p className="text-gray-400">
                  Belum ada utang bolak-balik yang bisa di-settle
                </p>
              </div>
            </div>
          )}

          {/* Completed Settlements History */}
          {completedSettlements.length > 0 && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-2xl">
                  <CheckCircle2 className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Riwayat Settlement</h2>
                  <p className="text-sm text-gray-500">
                    {completedSettlements.length} settlement berhasil
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {completedSettlements.map((settlement) => {
                  const isUserA = settlement.user_a_id === user?.id;
                  const otherUser = isUserA ? settlement.user_b : settlement.user_a;
                  
                  return (
                    <div 
                      key={settlement.id}
                      className="flex items-center justify-between p-5 rounded-2xl border-2 border-gray-50 hover:border-green-100 hover:bg-green-50/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center overflow-hidden">
                          {otherUser?.image_url ? (
                            <img src={otherUser.image_url} alt={otherUser.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-green-600">
                              {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">
                            Settlement dengan {otherUser?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {settlement.completed_at && new Date(settlement.completed_at).toLocaleDateString('id-ID', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-black text-green-600 text-sm">
                            {settlement.final_amount ? `Rp ${settlement.final_amount.toLocaleString()}` : 'Lunas'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {settlement.final_amount ? 'sisa' : 'sempurna'}
                          </p>
                        </div>
                        <CheckCircle2 size={20} className="text-green-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100">
            <div className="flex gap-4">
              <AlertCircle className="text-blue-500 flex-shrink-0" size={24} />
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-black text-gray-900">💡 Cara Kerja Smart Settlement:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Ajukan settlement ke teman yang punya utang bolak-balik</li>
                  <li>• Kedua pihak harus setuju sebelum settlement diproses</li>
                  <li>• Utang di-offset otomatis, tinggal bayar selisihnya</li>
                  <li>• Hemat waktu & transaksi, lebih efisien!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}