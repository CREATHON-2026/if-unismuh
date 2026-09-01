import type { ReactNode } from 'react';

// Kartu putih standar — pengganti gaya rounded/shadow yang tadinya ditulis
// ulang berbeda-beda di tiap layar.
export function Kartu({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-[28px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
