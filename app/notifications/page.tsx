"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Receipt, UserCheck, CheckCheck, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Design tokens (sama dengan HomePage) ──────────────────────────────────────
const SF     = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const SFText = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const C = {
  bg:      '#ffffff',
  card:    '#FFFFFF',
  border:  '#E8E6F0',
  shadow:  '0 2px 10px rgba(107,99,148,0.08)',
  primary: '#6B63A8',
  accent:  '#F0EEF8',
  text:    '#2E2C3A',
  textMid: '#6B6880',
  textLt:  '#A8A5B8',
  green:   '#3DAA72',
  red:     '#E05B5B',
};

// Icon badge color per type
const TYPE_COLORS: Record<string, string> = {
  confirm: '#3D7FBB',
  receipt: '#E8903A',
  friend:  C.green,
  default: C.textLt,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('notifications')
        .select(`id, message, created_at, is_read, receipt_id, sender:sender_id (id, name, email)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setNotifications(data);
      setLoading(false);
    };
    fetchNotifs();
  }, []);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getType = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('konfirmasi') || m.includes('meminta')) return 'confirm';
    if (m.includes('tagihan')    || m.includes('split'))   return 'receipt';
    if (m.includes('teman')      || m.includes('menerima')) return 'friend';
    return 'default';
  };

  const getIcon = (type: string) => {
    const color = TYPE_COLORS[type];
    if (type === 'confirm') return <CheckCheck size={17} style={{ color }} />;
    if (type === 'receipt') return <Receipt    size={17} style={{ color }} />;
    if (type === 'friend')  return <UserCheck  size={17} style={{ color }} />;
    return                         <Bell       size={17} style={{ color }} />;
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.receipt_id)   router.push(`/receipt/${notif.receipt_id}`);
    else if (notif.sender?.id) router.push(`/profile/${notif.sender.id}`);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin mb-4"
        style={{ borderColor: C.border, borderTopColor: C.primary }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>Memuat notifikasi…</p>
    </div>
  );

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
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '15px', color: C.textLt, marginBottom: '2px' }}>
              Update terbaru buat kamu
            </p>
            <div className="flex items-center gap-3">
              <h1 style={{ fontFamily: SF, fontWeight: 700, fontSize: '28px', color: C.text, letterSpacing: '-0.3px' }}>
                Notifikasi
              </h1>
              {unreadCount > 0 && (
                <div
                  className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full"
                  style={{ background: C.red, fontFamily: SF, fontWeight: 700, fontSize: '12px', color: 'white' }}
                >
                  {unreadCount}
                </div>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              style={{ fontFamily: SFText, fontWeight: 600, fontSize: '13px', color: C.primary }}
            >
              <CheckCheck size={15} />
              Tandai semua dibaca
            </button>
          )}
        </div>

        {/* ── Content ──────────────────────────────────────────────────────────── */}
        {notifications.length === 0 ? (
          /* Empty state */
          <div
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3"
            style={{ borderColor: C.border, background: C.card }}
          >
            <Bell size={40} style={{ color: C.border }} />
            <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '15px', color: C.textMid }}>
              Belum ada notifikasi
            </p>
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
              Kamu akan melihat update di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => {
              const type  = getType(notif.message);
              const color = TYPE_COLORS[type];
              const isNew = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="flex items-start gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:border-[#D0CCEC] hover:bg-[#FAFAFE] group"
                  style={{
                    background: isNew ? C.accent : C.card,
                    borderColor: isNew ? C.border : C.border,
                    boxShadow: C.shadow,
                  }}
                >
                  {/* Icon badge */}
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 mt-0.5"
                    style={{ background: isNew ? 'white' : C.accent, border: `1.5px solid ${C.border}` }}
                  >
                    {getIcon(type)}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="leading-snug"
                      style={{
                        fontFamily: SFText,
                        fontWeight: isNew ? 600 : 400,
                        fontSize: '14px',
                        color: isNew ? C.text : C.textMid,
                      }}
                    >
                      {notif.message}
                    </p>
                    <p
                      className="mt-1"
                      style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}
                    >
                      {new Date(notif.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                      {notif.sender && (
                        <span>
                          &nbsp;·&nbsp;dari{' '}
                          <span style={{ color: C.primary, fontWeight: 500 }}>
                            {notif.sender.name || notif.sender.email}
                          </span>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {isNew && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-2"
                      style={{ background: C.red }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}