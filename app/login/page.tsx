"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User as UserIcon, ScanLine } from 'lucide-react';

// ── Design tokens (sama dengan HomePage) ──────────────────────────────────────
const SF     = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const SFText = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const C = {
  bg:       '#ffffff',
  card:     '#FFFFFF',
  border:   '#E8E6F0',
  shadow:   '0 2px 10px rgba(107,99,148,0.08)',
  shadowHv: '0 6px 24px rgba(107,99,168,0.16)',
  primary:  '#6B63A8',
  accent:   '#F0EEF8',
  text:     '#2E2C3A',
  textMid:  '#6B6880',
  textLt:   '#A8A5B8',
};

export default function AuthPage() {
  const [isSignUp, setIsSignUp]   = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [loading, setLoading]     = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        alert('Cek email kamu untuk verifikasi!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: C.bg, fontFamily: SF }}
    >
      <div className="w-full max-w-md">

        {/* ── Card ───────────────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-8 md:p-10 border"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadowHv }}
        >

          {/* ── Logo ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
              style={{ background: C.primary, boxShadow: `0 4px 16px rgba(107,99,168,0.32)` }}
            >
              <ScanLine size={26} className="text-white" />
            </div>

            {/* Wordmark — same style as HomePage welcome */}
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt, marginBottom: '2px' }}>
              Welcome to{' '}
              <span style={{ fontWeight: 600, color: C.textMid }}>U</span>
              <span style={{ fontWeight: 700, color: C.primary }}>R</span>
              <span style={{ fontWeight: 600, color: C.textMid }}>U</span>
              <span style={{ fontWeight: 700, color: C.primary }}>N</span>
              <span style={{ fontWeight: 600, color: C.textMid }}>I</span>
              <span style={{ fontWeight: 700, color: C.primary }}>N</span>
            </p>

            <h1 style={{ fontFamily: SF, fontWeight: 700, fontSize: '24px', color: C.text, marginTop: '2px' }}>
              {isSignUp ? 'Buat Akun Baru' : 'Selamat Datang!'}
            </h1>
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textMid, marginTop: '4px', textAlign: 'center' }}>
              {isSignUp
                ? 'Mulai bagi bill dengan adil dan cepat.'
                : 'Masuk untuk mengelola hutang piutangmu.'}
            </p>
          </div>

          {/* ── Form ─────────────────────────────────────────────────────────── */}
          <form onSubmit={handleAuth} className="space-y-3">

            {isSignUp && (
              <div className="relative">
                <UserIcon
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: C.textLt }}
                />
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all"
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
            )}

            <div className="relative">
              <Mail
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: C.textLt }}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all"
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

            <div className="relative">
              <Lock
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: C.textLt }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-1"
              style={{
                background: C.primary,
                color: 'white',
                fontFamily: SF,
                fontWeight: 600,
                fontSize: '15px',
                boxShadow: `0 4px 14px rgba(107,99,168,0.32)`,
              }}
            >
              {loading ? 'Memproses…' : isSignUp ? 'Daftar Sekarang' : 'Masuk →'}
            </button>
          </form>

          {/* ── Toggle ───────────────────────────────────────────────────────── */}
          <div className="mt-6 text-center">
            <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textMid }}>
              {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="hover:opacity-70 transition-opacity"
                style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: C.primary }}
              >
                {isSignUp ? 'Masuk di sini' : 'Daftar gratis'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}