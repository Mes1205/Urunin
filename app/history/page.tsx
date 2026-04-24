"use client";

import React, { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Receipt, Search, Filter,
  Calendar, TrendingUp, TrendingDown,
  DollarSign, Clock,
  ChevronRight, ChevronDown, ChevronUp,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Design tokens (sama persis dengan HomePage) ───────────────────────────────
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
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
  red:      '#E05B5B',
};

type FilterType = 'all' | 'this_month' | 'last_month' | 'this_year';
type SortType   = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading]               = useState(true);
  const [user, setUser]                     = useState<SupabaseUser | null>(null);
  const [allHistory, setAllHistory]         = useState<any[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterType, setFilterType]         = useState<FilterType>('all');
  const [sortType, setSortType]             = useState<SortType>('date_desc');
  const [showFilters, setShowFilters]       = useState(false);

  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    thisMonth: 0,
    lastMonth: 0,
  });

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) await fetchHistory(authUser.id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHistory, searchQuery, filterType, sortType]);

  const fetchHistory = async (userId: string) => {
    try {
      const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setAllHistory(receipts || []);

      if (receipts) {
        const now = new Date();
        const thisMonth = receipts.filter(r => {
          const d = new Date(r.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const lastMonth = receipts.filter(r => {
          const d = new Date(r.created_at);
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        });

        setStats({
          totalTransactions: receipts.length,
          totalAmount:  receipts.reduce((s, r) => s + r.total_amount, 0),
          thisMonth:    thisMonth.reduce((s, r) => s + r.total_amount, 0),
          lastMonth:    lastMonth.reduce((s, r) => s + r.total_amount, 0),
        });
      }
    } catch (e) { console.error(e); }
  };

  const applyFiltersAndSort = () => {
    let f = [...allHistory];

    if (searchQuery) {
      f = f.filter(item =>
        (item.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.note || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const now = new Date();
    switch (filterType) {
      case 'this_month':
        f = f.filter(r => {
          const d = new Date(r.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        break;
      case 'last_month':
        f = f.filter(r => {
          const d = new Date(r.created_at);
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        });
        break;
      case 'this_year':
        f = f.filter(r => new Date(r.created_at).getFullYear() === now.getFullYear());
        break;
    }

    switch (sortType) {
      case 'date_desc':  f.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'date_asc':   f.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'amount_desc': f.sort((a, b) => b.total_amount - a.total_amount); break;
      case 'amount_asc':  f.sort((a, b) => a.total_amount - b.total_amount); break;
    }

    setFilteredHistory(f);
  };

  const groupByMonth = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      const d   = new Date(item.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const getMonthName = (key: string) => {
    const [year, month] = key.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const monthGroups = groupByMonth(filteredHistory);
  const hasActiveFilter = searchQuery || filterType !== 'all';

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.bg }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin mb-4"
        style={{ borderColor: C.border, borderTopColor: C.primary }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>Loading…</p>
    </div>
  );

  // ── Stats cards config ────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Transaksi',
      value: `${stats.totalTransactions}`,
      suffix: 'bills',
      Icon: Receipt,
      barColor: C.primary,
    },
    {
      label: 'Total Pengeluaran',
      value: `Rp ${(stats.totalAmount / 1000).toFixed(0)}k`,
      Icon: DollarSign,
      barColor: '#3D7FBB',
    },
    {
      label: 'Bulan Ini',
      value: `Rp ${(stats.thisMonth / 1000).toFixed(0)}k`,
      Icon: TrendingUp,
      barColor: C.green,
    },
    {
      label: 'Bulan Lalu',
      value: `Rp ${(stats.lastMonth / 1000).toFixed(0)}k`,
      Icon: TrendingDown,
      barColor: C.textMid,
    },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: C.bg, fontFamily: SF, color: C.text }}>
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-16 pt-8">

        {/* ── Back ──────────────────────────────────────────────────────────────── */}
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
            Semua split bill & pengeluaran kamu
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: 700, fontSize: '28px', color: C.text, letterSpacing: '-0.3px' }}>
            Riwayat Transaksi 📜
          </h1>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map(({ label, value, suffix, Icon, barColor }) => (
            <div
              key={label}
              className="rounded-2xl p-5 border flex flex-col"
              style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}
            >
              {/* colored accent bar — same pattern as Piutang / Hutang cards on home */}
              <div className="w-8 h-1.5 rounded-full mb-4" style={{ background: barColor }} />
              <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '12px', color: C.textLt, marginBottom: '4px' }}>
                {label}
              </p>
              <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '20px', color: C.text, marginTop: 'auto' }}>
                {value}
                {suffix && (
                  <span style={{ fontFamily: SFText, fontWeight: 500, fontSize: '13px', color: C.textLt, marginLeft: '4px' }}>
                    {suffix}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* ── Search & Filter ──────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 border mb-5"
          style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}
        >
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.textLt }} />
              <input
                type="text"
                placeholder="Cari nama toko atau catatan…"
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
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                >
                  <X size={14} style={{ color: C.textLt }} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{
                background: showFilters ? C.primary : C.accent,
                color: showFilters ? 'white' : C.textMid,
                fontFamily: SF,
                fontWeight: 600,
                fontSize: '14px',
                border: `1.5px solid ${showFilters ? C.primary : C.border}`,
              }}
            >
              <Filter size={15} />
              Filter
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Filter options */}
          {showFilters && (
            <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <div>
                <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Periode
                </p>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as FilterType)}
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{
                    fontFamily: SFText,
                    fontWeight: 600,
                    fontSize: '13px',
                    color: C.text,
                    background: C.accent,
                    border: `1.5px solid ${C.border}`,
                  }}
                >
                  <option value="all">Semua</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="last_month">Bulan Lalu</option>
                  <option value="this_year">Tahun Ini</option>
                </select>
              </div>

              <div>
                <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Urutkan
                </p>
                <select
                  value={sortType}
                  onChange={e => setSortType(e.target.value as SortType)}
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{
                    fontFamily: SFText,
                    fontWeight: 600,
                    fontSize: '13px',
                    color: C.text,
                    background: C.accent,
                    border: `1.5px solid ${C.border}`,
                  }}
                >
                  <option value="date_desc">Terbaru</option>
                  <option value="date_asc">Terlama</option>
                  <option value="amount_desc">Termahal</option>
                  <option value="amount_asc">Termurah</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── History List ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {Object.keys(monthGroups).length > 0 ? (
            Object.entries(monthGroups)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([monthKey, items]) => (
                <div
                  key={monthKey}
                  className="rounded-2xl border p-6"
                  style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}
                >
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl" style={{ background: C.accent }}>
                      <Calendar size={16} style={{ color: C.primary }} />
                    </div>
                    <div className="flex-1">
                      <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '16px', color: C.text }}>
                        {getMonthName(monthKey)}
                      </p>
                      <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                        {items.length} transaksi &nbsp;·&nbsp; Rp {items.reduce((s, i) => s + i.total_amount, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Transaction rows */}
                  <div className="space-y-2">
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => router.push('/receipt/' + item.id)}
                        className="flex items-center justify-between px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-200 hover:border-[#D0CCEC] hover:bg-[#FAFAFE] group"
                        style={{ borderColor: C.border }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* accent dot — same as activity list on home */}
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: C.primary }} />
                          <div className="flex-1 min-w-0">
                            <p className="truncate"
                              style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>
                              {item.store_name || 'Restoran Tanpa Nama'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock size={11} style={{ color: C.textLt }} />
                              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>
                                {new Date(item.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                                {'  '}
                                {new Date(item.created_at).toLocaleTimeString('id-ID', {
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <div className="text-right">
                            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '14px', color: C.primary }}>
                              Rp {item.total_amount.toLocaleString()}
                            </p>
                            {item.note && (
                              <p className="truncate max-w-[140px]"
                                style={{ fontFamily: SFText, fontWeight: 400, fontSize: '11px', color: C.textLt }}>
                                {item.note}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={15} className="group-hover:opacity-100 opacity-30 transition-opacity"
                            style={{ color: C.primary }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          ) : (
            /* Empty state */
            <div
              className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3"
              style={{ borderColor: C.border, background: C.card }}
            >
              <Receipt size={40} style={{ color: C.border }} />
              <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '15px', color: C.textMid }}>
                {hasActiveFilter ? 'Tidak Ada Hasil' : 'Belum Ada Transaksi'}
              </p>
              <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
                {hasActiveFilter
                  ? 'Coba ubah filter atau kata kunci pencarian'
                  : 'Scan bill pertama kamu untuk mulai tracking!'}
              </p>
              {hasActiveFilter && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                  className="mt-1 px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '13px' }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}