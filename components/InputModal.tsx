"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const SF     = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const SFText = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const C = {
  bg:      '#ffffff',
  border:  '#E8E6F0',
  primary: '#6B63A8',
  accent:  '#F0EEF8',
  text:    '#2E2C3A',
  textMid: '#6B6880',
  textLt:  '#A8A5B8',
};

interface InputModalProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

export function InputModal({
  open,
  title,
  description,
  placeholder = 'Ketik di sini…',
  defaultValue = '',
  confirmLabel = 'Konfirmasi',
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, defaultValue]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!value.trim()) return;
    onConfirm(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel?.();
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(14, 10, 40, 0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.18s ease',
        }}
      />

      {/* Modal box */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          pointerEvents: 'none',
        }}
      >
        <div
          onKeyDown={handleKeyDown}
          style={{
            pointerEvents: 'auto',
            background: C.bg,
            borderRadius: '28px',
            border: `1px solid ${C.border}`,
            boxShadow: '0 24px 60px rgba(107,99,148,0.22), 0 4px 16px rgba(0,0,0,0.08)',
            padding: '36px 32px 28px',
            width: '100%',
            maxWidth: '420px',
            animation: 'slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Decorative icon blob */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: C.accent, display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
                fill={C.primary} />
            </svg>
          </div>

          {/* Title */}
          <p style={{
            fontFamily: SF, fontWeight: 700, fontSize: '20px',
            color: C.text, marginBottom: '6px', letterSpacing: '-0.2px',
          }}>
            {title}
          </p>

          {/* Description */}
          {description && (
            <p style={{
              fontFamily: SFText, fontWeight: 400, fontSize: '14px',
              color: C.textMid, marginBottom: '20px', lineHeight: '1.5',
            }}>
              {description}
            </p>
          )}

          {/* Input */}
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '14px',
              border: `1.5px solid ${value.trim() ? C.primary : C.border}`,
              fontFamily: SFText, fontWeight: 500, fontSize: '15px',
              color: C.text, background: C.accent,
              outline: 'none',
              marginBottom: '20px',
              transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
          />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {onCancel && (
              <button
                onClick={onCancel}
                style={{
                  flex: 1, padding: '13px',
                  borderRadius: '14px',
                  border: `1.5px solid ${C.border}`,
                  background: 'transparent',
                  fontFamily: SF, fontWeight: 600, fontSize: '14px',
                  color: C.textMid, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = C.accent)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Batalkan
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={!value.trim()}
              style={{
                flex: 1, padding: '13px',
                borderRadius: '14px',
                border: 'none',
                background: value.trim() ? C.primary : C.textLt,
                fontFamily: SF, fontWeight: 700, fontSize: '14px',
                color: 'white', cursor: value.trim() ? 'pointer' : 'not-allowed',
                boxShadow: value.trim() ? '0 4px 14px rgba(107,99,168,0.30)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </>,
    document.body
  );
}


// ── Hook agar bisa dipanggil secara programatik ───────────────────────────────
import { useCallback } from 'react';

interface InputModalState {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  resolve?: (value: string | null) => void;
}

export function useInputModal() {
  const [state, setState] = useState<InputModalState>({ open: false, title: '' });

  const prompt = useCallback((
    title: string,
    options?: {
      description?: string;
      placeholder?: string;
      defaultValue?: string;
      confirmLabel?: string;
    }
  ): Promise<string | null> => {
    return new Promise(resolve => {
      setState({ open: true, title, ...options, resolve });
    });
  }, []);

  const handleConfirm = (value: string) => {
    state.resolve?.(value);
    setState({ open: false, title: '' });
  };

  const handleCancel = () => {
    state.resolve?.(null);
    setState({ open: false, title: '' });
  };

  const ModalComponent = (
    <InputModal
      open={state.open}
      title={state.title}
      description={state.description}
      placeholder={state.placeholder}
      defaultValue={state.defaultValue}
      confirmLabel={state.confirmLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { prompt, ModalComponent };
}