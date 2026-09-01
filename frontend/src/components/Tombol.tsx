import type { ButtonHTMLAttributes } from 'react';

// Tombol target-sentuh besar. Varian: utama (pill oranye), gelap (CTA cokelat), garis.
export function Tombol({
  varian = 'utama',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: 'utama' | 'gelap' | 'garis' }) {
  const dasar =
    'h-16 w-full rounded-full text-lg font-bold transition active:scale-[0.98] disabled:opacity-40';
  const gaya =
    varian === 'utama'
      ? 'bg-[#F5831F] text-[#7C2D12]'
      : varian === 'gelap'
        ? 'bg-[#A8500B] text-white'
        : 'border-2 border-slate-300 bg-white text-slate-800';
  return <button className={`${dasar} ${gaya} ${className}`} {...props} />;
}
