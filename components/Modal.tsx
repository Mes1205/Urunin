"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────
type ModalType = 'success' | 'error' | 'confirm' | 'info';

interface ModalState {
  open: boolean;
  type: ModalType;
  title: string;
  message: string | React.ReactNode; // supports JSX for rich content
  onConfirm?: () => void;
  onClose?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ModalContextType {
  success: (title: string, message: string | React.ReactNode, onClose?: () => void) => void;
  error: (title: string, message: string | React.ReactNode) => void;
  confirm: (title: string, message: string | React.ReactNode, onConfirm: () => void, labels?: { confirm?: string; cancel?: string }) => void;
  info: (title: string, message: string | React.ReactNode, onClose?: () => void) => void;
}

// ──────────────────────────────────────────────
// CONTEXT
// ──────────────────────────────────────────────
const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used inside <ModalProvider>');
  return ctx;
};

// ──────────────────────────────────────────────
// CONFIG PER TYPE
// ──────────────────────────────────────────────
const CONFIG = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    Icon: CheckCircle,
    titleColor: 'text-green-800',
    btnBg: 'bg-green-500 hover:bg-green-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    Icon: XCircle,
    titleColor: 'text-red-800',
    btnBg: 'bg-red-500 hover:bg-red-600',
  },
  confirm: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    Icon: AlertTriangle,
    titleColor: 'text-amber-800',
    btnBg: 'bg-amber-500 hover:bg-amber-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    Icon: Info,
    titleColor: 'text-blue-800',
    btnBg: 'bg-blue-500 hover:bg-blue-600',
  },
} as const;

// ──────────────────────────────────────────────
// PROVIDER + MODAL UI
// ──────────────────────────────────────────────
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    open: false, type: 'info', title: '', message: ''
  });

  const close = useCallback(() => {
    setModal(prev => ({ ...prev, open: false }));
  }, []);

  // ── public API ──
  const success = useCallback((title: string, message: string | React.ReactNode, onClose?: () => void) => {
    setModal({ open: true, type: 'success', title, message, onClose });
  }, []);

  const error = useCallback((title: string, message: string | React.ReactNode) => {
    setModal({ open: true, type: 'error', title, message });
  }, []);

  const confirm = useCallback((title: string, message: string | React.ReactNode, onConfirm: () => void, labels?: { confirm?: string; cancel?: string }) => {
    setModal({ open: true, type: 'confirm', title, message, onConfirm, confirmLabel: labels?.confirm, cancelLabel: labels?.cancel });
  }, []);

  const info = useCallback((title: string, message: string | React.ReactNode, onClose?: () => void) => {
    setModal({ open: true, type: 'info', title, message, onClose });
  }, []);

  // ── derived ──
  const cfg = CONFIG[modal.type];
  const { Icon } = cfg;

  const handleClose = () => {
    modal.onClose?.();
    close();
  };

  const handleConfirm = () => {
    modal.onConfirm?.();
    close();
  };

  return (
    <ModalContext.Provider value={{ success, error, confirm, info }}>
      {children}

      {/* ── BACKDROP + MODAL ── */}
      {modal.open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* modal card */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center px-4">
            <div
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* ── top color stripe ── */}
              <div className={`h-2 ${modal.type === 'success' ? 'bg-green-500' : modal.type === 'error' ? 'bg-red-500' : modal.type === 'confirm' ? 'bg-amber-500' : 'bg-blue-500'}`} />

              <div className="p-8">
                {/* close X */}
                <div className="flex justify-end -mt-2 mb-2">
                  <button onClick={handleClose} className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-100">
                    <X size={20} />
                  </button>
                </div>

                {/* icon + title */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className={`${cfg.iconBg} p-4 rounded-2xl mb-4`}>
                    <Icon className={cfg.iconColor} size={32} />
                  </div>
                  <h3 className={`text-xl font-black ${cfg.titleColor}`}>{modal.title}</h3>
                </div>

                {/* message body */}
                <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-5 mb-8`}>
                  {typeof modal.message === 'string' ? (
                    <p className="text-sm text-gray-700 font-medium whitespace-pre-line leading-relaxed">
                      {modal.message}
                    </p>
                  ) : (
                    <div className="text-sm text-gray-700 font-medium leading-relaxed">
                      {modal.message}
                    </div>
                  )}
                </div>

                {/* ── buttons ── */}
                {modal.type === 'confirm' ? (
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-6 py-3 rounded-xl font-black text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      {modal.cancelLabel || 'Batalkan'}
                    </button>
                    <button
                      onClick={handleConfirm}
                      className={`flex-1 px-6 py-3 rounded-xl font-black text-sm text-white ${cfg.btnBg} transition-colors shadow-lg`}
                    >
                      {modal.confirmLabel || 'Konfirmasi'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleClose}
                    className={`w-full px-6 py-3 rounded-xl font-black text-sm text-white ${cfg.btnBg} transition-colors shadow-lg`}
                  >
                    {modal.type === 'success' ? 'Oke, Makasih!' : 'Tutup'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </ModalContext.Provider>
  );
}