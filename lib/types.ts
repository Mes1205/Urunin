// lib/types.ts
// Shared types for Urunin — import from here in both page.tsx and split/page.tsx

export interface ReceiptItem {
  name: string;
  price: number;
  qty: number;
}

export interface ReceiptData {
  id: string;
  store_name?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  totalAmount: number;
}

export interface Participant {
  id: string;
  name: string;
  type: 'friend' | 'dummy' | 'guest';
  items: number[];
  email?: string;
}

export interface OffsetOption {
  friendId: string;
  friendName: string;
  friendImage: string;
  amountYouOwe: number;
  amountTheyOwe: number;
}

export interface ActivityItem {
  id: string;
  type: 'split' | 'payment' | 'reminder';
  user: string;
  amount: number;
  time: Date;
  icon: any;
  color: string;
}

// Shape we persist into sessionStorage when navigating page.tsx → /split
export interface SplitSessionData {
  receipt: ReceiptData;
  preview: string | null; // base64 image string
}