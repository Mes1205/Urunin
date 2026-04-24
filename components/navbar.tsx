"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const navLinks = [
    { label: 'Home',         href: '/' },
    { label: 'Piutang',      href: '/piutang' },
    { label: 'Hutang',       href: '/hutang' },
    { label: 'Notification', href: '/notifications' },
    { label: 'History',      href: '/history' },
    { label: 'Add Friends',  href: '/friends' },
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Martha';

  // Warna teks & ikon menyesuaikan halaman
  const textColor   = isHome ? 'white'   : '#1a1a2e';
  const iconColor   = isHome ? 'white'   : '#1a1a2e';
  const logoColor   = isHome ? 'white'   : '#1a1a2e';
  const pillBg      = isHome ? '#00014b' : 'rgba(107,99,168,0.15)';
  const pillText    = isHome ? 'white'   : '#3c3476';

  return (
    <>
      <nav className="fixed top-[12px] left-0 right-0 z-50 flex justify-center px-4">
        <div className="relative w-full max-w-[1412px] h-[53px]">

          {/* Glass Background */}
          <div
            className="absolute inset-0 rounded-[29px] border border-white/40"
            style={{
              background: isHome
                ? 'rgba(176, 176, 199, 0.52)'
                : 'rgba(255, 255, 255, 0.80)',
              backdropFilter: 'blur(7px) saturate(200%)',
              WebkitBackdropFilter: 'blur(7px) saturate(200%)',
              boxShadow: isHome
                ? `0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(255,255,255,0.2)`
                : `0 4px 20px rgba(107,99,168,0.10), inset 0 1px 0 rgba(255,255,255,0.8)`,
            }}
          />

          {/* Logo */}
          <div
            className="absolute left-[40px] top-1/2 -translate-y-1/2 cursor-pointer select-none transition-colors duration-300"
            onClick={() => router.push('/')}
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
              fontWeight: 900,
              fontSize: '22px',
              color: logoColor,
              letterSpacing: '-0.5px',
            }}
          >
            Urunin
          </div>

          {/* Navigation Links */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-[52px]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <p
                  key={link.href}
                  className="whitespace-nowrap cursor-pointer select-none transition-all duration-200"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '15px',
                    lineHeight: 'normal',
                    color: textColor,
                    opacity: isActive ? 1 : 0.55,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.opacity = '0.55'; }}
                  onClick={() => router.push(link.href)}
                >
                  {link.label}
                </p>
              );
            })}
          </div>

          {/* Profile Icon */}
          <div
            className="absolute right-[120px] top-1/2 -translate-y-1/2 cursor-pointer transition-opacity duration-300 hover:opacity-70"
            onClick={() => router.push('/profile')}
          >
            <User size={22} strokeWidth={1.8} color={iconColor} opacity={0.8} />
          </div>

          {/* User Name Pill */}
          <div
            className="absolute right-[10px] top-1/2 -translate-y-1/2 h-[26px] w-[100px] rounded-[26px] flex items-center justify-center cursor-pointer transition-all duration-300"
            style={{ background: pillBg }}
            onClick={() => router.push('/profile')}
          >
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                color: pillText,
              }}
            >
              {firstName}
            </p>
          </div>
        </div>
      </nav>

      {pathname !== '/' && <div className="h-[77px]" />}
    </>
  );
}