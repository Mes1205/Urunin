//app/search/page.tsx

"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, UserCheck, Clock, User as UserIcon } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Load User & Data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user && query) {
        await performSearch(query, user.id);
      }
      setLoading(false);
    };
    init();
  }, [query]);

  // 2. Fungsi Pencarian & Cek Status
  const performSearch = async (keyword: string, myId: string) => {
    // A. Cari User di Profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, image_url')
      .or(`name.ilike.%${keyword}%,email.ilike.%${keyword}%`)
      .neq('id', myId) // Jangan include diri sendiri
      .limit(20);

    if (!profiles || profiles.length === 0) {
      setResults([]);
      return;
    }

    // B. Cek Status Hubungan (Friend / Request)
    // Ambil semua teman saya
    const { data: myFriends } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', myId);
    
    // Ambil request yg SAYA KIRIM
    const { data: sentRequests } = await supabase
      .from('friend_requests')
      .select('receiver_id')
      .eq('sender_id', myId)
      .eq('status', 'pending');

    // Ambil request yg MASUK (ORANG LAIN KIRIM)
    const { data: receivedRequests } = await supabase
      .from('friend_requests')
      .select('sender_id')
      .eq('receiver_id', myId)
      .eq('status', 'pending');

    const friendIds = myFriends?.map(f => f.friend_id) || [];
    const sentIds = sentRequests?.map(r => r.receiver_id) || [];
    const receivedIds = receivedRequests?.map(r => r.sender_id) || [];

    // C. Gabungkan Data
    const formattedResults = profiles.map(profile => {
      let status = 'none'; // stranger
      if (friendIds.includes(profile.id)) status = 'friend';
      else if (sentIds.includes(profile.id)) status = 'sent';
      else if (receivedIds.includes(profile.id)) status = 'received';

      return { ...profile, status };
    });

    setResults(formattedResults);
  };

  // 3. Kirim Request (Connect)
  const sendRequest = async (targetId: string) => {
    if (!currentUser) return;
    
    // Optimistic Update (Biar UI cepet ganti status)
    setResults(prev => prev.map(u => u.id === targetId ? { ...u, status: 'sent' } : u));

    try {
      // Masuk ke tabel friend_requests
      const { error } = await supabase.from('friend_requests').insert({
        sender_id: currentUser.id,
        receiver_id: targetId
      });
      
      if (error) throw error;

      // Kirim Notifikasi ke Target
      await supabase.from('notifications').insert({
        user_id: targetId,
        sender_id: currentUser.id,
        message: 'Mengirim permintaan pertemanan.',
        is_read: false
      });

    } catch (err) {
      alert("Gagal mengirim request.");
      // Rollback status kalau gagal
      setResults(prev => prev.map(u => u.id === targetId ? { ...u, status: 'none' } : u));
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] pt-24 px-6 pb-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-black text-[#2D2924] mb-2">Hasil Pencarian</h1>
        <p className="text-[#877E71] mb-8">Menampilkan hasil untuk "<span className="font-bold text-amber-600">{query}</span>"</p>

        {loading ? (
          <p className="text-center mt-10 text-gray-400">Sedang mencari...</p>
        ) : results.length === 0 ? (
          <div className="text-center bg-white p-10 rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-500">Tidak ditemukan user dengan nama/email tersebut.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {results.map((person) => (
              <div key={person.id} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between transition-all hover:shadow-md">
                
                {/* Info User */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                     {person.image_url ? <img src={person.image_url} alt={person.name} /> : <UserIcon className="text-gray-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2D2924]">{person.name || 'Tanpa Nama'}</h3>
                    <p className="text-xs text-gray-500">{person.email}</p>
                    
                    {/* Badge Status */}
                    {person.status === 'friend' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">Mutualan</span>}
                    {person.status === 'sent' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block">Menunggu Konfirmasi</span>}
                  </div>
                </div>

                {/* Action Button */}
                <div>
                   {person.status === 'none' && (
                     <button onClick={() => sendRequest(person.id)} className="flex items-center gap-2 bg-[#2D2924] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-colors">
                       <UserPlus size={16} /> Connect
                     </button>
                   )}

                   {person.status === 'sent' && (
                     <button disabled className="flex items-center gap-2 bg-gray-100 text-gray-400 px-4 py-2 rounded-xl text-sm font-bold cursor-not-allowed">
                       <Clock size={16} /> Sent
                     </button>
                   )}

                   {person.status === 'friend' && (
                     <button disabled className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-bold border border-green-200">
                       <UserCheck size={16} /> Friends
                     </button>
                   )}

                   {person.status === 'received' && (
                     <a href="/friends" className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-200">
                       Cek Request
                     </a>
                   )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}