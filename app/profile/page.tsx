"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  User, Shield, LogOut, ChevronRight,
  Settings, X, Check, Bell, Users
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

export default function MyProfilePage() {
  const router = useRouter();
  const [loading, setLoading]           = useState(true);
  const [userData, setUserData]         = useState<any>(null);
  const [stats, setStats]               = useState({ friends: 0, transactions: 0 });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newName, setNewName]           = useState('');
  const [isUpdating, setIsUpdating]     = useState(false);

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserData(user);
    setNewName(user.user_metadata?.full_name || '');

    const { count: friendsCount } = await supabase
      .from('friends').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

    const { count: debtsCount } = await supabase
      .from('debts').select('*', { count: 'exact', head: true })
      .or(`lender_id.eq.${user.id},debtor_id.eq.${user.id}`);

    setStats({ friends: friendsCount || 0, transactions: debtsCount || 0 });
    setLoading(false);
  };

  useEffect(() => { fetchProfileData(); }, [router]);

  const handleUpdateName = async () => {
    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: newName } });
    if (error) { alert('Gagal update nama: ' + error.message); }
    else { setIsEditModalOpen(false); fetchProfileData(); }
    setIsUpdating(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin mb-4"
        style={{ borderColor: C.border, borderTopColor: C.primary }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>Loading…</p>
    </div>
  );

  const displayName = userData?.user_metadata?.full_name || 'User Urunin';
  const initials    = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const menuItems = [
    { Icon: Settings, label: 'Edit Nama Profil',     color: C.primary,  onClick: () => setIsEditModalOpen(true) },
    { Icon: Bell,     label: 'Notifikasi',            color: '#3D7FBB',  onClick: () => router.push('/notifications') },
    { Icon: Users,    label: 'Teman',                 color: C.green,    onClick: () => router.push('/friends') },
    { Icon: Shield,   label: 'Ubah Password',         color: C.textMid,  onClick: () => alert('Instruksi dikirim ke email!') },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: C.bg, fontFamily: SF, color: C.text }}>
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-16 pt-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '15px', color: C.textLt, marginBottom: '2px' }}>
            Akun kamu
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: 700, fontSize: '28px', color: C.text, letterSpacing: '-0.3px' }}>
            Profil
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">

          {/* ── LEFT: Identity Card ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Avatar + name */}
            <div className="rounded-2xl p-6 border flex flex-col items-center text-center"
              style={{ background: C.card, borderColor: C.border, boxShadow: C.shadowHv }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4"
                style={{ background: `linear-gradient(135deg,#b8b3d8,${C.primary})`, fontSize: '26px', fontWeight: 700 }}>
                {initials || <User size={32} />}
              </div>
              <div className="w-8 h-1.5 rounded-full mb-3" style={{ background: C.primary }} />
              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.text, letterSpacing: '-0.2px' }}>
                {displayName}
              </p>
              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt, marginTop: '3px' }}>
                {userData?.email}
              </p>
            </div>

            {/* Stats */}
            <div className="rounded-2xl p-5 border"
              style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
              <div className="flex justify-around">
                <button onClick={() => router.push('/friends')}
                  className="flex flex-col items-center hover:opacity-70 transition-opacity">
                  <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '22px', color: C.text }}>{stats.friends}</p>
                  <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Teman</p>
                </button>
                <div style={{ width: '1px', background: C.border }} />
                <div className="flex flex-col items-center">
                  <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '22px', color: C.text }}>{stats.transactions}</p>
                  <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaksi</p>
                </div>
                <div style={{ width: '1px', background: C.border }} />
                <div className="flex flex-col items-center">
                  <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '22px', color: C.green }}>●</p>
                  <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aktif</p>
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT: Menu + Logout ────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Settings menu */}
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
              <div className="px-5 pt-5 pb-3">
                <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Pengaturan Akun
                </p>
              </div>
              {menuItems.map(({ Icon, label, color, onClick }, i) => (
                <button key={i} onClick={onClick}
                  className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#FAFAFE] group"
                  style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: C.accent }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <span style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.text }}>
                      {label}
                    </span>
                  </div>
                  <ChevronRight size={15}
                    className="opacity-30 group-hover:opacity-100 transition-opacity"
                    style={{ color: C.primary }} />
                </button>
              ))}
            </div>

            {/* Logout */}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all hover:opacity-90"
              style={{
                background: '#FEE8E8',
                borderColor: '#FACACA',
                color: C.red,
                fontFamily: SF,
                fontWeight: 600,
                fontSize: '14px',
              }}>
              <LogOut size={16} />
              Keluar dari Urunin
            </button>

          </div>
        </div>
      </div>

      {/* ── Edit Name Modal ───────────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(46,44,58,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-3xl p-8 border"
            style={{ background: C.card, borderColor: C.border, boxShadow: C.shadowHv }}>

            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.text }}>
                Ubah Nama
              </h2>
              <button onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:opacity-70 transition-opacity"
                style={{ background: C.accent }}>
                <X size={16} style={{ color: C.textMid }} />
              </button>
            </div>

            <div className="mb-6">
              <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Nama Lengkap
              </p>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Masukkan nama baru…"
                className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                style={{
                  fontFamily: SFText,
                  fontWeight: 500,
                  fontSize: '14px',
                  color: C.text,
                  background: C.accent,
                  border: `1.5px solid ${C.border}`,
                }}
              />
            </div>

            <button onClick={handleUpdateName} disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{
                background: C.primary,
                color: 'white',
                fontFamily: SF,
                fontWeight: 600,
                fontSize: '14px',
                boxShadow: `0 4px 14px rgba(107,99,168,0.32)`,
              }}>
              {isUpdating
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menyimpan…</>
                : <><Check size={16} /> Simpan Perubahan</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}