"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  UserMinus, Check, X, User, ArrowLeft,
  Search, UserPlus, Users, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Design tokens (sama dengan HomePage) ──────────────────────────────────────
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

// Avatar warna per index
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#b8b3d8,#8B7DB8)',
  'linear-gradient(135deg,#95c8a8,#3DAA72)',
  'linear-gradient(135deg,#b8d4f0,#3D7FBB)',
  'linear-gradient(135deg,#f0c8b8,#E05B5B)',
  'linear-gradient(135deg,#f7c948,#e8903a)',
];

function Avatar({ name, image, size = 40, index = 0 }: { name: string; image?: string; size?: number; index?: number }) {
  if (image) return (
    <img src={image} alt={name} className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }} />
  );
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38, background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length] }}>
      {name ? name[0].toUpperCase() : <User size={size * 0.44} />}
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser]   = useState<any>(null);
  const [friends, setFriends]           = useState<any[]>([]);
  const [requests, setRequests]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  // Search
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching]       = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUser(user);
      await loadData(user.id);
      setLoading(false);
    })();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => handleSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadData = async (userId: string) => {
    try {
      // Incoming friend requests
      const { data: reqData } = await supabase
        .from('friend_requests')
        .select('id, sender:profiles!sender_id (id, name, email, image_url)')
        .eq('receiver_id', userId)
        .eq('status', 'pending');
      if (reqData) setRequests(reqData);

      // Friends list
      const { data: friendData } = await supabase
        .from('friends')
        .select('profiles!friend_id (id, name, email, image_url)')
        .eq('user_id', userId);
      if (friendData) {
        setFriends(friendData.map((f: any) => f.profiles).filter(Boolean));
      }

      // Already-sent pending requests (to disable button)
      const { data: sentData } = await supabase
        .from('friend_requests')
        .select('receiver_id')
        .eq('sender_id', userId)
        .eq('status', 'pending');
      if (sentData) setSentRequests(new Set(sentData.map((r: any) => r.receiver_id)));

    } catch (err) { console.error(err); }
  };

  const handleSearch = async (query: string) => {
    if (!currentUser || !query.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, image_url')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', currentUser.id)
        .limit(10);
      setSearchResults(data || []);
    } catch (err) { console.error(err); }
    finally { setSearching(false); }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!currentUser) return;
    try {
      // Cek apakah sudah ada request
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('id')
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),` +
          `and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
        )
        .maybeSingle();

      if (existing) return;

      await supabase.from('friend_requests').insert({
        sender_id: currentUser.id,
        receiver_id: receiverId,
        status: 'pending',
      });

      // Notifikasi ke receiver
      await supabase.from('notifications').insert({
        user_id: receiverId,
        sender_id: currentUser.id,
        message: 'Mengirim permintaan pertemanan kepadamu.',
      });

      setSentRequests(prev => new Set([...prev, receiverId]));
    } catch (err) { console.error(err); }
  };

  const handleRequest = async (requestId: string, senderId: string, action: 'accept' | 'reject') => {
    if (action === 'reject') {
      await supabase.from('friend_requests').delete().eq('id', requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      return;
    }
    try {
      await supabase.from('friends').insert([
        { user_id: currentUser.id, friend_id: senderId },
        { user_id: senderId,       friend_id: currentUser.id },
      ]);
      await supabase.from('friend_requests').delete().eq('id', requestId);
      await supabase.from('notifications').insert({
        user_id: senderId,
        sender_id: currentUser.id,
        message: 'Menerima permintaan pertemananmu.',
      });
      await loadData(currentUser.id);
    } catch (err) { console.error(err); }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await supabase.from('friends').delete()
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (err) { console.error(err); }
  };

  // Helpers: apakah user sudah jadi teman
  const isFriend      = (id: string) => friends.some(f => f.id === id);
  const isRequestSent = (id: string) => sentRequests.has(id);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin mb-4"
        style={{ borderColor: C.border, borderTopColor: C.primary }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>Loading…</p>
    </div>
  );

  const showSearch = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen pb-20" style={{ background: C.bg, fontFamily: SF, color: C.text }}>
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-16 pt-8">

        {/* ── Back ────────────────────────────────────────────────────────────── */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}
        >
          <ArrowLeft size={15} /> Kembali
        </button>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '15px', color: C.textLt, marginBottom: '2px' }}>
            Kelola teman split bill kamu
          </p>
          <div className="flex items-center gap-3">
            <h1 style={{ fontFamily: SF, fontWeight: 700, fontSize: '28px', color: C.text, letterSpacing: '-0.3px' }}>
              Friends
            </h1>
            {friends.length > 0 && (
              <div className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full"
                style={{ background: C.accent, fontFamily: SF, fontWeight: 700, fontSize: '12px', color: C.primary }}>
                {friends.length}
              </div>
            )}
          </div>
        </div>

        {/* ── Search Bar ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 border mb-5"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
          <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Cari Pengguna
          </p>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.textLt }} />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl outline-none transition-all"
              style={{
                fontFamily: SFText,
                fontWeight: 500,
                fontSize: '14px',
                color: C.text,
                background: C.accent,
                border: `1.5px solid ${C.border}`,
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity">
                <X size={14} style={{ color: C.textLt }} />
              </button>
            )}
          </div>

          {/* Search Results */}
          {showSearch && (
            <div className="mt-3 space-y-2">
              {searching ? (
                <div className="flex items-center gap-2 py-3 justify-center">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: C.border, borderTopColor: C.primary }} />
                  <p style={{ fontFamily: SFText, fontSize: '13px', color: C.textMid }}>Mencari…</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-4 text-center">
                  <p style={{ fontFamily: SFText, fontSize: '13px', color: C.textLt }}>
                    Tidak ditemukan pengguna dengan kata kunci "{searchQuery}"
                  </p>
                </div>
              ) : (
                searchResults.map((user, i) => {
                  const alreadyFriend = isFriend(user.id);
                  const requestSent   = isRequestSent(user.id);
                  return (
                    <div key={user.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border"
                      style={{ borderColor: C.border, background: C.bg }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={user.name || user.email} image={user.image_url} size={36} index={i} />
                        <div className="min-w-0">
                          <p className="truncate" style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>
                            {user.name || 'User'}
                          </p>
                          <p className="truncate" style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Action button */}
                      {alreadyFriend ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                          style={{ background: C.accent }}>
                          <Check size={13} style={{ color: C.green }} />
                          <span style={{ fontFamily: SF, fontWeight: 600, fontSize: '12px', color: C.green }}>
                            Teman
                          </span>
                        </div>
                      ) : requestSent ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                          style={{ background: C.accent }}>
                          <Clock size={13} style={{ color: C.textMid }} />
                          <span style={{ fontFamily: SF, fontWeight: 600, fontSize: '12px', color: C.textMid }}>
                            Dikirim
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                          style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '12px' }}>
                          <UserPlus size={13} />
                          Tambah
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Incoming Requests ───────────────────────────────────────────────── */}
        {requests.length > 0 && (
          <div className="rounded-2xl p-6 border mb-4"
            style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl" style={{ background: C.accent }}>
                <UserPlus size={16} style={{ color: C.primary }} />
              </div>
              <div className="flex items-center gap-2">
                <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '16px', color: C.text }}>
                  Permintaan Masuk
                </p>
                <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full"
                  style={{ background: C.red, fontFamily: SF, fontWeight: 700, fontSize: '11px', color: 'white' }}>
                  {requests.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {requests.map((req, i) => (
                <div key={req.id}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl border"
                  style={{ background: C.accent, borderColor: C.border }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={req.sender.name || req.sender.email} image={req.sender.image_url} size={38} index={i} />
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>
                        {req.sender.name || 'User'}
                      </p>
                      <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textMid }}>
                        Ingin mutualan 👋
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRequest(req.id, req.sender.id, 'reject')}
                      className="flex items-center justify-center w-8 h-8 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
                      <X size={15} style={{ color: C.textMid }} />
                    </button>
                    <button
                      onClick={() => handleRequest(req.id, req.sender.id, 'accept')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                      style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '13px',
                        boxShadow: `0 2px 8px rgba(107,99,168,0.28)` }}>
                      <Check size={14} />
                      Terima
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Friends List ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 border"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: C.accent }}>
              <Users size={16} style={{ color: C.primary }} />
            </div>
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '16px', color: C.text }}>
              Mutual Friends
            </p>
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
              {friends.length} orang
            </p>
          </div>

          {friends.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-12 gap-2"
              style={{ borderColor: C.border }}>
              <Users size={36} style={{ color: C.border }} />
              <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.textMid }}>
                Belum ada teman
              </p>
              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
                Cari teman pakai search bar di atas!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend, i) => (
                <div key={friend.id}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 hover:border-[#D0CCEC] hover:bg-[#FAFAFE] group"
                  style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {/* accent dot — same as activity rows */}
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: C.primary }} />
                    <Avatar name={friend.name || friend.email} image={friend.image_url} size={38} index={i} />
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>
                        {friend.name || 'User'}
                      </p>
                      <p className="truncate" style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                        {friend.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="flex items-center justify-center w-8 h-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                    title="Hapus teman"
                    style={{ border: `1.5px solid ${C.border}` }}>
                    <UserMinus size={15} style={{ color: C.red }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}