"use client";

import React, { useState, useRef, useEffect } from 'react';
import { processReceipt } from './ocr/action';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  Trash2, Receipt,
  ArrowDownLeft,
  Camera, ChevronRight,
  Percent, BadgePercent, RefreshCw,
  Users, Award, Bell,
  ArrowLeft,
  Upload, PenLine,
  ShoppingBag, Coffee, Car, Utensils, Zap, Smartphone, Gift,
  Plus, Store
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  ReceiptData,
  OffsetOption,
  SplitSessionData
} from '@/lib/types';
import { useModal } from '@/components/Modal';

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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  coffee: Coffee,
  utilities: Zap,
  phone: Smartphone,
  gift: Gift,
};

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6B6B',
  transport: '#4ECDC4',
  shopping: '#95E1D3',
  coffee: '#F38181',
  utilities: '#FFA726',
  phone: '#7E57C2',
  gift: '#AB47BC',
};

// ── Native SVG Area Chart ─────────────────────────────────────────────────────
function ExpenseChart({ weeklySpending }: { weeklySpending: number[] }) {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; day: string } | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const VW = 340, VH = 150;
  const padL = 36, padR = 10, padT = 14, padB = 28;
  const chartW = VW - padL - padR;
  const chartH = VH - padT - padB;

  const max = Math.max(...weeklySpending, 1);
  const pts = weeklySpending.map((v, i) => ({
    x: padL + (i / (days.length - 1)) * chartW,
    y: padT + chartH - (v / max) * chartH,
    value: v,
    day: days[i],
  }));

  const polylineStr = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath =
    `M ${pts[0].x},${pts[0].y} ` +
    pts.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x},${padT + chartH} L ${pts[0].x},${padT + chartH} Z`;

  const yTicks = [0, 0.5, 1].map(frac => ({
    value: frac * max,
    y: padT + chartH - frac * chartH,
  }));

  return (
    <div className="rounded-[32px] p-6 border"
      style={{ background: C.card, borderColor: C.border, boxShadow: '0 0 24px rgba(0,0,0,0.10)' }}>
      <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '23px', color: '#575757', marginBottom: '12px' }}>
        This week expenses
      </p>
      <div className="flex gap-2 mb-5">
        {(['week', 'month', 'all'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="px-3 py-1 rounded-full text-xs transition-all"
            style={{
              background: period === p ? '#3c3476' : '#f3f4f6',
              color: period === p ? 'white' : '#6b7280',
              fontFamily: SFText, fontWeight: 600,
            }}>
            {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All Time'}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height={VH} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8884d8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#8884d8" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={t.y} x2={VW - padR} y2={t.y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={padL - 4} y={t.y + 4} textAnchor="end"
              style={{ fontSize: '10px', fill: '#bbb', fontFamily: SFText }}>
              {t.value >= 1000 ? `${Math.round(t.value / 1000)}k` : '0'}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="url(#areaG)" />
        <polyline points={polylineStr} fill="none" stroke="#8884d8"
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={VH - 4} textAnchor="middle"
            style={{ fontSize: '11px', fill: '#bbb', fontFamily: SFText }}>
            {days[i]}
          </text>
        ))}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#8884d8" stroke="white" strokeWidth="1.5" />
            <rect x={p.x - 18} y={padT} width={36} height={chartH}
              fill="transparent"
              onMouseEnter={() => setTooltip(p)}
              onMouseLeave={() => setTooltip(null)}
            />
          </g>
        ))}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 40} y={tooltip.y - 38} width={80} height={24} rx="6" fill="#2E2C3A" />
            <text x={tooltip.x} y={tooltip.y - 21} textAnchor="middle"
              style={{ fontSize: '10px', fill: 'white', fontFamily: SFText, fontWeight: 600 }}>
              Rp {(tooltip.value / 1000).toFixed(0)}k
            </text>
            <polygon
              points={`${tooltip.x - 5},${tooltip.y - 14} ${tooltip.x + 5},${tooltip.y - 14} ${tooltip.x},${tooltip.y - 7}`}
              fill="#2E2C3A" />
          </g>
        )}
      </svg>
      <div className="flex justify-between pt-3 border-t mt-1" style={{ borderColor: C.border }}>
        <span style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>Total minggu ini</span>
        <span style={{ fontFamily: SF, fontWeight: 700, fontSize: '14px', color: C.primary }}>
          Rp {weeklySpending.reduce((a, b) => a + b, 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ── Activity Row ──────────────────────────────────────────────────────────────
function ActivityRow({ item, onClick }: { item: any; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const category = item.category || 'shopping';
  const Icon = CATEGORY_ICONS[category] || Receipt;
  const color = CATEGORY_COLORS[category] || C.primary;

  return (
    <div
      className="cursor-pointer transition-all duration-200"
      style={{ transform: hovered ? 'scale(1.012)' : 'scale(1)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="rounded-[23px] px-5 py-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{
          background: C.card, borderColor: C.border, minHeight: '82px',
          boxShadow: hovered ? '0 0 32px rgba(0,0,0,0.16)' : '0 0 24px rgba(0,0,0,0.09)',
        }}>
        <div className="rounded-full p-2 flex items-center justify-center shrink-0"
          style={{ background: color + '22' }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '18px', color: '#575757' }}>
            Rp {item.total_amount?.toLocaleString('id-ID') || '0'}
          </p>
          <p className="truncate" style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: '#575757', opacity: 0.6 }}>
            {item.store_name || 'Transaksi'}
          </p>
        </div>
        <p className="sm:ml-3"
          style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: '#575757', opacity: 0.6, whiteSpace: 'nowrap' }}>
          {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          {'   '}
          {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ── Manual Input Page ─────────────────────────────────────────────────────────
function ManualInputPage({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (receipt: ReceiptData) => void;
}) {
  const [storeName, setStoreName] = useState('');
  const [items, setItems] = useState([{ name: '', price: 0, qty: 1 }]);
  const [taxInput, setTaxInput] = useState(0);
  const [serviceInput, setServiceInput] = useState(0);
  const [discountInput, setDiscountInput] = useState(0);
  const [taxMode, setTaxMode] = useState<'nominal' | 'percent'>('nominal');
  const [serviceMode, setServiceMode] = useState<'nominal' | 'percent'>('nominal');
  const [discountMode, setDiscountMode] = useState<'nominal' | 'percent'>('nominal');
  const [focusedItem, setFocusedItem] = useState<number | null>(null);

  const addItem = () => setItems(prev => [...prev, { name: '', price: 0, qty: 1 }]);

  const removeItem = (idx: number) =>
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: 'name' | 'price' | 'qty', value: string | number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const subtotal = items.reduce((a, it) => a + (it.price || 0) * (it.qty || 1), 0);
  const toNominal = (value: number, mode: 'nominal' | 'percent', base: number) =>
    mode === 'percent' ? Math.round((base * value) / 100) : value;

  const tax = toNominal(taxInput, taxMode, subtotal);
  const serviceCharge = toNominal(serviceInput, serviceMode, subtotal);
  const discount = toNominal(discountInput, discountMode, subtotal);
  const total = subtotal + tax + serviceCharge - discount;

const handleNext = () => {
  const validItems = items.filter(it => it.name.trim() || it.price > 0);
  if (validItems.length === 0) return;

  // Hitung subtotal dan totalAmount secara eksplisit
  const calculatedSubtotal = items.reduce((a, it) => a + (it.price || 0) * (it.qty || 1), 0);
  const calculatedTax = toNominal(taxInput, taxMode, calculatedSubtotal);
  const calculatedServiceCharge = toNominal(serviceInput, serviceMode, calculatedSubtotal);
  const calculatedDiscount = toNominal(discountInput, discountMode, calculatedSubtotal);
  const calculatedTotal = calculatedSubtotal + calculatedTax + calculatedServiceCharge - calculatedDiscount;

  const receipt: ReceiptData = {
    id: crypto.randomUUID(), // Atau biarkan kosong/generate temp ID
    store_name: storeName || 'Manual Input',
    items: validItems.map(it => ({ name: it.name || 'Item', price: it.price, qty: it.qty })),
    subtotal: calculatedSubtotal, // Tambahkan ini
    tax: calculatedTax,
    serviceCharge: calculatedServiceCharge,
    discount: calculatedDiscount,
    totalAmount: calculatedTotal, // Tambahkan ini (karena diminta di ReceiptData)
  };

  onNext(receipt);
};

  const canProceed = items.some(it => it.name.trim() && it.price > 0);

  return (
    <div className="min-h-screen pb-28 pt-16 sm:pt-20" style={{ background: C.bg, fontFamily: SF }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Header */}
        <button onClick={onBack}
          className="mb-8 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>
          <ArrowLeft size={15} /> Kembali
        </button>

        <div className="mb-8">
          <h1 style={{ fontFamily: SF, fontWeight: 700, fontSize: '28px', color: C.text, letterSpacing: '-0.3px' }}>
            Input Manual 
          </h1>
          <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '14px', color: C.textLt, marginTop: '4px' }}>
            Isi item-item yang mau di-split bareng
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div>
            {/* Store Name */}
            <div className="mb-6 rounded-2xl p-5 border" style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
              <label className="flex items-center gap-2 mb-3"
                style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Store size={11} /> Nama Tempat / Toko
              </label>
              <input
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="cth: Warteg Bu Sari, KFC, dll..."
                className="w-full outline-none bg-transparent"
                style={{
                  fontFamily: SF, fontWeight: 600, fontSize: '17px', color: C.text,
                  caretColor: C.primary,
                }}
              />
            </div>

            {/* Items */}
            <div className="mb-5 rounded-2xl border overflow-hidden" style={{ borderColor: C.border, boxShadow: C.shadow }}>
              {/* Column header */}
              <div className="hidden sm:flex items-center gap-2 px-5 py-3 border-b"
                style={{ background: C.accent, borderColor: C.border }}>
                <p className="flex-1" style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nama Item</p>
                <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.08em', width: '52px', textAlign: 'center' }}>Qty</p>
                <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.08em', width: '110px', textAlign: 'right' }}>Harga (Rp)</p>
                <div style={{ width: '28px' }} />
              </div>

              {/* Item rows */}
              <div style={{ background: C.card }}>
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 px-4 sm:px-5 py-3 sm:py-0 border-b transition-all duration-150"
                    style={{
                      borderColor: C.border,
                      background: focusedItem === i ? C.accent : 'transparent',
                      minHeight: '60px',
                    }}
                    onFocus={() => setFocusedItem(i)}
                    onBlur={() => setFocusedItem(null)}
                  >
                    {/* Name */}
                    <input
                      value={item.name}
                      onChange={e => updateItem(i, 'name', e.target.value)}
                      placeholder={`cth: Nasi goreng, Es teh...`}
                      className="flex-1 outline-none bg-transparent"
                      style={{
                        fontFamily: SFText, fontWeight: 500, fontSize: '14px',
                        color: item.name ? C.text : C.textLt,
                        caretColor: C.primary,
                        paddingTop: '8px', paddingBottom: '8px',
                      }}
                    />

                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
                      {/* Qty */}
                      <div className="flex items-center gap-1" style={{ width: '52px' }}>
                        <button
                          onClick={() => updateItem(i, 'qty', Math.max(1, (item.qty || 1) - 1))}
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
                          style={{ color: C.textLt, fontSize: '16px', lineHeight: 1 }}>−</button>
                        <span style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text, minWidth: '14px', textAlign: 'center' }}>
                          {item.qty || 1}
                        </span>
                        <button
                          onClick={() => updateItem(i, 'qty', (item.qty || 1) + 1)}
                          className="w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
                          style={{ color: C.textLt, fontSize: '16px', lineHeight: 1 }}>+</button>
                      </div>

                      {/* Price */}
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={e => updateItem(i, 'price', +e.target.value)}
                        placeholder="15000"
                        className="flex-1 sm:flex-none outline-none bg-transparent text-right"
                        style={{
                          fontFamily: SF, fontWeight: 600, fontSize: '14px',
                          color: item.price ? C.primary : C.textLt,
                          caretColor: C.primary,
                          width: '110px',
                          maxWidth: '150px',
                        }}
                      />

                      {/* Delete */}
                      <button
                        onClick={() => removeItem(i)}
                        className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: items.length === 1 ? C.border : '#ccc' }}
                        disabled={items.length === 1}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add item row */}
                <button
                  onClick={addItem}
                  className="w-full flex items-center gap-2 px-5 py-4 hover:bg-[#F0EEF8] transition-colors"
                  style={{ color: C.primary }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: C.primary }}>
                    <Plus size={11} />
                  </div>
                  <span style={{ fontFamily: SFText, fontWeight: 600, fontSize: '13px' }}>Tambah item</span>
                </button>
              </div>
            </div>

            {/* Extra costs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2 lg:mb-0 p-4 rounded-2xl border"
              style={{ background: C.accent, borderColor: C.border }}>
              <div>
                <label className="flex items-center gap-1 uppercase mb-1.5"
                  style={{ fontFamily: SFText, fontWeight: 600, fontSize: '10px', color: C.textLt }}>
                  <Percent size={9} /> Tax
                </label>
                <div className="flex items-center gap-1 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setTaxMode('nominal')}
                    className="px-2 py-1 rounded-md text-[11px]"
                    style={{ background: taxMode === 'nominal' ? C.primary : '#ffffff', color: taxMode === 'nominal' ? 'white' : C.textMid }}>
                    Rp
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode('percent')}
                    className="px-2 py-1 rounded-md text-[11px]"
                    style={{ background: taxMode === 'percent' ? C.primary : '#ffffff', color: taxMode === 'percent' ? 'white' : C.textMid }}>
                    %
                  </button>
                </div>
                <input
                  type="number"
                  value={taxInput || ''}
                  onChange={e => setTaxInput(+e.target.value)}
                  placeholder={taxMode === 'percent' ? '0 (%)' : '0'}
                  className="w-full p-2.5 bg-white rounded-xl border-none outline-none"
                  style={{
                    fontFamily: SFText, fontWeight: 600, fontSize: '14px',
                    color: C.text,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                />
                {taxMode === 'percent' && (
                  <p style={{ fontFamily: SFText, fontSize: '11px', color: C.textLt, marginTop: '4px' }}>≈ Rp {tax.toLocaleString()}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 uppercase mb-1.5"
                  style={{ fontFamily: SFText, fontWeight: 600, fontSize: '10px', color: C.textLt }}>
                  <BadgePercent size={9} /> Service
                </label>
                <div className="flex items-center gap-1 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setServiceMode('nominal')}
                    className="px-2 py-1 rounded-md text-[11px]"
                    style={{ background: serviceMode === 'nominal' ? C.primary : '#ffffff', color: serviceMode === 'nominal' ? 'white' : C.textMid }}>
                    Rp
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceMode('percent')}
                    className="px-2 py-1 rounded-md text-[11px]"
                    style={{ background: serviceMode === 'percent' ? C.primary : '#ffffff', color: serviceMode === 'percent' ? 'white' : C.textMid }}>
                    %
                  </button>
                </div>
                <input
                  type="number"
                  value={serviceInput || ''}
                  onChange={e => setServiceInput(+e.target.value)}
                  placeholder={serviceMode === 'percent' ? '0 (%)' : '0'}
                  className="w-full p-2.5 bg-white rounded-xl border-none outline-none"
                  style={{
                    fontFamily: SFText, fontWeight: 600, fontSize: '14px',
                    color: C.text,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                />
                {serviceMode === 'percent' && (
                  <p style={{ fontFamily: SFText, fontSize: '11px', color: C.textLt, marginTop: '4px' }}>≈ Rp {serviceCharge.toLocaleString()}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1 uppercase mb-1.5"
                  style={{ fontFamily: SFText, fontWeight: 600, fontSize: '10px', color: C.textLt }}>
                  <ArrowDownLeft size={9} /> Diskon
                </label>
                <div className="flex items-center gap-1 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setDiscountMode('nominal')}
                    className="px-2 py-1 rounded-md text-[11px]"
                    style={{ background: discountMode === 'nominal' ? C.primary : '#ffffff', color: discountMode === 'nominal' ? 'white' : C.textMid }}>
                    Rp
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode('percent')}
                    className="px-2 py-1 rounded-md text-[11px]"
                    style={{ background: discountMode === 'percent' ? C.primary : '#ffffff', color: discountMode === 'percent' ? 'white' : C.textMid }}>
                    %
                  </button>
                </div>
                <input
                  type="number"
                  value={discountInput || ''}
                  onChange={e => setDiscountInput(+e.target.value)}
                  placeholder={discountMode === 'percent' ? '0 (%)' : '0'}
                  className="w-full p-2.5 bg-white rounded-xl border-none outline-none"
                  style={{
                    fontFamily: SFText, fontWeight: 600, fontSize: '14px',
                    color: C.green,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                />
                {discountMode === 'percent' && (
                  <p style={{ fontFamily: SFText, fontSize: '11px', color: C.textLt, marginTop: '4px' }}>≈ Rp {discount.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Total + CTA */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl p-5 border" style={{ background: C.card, borderColor: C.border, boxShadow: C.shadowHv }}>
          {/* Breakdown */}
          <div className="space-y-2 mb-4 pb-4 border-b" style={{ borderColor: C.border }}>
            <div className="flex justify-between">
              <span style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>Subtotal ({items.reduce((a, it) => a + (it.qty || 1), 0)} item)</span>
              <span style={{ fontFamily: SFText, fontWeight: 600, fontSize: '13px', color: C.textMid }}>Rp {subtotal.toLocaleString()}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
                  Tax {taxMode === 'percent' ? `(${taxInput}%)` : ''}
                </span>
                <span style={{ fontFamily: SFText, fontWeight: 600, fontSize: '13px', color: C.textMid }}>+Rp {tax.toLocaleString()}</span>
              </div>
            )}
            {serviceCharge > 0 && (
              <div className="flex justify-between">
                <span style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
                  Service {serviceMode === 'percent' ? `(${serviceInput}%)` : ''}
                </span>
                <span style={{ fontFamily: SFText, fontWeight: 600, fontSize: '13px', color: C.textMid }}>+Rp {serviceCharge.toLocaleString()}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between">
                <span style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>
                  Diskon {discountMode === 'percent' ? `(${discountInput}%)` : ''}
                </span>
                <span style={{ fontFamily: SFText, fontWeight: 600, fontSize: '13px', color: C.green }}>-Rp {discount.toLocaleString()}</span>
              </div>
            )}
          </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Total Bill</p>
                  <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '28px', color: C.text }}>
                    Rp {total.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="w-full px-7 py-3.5 rounded-xl transition-all"
                  style={{
                    background: canProceed ? C.primary : C.border,
                    color: canProceed ? 'white' : C.textLt,
                    fontFamily: SF, fontWeight: 600, fontSize: '14px',
                    boxShadow: canProceed ? `0 4px 14px rgba(107,99,168,0.32)` : 'none',
                    cursor: canProceed ? 'pointer' : 'not-allowed',
                    opacity: canProceed ? 1 : 0.6,
                    transition: 'all 0.2s',
                  }}>
                  Lanjut Bagi →
                </button>
              </div>
              {!canProceed && (
                <p className="mt-2 text-center" style={{ fontFamily: SFText, fontSize: '12px', color: C.textLt }}>
                  Isi minimal 1 item 
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const router = useRouter();
  const { success, error, confirm } = useModal();

  const [loading, setLoading]               = useState(true);
  const [user, setUser]                     = useState<SupabaseUser | null>(null);
  const [step, setStep]                     = useState<'dashboard' | 'edit' | 'manual'>('dashboard');
  const [history, setHistory]               = useState<any[]>([]);
  const [stats, setStats]                   = useState({ piutang: 0, hutang: 0 });
  const [offsetSuggestions, setOffsetSuggestions] = useState<OffsetOption[]>([]);
  const [topFriends, setTopFriends]         = useState<any[]>([]);
  const [weeklySpending, setWeeklySpending] = useState<number[]>(new Array(7).fill(0));
  const [notifications, setNotifications]   = useState<any[]>([]);
  const [receipt, setReceipt]               = useState<ReceiptData | null>(null);
  const [preview, setPreview]               = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'food' | 'transport' | 'shopping'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) await fetchDashboardData(authUser.id);
      setLoading(false);
    })();
  }, []);

  const fetchDashboardData = async (userId: string) => {
    try {
      const { data: allDebts } = await supabase
        .from('debts')
        .select('*, debtor:profiles!debtor_id(name, image_url), lender:profiles!lender_id(name, image_url)')
        .or('lender_id.eq.' + userId + ',debtor_id.eq.' + userId)
        .eq('is_paid', false);

      if (allDebts) {
        let piutangTotal = 0, hutangTotal = 0;
        const bm: Record<string, { name: string; image: string; credit: number; debt: number }> = {};
        allDebts.forEach(d => {
          if (d.lender_id === userId) {
            piutangTotal += d.amount;
            if (d.debtor_id) {
              bm[d.debtor_id] = bm[d.debtor_id] || { name: d.debtor?.name || 'Teman', image: d.debtor?.image_url || '', credit: 0, debt: 0 };
              bm[d.debtor_id].credit += d.amount;
            }
          } else {
            hutangTotal += d.amount;
            if (d.lender_id) {
              bm[d.lender_id] = bm[d.lender_id] || { name: d.lender?.name || 'Teman', image: d.lender?.image_url || '', credit: 0, debt: 0 };
              bm[d.lender_id].debt += d.amount;
            }
          }
        });
        setStats({ piutang: piutangTotal, hutang: hutangTotal });
        setOffsetSuggestions(
          Object.entries(bm)
            .filter(([, v]) => v.credit > 0 && v.debt > 0)
            .map(([id, v]) => ({ friendId: id, friendName: v.name, friendImage: v.image, amountTheyOwe: v.credit, amountYouOwe: v.debt }))
        );
      }

      const { data: receipts } = await supabase
        .from('receipts').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(10);
      setHistory(receipts || []);

      const ago7 = new Date(); ago7.setDate(ago7.getDate() - 7);
      const { data: wk } = await supabase
        .from('receipts').select('total_amount, created_at')
        .eq('user_id', userId).gte('created_at', ago7.toISOString());
      const daily = new Array(7).fill(0);
      wk?.forEach(r => {
        const d = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
        if (d < 7) daily[6 - d] += r.total_amount;
      });
      setWeeklySpending(daily);

      const { data: ad } = await supabase
        .from('debts')
        .select('*, debtor:profiles!debtor_id(name, image_url), lender:profiles!lender_id(name, image_url)')
        .or('lender_id.eq.' + userId + ',debtor_id.eq.' + userId);
      const freq: Record<string, { name: string; image: string; count: number; amount: number }> = {};
      ad?.forEach(d => {
        const fId = d.lender_id === userId ? d.debtor_id : d.lender_id;
        const fD  = d.lender_id === userId ? d.debtor  : d.lender;
        if (fId && fD) {
          freq[fId] = freq[fId] || { name: fD.name || 'Teman', image: fD.image_url || '', count: 0, amount: 0 };
          freq[fId].count++; freq[fId].amount += d.amount;
        }
      });
      setTopFriends(
        Object.entries(freq)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .map(([id, d]) => ({ id, ...d }))
      );

      const { data: notifs } = await supabase
        .from('notifications').select('*').eq('user_id', userId)
        .eq('is_read', false).order('created_at', { ascending: false }).limit(3);
      setNotifications(notifs || []);
    } catch (e) { console.error(e); }
  };

  const handleOffset = async (opt: OffsetOption) => {
    confirm('💡 Potong Utang',
      <>
        <p className="mb-2">Kamu & <strong>{opt.friendName}</strong> punya utang bolak-balik.</p>
        <p>Setelah settlement, kamu cuma perlu bayar <strong>Rp {Math.abs(opt.amountTheyOwe - opt.amountYouOwe).toLocaleString()}</strong> saja.</p>
      </>,
      async () => {
        setLoading(true);
        try {
          await supabase.from('debts').update({ is_paid: true, status: 'offset' })
            .or('and(lender_id.eq.' + user?.id + ',debtor_id.eq.' + opt.friendId + '),and(lender_id.eq.' + opt.friendId + ',debtor_id.eq.' + user?.id + ')')
            .eq('is_paid', false);
          const diff = opt.amountTheyOwe - opt.amountYouOwe;
          if (diff !== 0) await supabase.from('debts').insert({
            lender_id: diff > 0 ? user?.id : opt.friendId,
            debtor_id: diff > 0 ? opt.friendId : user?.id,
            amount: Math.abs(diff), note: 'Sisa potong utang', status: 'pending'
          });
          success('Settlement Berhasil 🤝', 'Utang bolak-balik sudah diselesaikan!', () => {
            if (user) fetchDashboardData(user.id);
          });
        } catch { error('Gagal', 'Settlement tidak berhasil. Coba lagi ya.'); }
        finally { setLoading(false); }
      },
      { confirm: 'Selesaikan', cancel: 'Batalkan' }
    );
  };

  const extraCosts = receipt
    ? (receipt.tax || 0) + (receipt.serviceCharge || 0) - (receipt.discount || 0)
    : 0;
  const getFinalTotal = () =>
    receipt ? receipt.items.reduce((a, it) => a + it.price * (it.qty || 1), 0) + extraCosts : 0;

  const goToSplit = () => {
    if (!receipt) return;
    sessionStorage.setItem('urunin_split_data', JSON.stringify({ receipt, preview } as SplitSessionData));
    router.push('/split');
  };

  // ── Manual input: receipt comes in, skip preview, go straight to split ──────
  const handleManualNext = (r: ReceiptData) => {
    setReceipt(r);
    setPreview(null);
    sessionStorage.setItem('urunin_split_data', JSON.stringify({ receipt: r, preview: null } as SplitSessionData));
    router.push('/split');
  };

  // ─── LOADING ─────────────────────────────────────────────────────────────────
  if (loading && step === 'dashboard') return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg,#0D044B 0%,#3C327B 30%,#7870AB 53%,#C7C3DF 78%,#fff 100%)' }}>
      <div className="w-11 h-11 border-[3px] rounded-full animate-spin mb-4"
        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
      <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Loading…</p>
    </div>
  );

  // ─── MANUAL INPUT ─────────────────────────────────────────────────────────────
  if (step === 'manual') return (
    <ManualInputPage
      onBack={() => setStep('dashboard')}
      onNext={handleManualNext}
    />
  );

  // ─── EDIT RECEIPT (from photo upload) ────────────────────────────────────────
  if (step === 'edit' && receipt) return (
    <div className="min-h-screen pb-40" style={{ background: C.bg, fontFamily: SF }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <button onClick={() => setStep('dashboard')}
          className="mb-6 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.textMid }}>
          <ArrowLeft size={15} /> Kembali
        </button>
        <div className="bg-white rounded-3xl p-8 border" style={{ borderColor: C.border, boxShadow: C.shadowHv }}>
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="w-full lg:w-[260px] shrink-0">
              <p className="mb-3 uppercase tracking-widest"
                style={{ fontFamily: SFText, fontWeight: 600, fontSize: '10px', color: C.textLt }}>Preview Struk</p>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
                {preview && <img src={preview} alt="Struk" className="w-full grayscale hover:grayscale-0 transition-all duration-500" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 style={{ fontFamily: SF, fontWeight: 700, fontSize: '22px', color: C.text, letterSpacing: '-0.2px', marginBottom: '20px' }}>
                Review & Edit Bill ✍️
              </h2>
              <div className="space-y-2 mb-5">
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center p-3 rounded-xl border"
                    style={{ background: C.bg, borderColor: C.border }}>
                    <input value={item.name}
                      onChange={e => { const items = receipt.items.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it); setReceipt({ ...receipt, items }); }}
                      className="flex-1 bg-white p-2.5 rounded-lg border-none outline-none"
                      style={{ fontFamily: SFText, fontWeight: 500, fontSize: '14px', color: C.text, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }} />
                    <input type="number" value={item.price}
                      onChange={e => { const items = receipt.items.map((it, idx) => idx === i ? { ...it, price: +e.target.value } : it); setReceipt({ ...receipt, items }); }}
                      className="w-28 bg-white p-2.5 rounded-lg border-none outline-none"
                      style={{ fontFamily: SFText, fontWeight: 600, fontSize: '14px', color: C.primary, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }} />
                    <button onClick={() => setReceipt({ ...receipt, items: receipt.items.filter((_, idx) => idx !== i) })}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#ccc' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5 p-4 rounded-2xl border"
                style={{ background: C.accent, borderColor: C.border }}>
                {([
                  { label: 'Tax',     icon: <Percent size={9} />,      key: 'tax' },
                  { label: 'Service', icon: <BadgePercent size={9} />,  key: 'serviceCharge' },
                  { label: 'Diskon',  icon: <ArrowDownLeft size={9} />, key: 'discount' },
                ] as const).map(({ label, icon, key }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1 uppercase mb-1.5"
                      style={{ fontFamily: SFText, fontWeight: 600, fontSize: '10px', color: C.textLt }}>
                      {icon} {label}
                    </label>
                    <input type="number" value={(receipt as any)[key] || 0}
                      onChange={e => setReceipt({ ...receipt, [key]: +e.target.value } as any)}
                      className="w-full p-2.5 bg-white rounded-xl border-none outline-none"
                      style={{ fontFamily: SFText, fontWeight: 600, fontSize: '14px', color: key === 'discount' ? C.green : C.text, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: C.border }}>
                <div>
                  <p style={{ fontFamily: SFText, fontWeight: 500, fontSize: '11px', color: C.textLt, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Total Bill</p>
                  <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '24px', color: C.text }}>Rp {getFinalTotal().toLocaleString()}</p>
                </div>
                <button onClick={goToSplit}
                  className="px-7 py-3 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '14px', boxShadow: `0 4px 14px rgba(107,99,168,0.32)` }}>
                  Lanjut Bagi →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── DASHBOARD ────────────────────────────────────────────────────────────────
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Martha';
  const filteredHistory = activityFilter === 'all'
    ? history
    : history.filter(h => h.category === activityFilter);

  return (
    <div className="min-h-screen" style={{ fontFamily: SF, color: C.text }}>

      {/* ════════════════════════════════════════════════════════════════════════
          HERO — gradient background
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg,#0D044B 0%,#3C327B 29%,#7870AB 53%,#C7C3DF 78%,#ffffff 100%)',
          minHeight: '600px',
          paddingTop: '110px',
          paddingBottom: '60px',
        }}>

        {/* ── Piutang oval + bubbles (left) ── */}
        <div className="hidden lg:block absolute left-0 top-0 pointer-events-none" style={{ width: '420px', height: '600px' }}>
          <div className="absolute"
            style={{
              width: '299px', height: '161px', top: '195px', left: '103px',
              background: 'radial-gradient(ellipse at center,#ffffff 50%,#CFCBFF 100%)',
              borderRadius: '50%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', pointerEvents: 'auto',
            }}
            onClick={() => router.push('/piutang')}
          >
            <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '20px', color: '#221961' }}>Piutang</p>
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '26px', color: '#221961', marginTop: '2px' }}>
              Rp {stats.piutang.toLocaleString()}
            </p>
          </div>
          {[{ s: 54, t: 366, l: 90 }, { s: 44, t: 416, l: 55 }, { s: 32, t: 456, l: 28 }, { s: 23, t: 490, l: 9 }].map((b, i) => (
            <div key={i} className="absolute" style={{
              width: b.s, height: b.s, top: b.t, left: b.l, borderRadius: '50%',
              background: 'radial-gradient(ellipse at center,#ffffff 20%,#CFCBFF 100%)',
            }} />
          ))}
        </div>

        {/* ── Hutang oval + bubbles (right) ── */}
        <div className="hidden lg:block absolute right-0 top-0 pointer-events-none" style={{ width: '420px', height: '600px' }}>
          <div className="absolute"
            style={{
              width: '299px', height: '161px', top: '330px', right: '0px',
              background: 'radial-gradient(ellipse at center,#ffffff 50%,#CFCBFF 100%)',
              borderRadius: '50%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', pointerEvents: 'auto',
            }}
            onClick={() => router.push('/hutang')}
          >
            <p style={{ fontFamily: SFText, fontWeight: 600, fontSize: '20px', color: '#221961' }}>Hutang</p>
            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '26px', color: '#221961', marginTop: '2px' }}>
              Rp {stats.hutang.toLocaleString()}
            </p>
          </div>
          {[{ s: 54, t: 290, r: 0 }, { s: 44, t: 244, r: 30 }, { s: 32, t: 206, r: 57 }, { s: 23, t: 176, r: 76 }].map((b, i) => (
            <div key={i} className="absolute" style={{
              width: b.s, height: b.s, top: b.t, right: b.r, borderRadius: '50%',
              background: 'radial-gradient(ellipse at center,#ffffff 20%,#CFCBFF 100%)',
            }} />
          ))}
        </div>

        {/* ── Center: Welcome + Upload / Manual ── */}
        <div className="relative z-10 flex flex-col items-center px-4 text-center">
          <p className="text-[22px] sm:text-[28px]"
            style={{ fontFamily: SFText, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '2px' }}>
            Welcome to URUNIN
          </p>
          <p className="text-[40px] sm:text-[48px]"
            style={{ fontFamily: SF, fontWeight: 700, color: 'white', textShadow: '0 0 30px #b993ff', marginBottom: '36px' }}>
            {firstName}!
          </p>

          {/* Frosted action box */}
          <div className="relative px-6 sm:px-10 py-7 sm:py-8 flex flex-col items-center gap-6 w-full"
            style={{
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderRadius: '24px',
              maxWidth: '560px',
            }}>
            {/* Grid lines overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.15]" style={{ borderRadius: '24px' }}>
              <defs>
                <pattern id="pgrid" width="46" height="46" patternUnits="userSpaceOnUse">
                  <path d="M 46 0 L 0 0 0 46" fill="none" stroke="white" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pgrid)" rx="24" />
            </svg>

            <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '19px', color: 'white', textAlign: 'center', position: 'relative', zIndex: 1 }}>
              Mau tambahin tagihan gimana?
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 relative z-10 w-full justify-center">
              {/* Upload blob — tetap sama */}
              <button onClick={() => fileInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ width: '100%', maxWidth: '160px', height: '95px' }}>
                <svg viewBox="0 0 185 120" className="absolute inset-0 w-full h-full" fill="none">
                  <filter id="bs1" x="-5%" y="-5%" width="110%" height="120%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(255,255,255,0.3)" />
                  </filter>
                  <ellipse cx="92.5" cy="60" rx="84.5" ry="54" fill="white" filter="url(#bs1)" />
                </svg>
                <Upload size={20} style={{ color: '#3c3476', position: 'relative', zIndex: 1 }} />
                <span style={{ fontFamily: SF, fontWeight: 700, fontSize: '18px', color: '#3c3476', position: 'relative', zIndex: 1 }}>Upload</span>
              </button>

              {/* Manual blob — ganti dari Scan */}
              <button onClick={() => setStep('manual')}
                className="relative flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ width: '100%', maxWidth: '160px', height: '95px' }}>
                <svg viewBox="0 0 185 120" className="absolute inset-0 w-full h-full" fill="none">
                  <ellipse cx="92.5" cy="60" rx="84.5" ry="54" fill="white" />
                </svg>
                <PenLine size={20} style={{ color: '#3c3476', position: 'relative', zIndex: 1 }} />
                <span style={{ fontFamily: SF, fontWeight: 700, fontSize: '18px', color: '#3c3476', position: 'relative', zIndex: 1 }}>Manual</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          WHITE CONTENT SECTION
      ════════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#ffffff' }}>
        <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-16 pt-10 pb-24">

          {/* Guest Banner */}
          {!user && (
            <div className="mb-5 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3 border"
              style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
              <div>
                <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '15px', color: C.text }}>👋 Mode Guest</p>
                <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>Login untuk simpan data & fitur lengkap</p>
              </div>
              <button onClick={() => router.push('/login')}
                className="px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '13px' }}>
                Login →
              </button>
            </div>
          )}

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-5 rounded-2xl p-4 flex items-start gap-3 border"
              style={{ background: C.accent, borderColor: C.border }}>
              <div className="p-2 rounded-lg shrink-0" style={{ background: C.primary }}>
                <Bell className="text-white" size={16} />
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text, marginBottom: '3px' }}>
                  {notifications.length} Notifikasi Baru
                </p>
                {notifications.slice(0, 2).map(n => (
                  <p key={n.id} style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textMid }}>• {n.message}</p>
                ))}
              </div>
              <button onClick={() => router.push('/notifications')}
                style={{ fontFamily: SFText, fontWeight: 600, fontSize: '12px', color: C.primary, whiteSpace: 'nowrap' }}>
                Lihat →
              </button>
            </div>
          )}

          {/* Smart Settlement */}
          {offsetSuggestions.length > 0 && (
            <div className="mb-6 rounded-2xl p-5 border" style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ background: C.accent }}>
                    <RefreshCw size={15} style={{ color: C.primary }} />
                  </div>
                  <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '15px', color: C.text }}>Smart Settlement</p>
                </div>
                <button onClick={() => router.push('/settlement')}
                  className="flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                  style={{ fontFamily: SFText, fontWeight: 500, fontSize: '12px', color: C.primary }}>
                  Lihat Semua <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {offsetSuggestions.slice(0, 3).map((opt, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border"
                    style={{ background: C.accent, borderColor: C.border }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: C.primary }}>
                        <RefreshCw size={15} className="text-white" />
                      </div>
                      <div>
                        <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '14px', color: C.text }}>Potong Utang dengan {opt.friendName}</p>
                        <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textMid }}>
                          Hemat{' '}
                          <span style={{ fontWeight: 600, color: C.primary }}>
                            Rp {Math.min(opt.amountTheyOwe, opt.amountYouOwe).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleOffset(opt)}
                      className="px-5 py-2 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
                      style={{ background: C.primary, color: 'white', fontFamily: SF, fontWeight: 600, fontSize: '13px' }}>
                      Selesaikan 🤝
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)] gap-6 lg:gap-8">

            {/* LEFT */}
            <div className="space-y-5">
              <ExpenseChart weeklySpending={weeklySpending} />

              {/* Top Split Partners */}
              <div className="rounded-2xl p-6 border" style={{ background: C.card, borderColor: C.border, boxShadow: C.shadow }}>
                <div className="flex items-center gap-2 mb-4">
                  <Award size={15} style={{ color: C.primary }} />
                  <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '15px', color: C.text }}>Top Split Partners</p>
                </div>
                <div className="space-y-1.5">
                  {topFriends.length > 0 ? topFriends.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-[#F0EEF8]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0"
                        style={{ background: i === 0 ? 'linear-gradient(135deg,#f7c948,#e8903a)' : i === 1 ? 'linear-gradient(135deg,#c0bdd0,#9e9ab5)' : C.primary }}>
                        {f.image ? <img src={f.image} alt={f.name} className="w-full h-full object-cover" /> : f.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontFamily: SF, fontWeight: 600, fontSize: '13px', color: C.text }}>{f.name}</p>
                        <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '11px', color: C.textLt }}>{f.count} transaksi</p>
                      </div>
                      <p style={{ fontFamily: SF, fontWeight: 600, fontSize: '12px', color: C.textMid }}>Rp {(f.amount / 1000).toFixed(0)}k</p>
                    </div>
                  )) : (
                    <div className="text-center py-5">
                      <Users size={30} className="mx-auto mb-2" style={{ color: C.border }} />
                      <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '13px', color: C.textLt }}>Belum ada teman</p>
                      <button onClick={() => router.push('/friends')}
                        style={{ fontFamily: SFText, fontWeight: 600, fontSize: '12px', color: C.primary, marginTop: '4px' }}>
                        Tambah →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Activity */}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p style={{ fontFamily: SF, fontWeight: 700, fontSize: '23px', color: '#575757' }}>Your Activity</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['all', 'food', 'transport', 'shopping'] as const).map(f => (
                    <button key={f} onClick={() => setActivityFilter(f)}
                      className="px-3 py-1 rounded-full text-xs transition-all"
                      style={{
                        background: activityFilter === f ? '#3c3476' : '#f3f4f6',
                        color: activityFilter === f ? 'white' : '#6b7280',
                        fontFamily: SFText, fontWeight: 600,
                      }}>
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <button onClick={() => router.push('/history')}
                    className="flex items-center gap-0.5 hover:opacity-70 transition-opacity ml-1"
                    style={{ fontFamily: SFText, fontWeight: 500, fontSize: '12px', color: C.primary }}>
                    Lihat Semua <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-[13px]">
                {filteredHistory.length > 0 ? filteredHistory.slice(0, 6).map(item => (
                  <ActivityRow key={item.id} item={item} onClick={() => router.push('/receipt/' + item.id)} />
                )) : (
                  <div className="rounded-[23px] border-2 border-dashed flex flex-col items-center justify-center py-16 gap-2"
                    style={{ borderColor: C.border, background: C.card }}>
                    <Receipt size={38} style={{ color: C.border }} />
                    <p style={{ fontFamily: SF, fontWeight: 500, fontSize: '14px', color: C.textLt }}>Belum ada transaksi</p>
                    <p style={{ fontFamily: SFText, fontWeight: 400, fontSize: '12px', color: C.textLt }}>Scan bill pertama kamu!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hidden file input ─────────────────────────────────────────────────── */}
      <input type="file" className="hidden" accept="image/*" ref={fileInputRef}
        onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
            setPreview(reader.result as string);
            setLoading(true);
            try {
              const res = await processReceipt(reader.result as string, user?.id);
              setReceipt(res as any);
              setStep('edit');
            } catch (err: any) {
              error('OCR Gagal', err.message || 'Tidak bisa memproses struk ini. Coba foto ulang.');
            } finally { setLoading(false); }
          };
        }}
      />

      {/* ── FAB ───────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="fixed bottom-10 right-10 p-4 rounded-full transition-all hover:scale-110 z-[100]"
        style={{ background: C.primary, boxShadow: `0 6px 20px rgba(107,99,168,0.38)` }}>
        <Camera size={24} className="text-white" />
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-400 rounded-full animate-ping" />
      </button>
    </div>
  );
}