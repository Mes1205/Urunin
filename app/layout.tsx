"use client"; 

import { usePathname } from "next/navigation";
import Navbar from "../components/navbar";
import "./globals.css";
import { ModalProvider } from '@/components/Modal';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const disableNavbar = ["/login"];

  return (
    <html lang="en">
      <body>
        <ModalProvider>
          {!disableNavbar.includes(pathname) && <Navbar />}
          <main>
            {children}
          </main>
        </ModalProvider>
      </body>
    </html>
  );
}