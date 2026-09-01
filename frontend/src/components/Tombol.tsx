import type { ButtonHTMLAttributes } from 'react';

// Tombol target-sentuh besar. Varian: utama (gelap), garis (sekunder).
export function Tombol({
  varian = 'utama',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: 'utama' | 'garis' }) {
  const dasar =
    'h-14 w-full rounded-2xl text-lg font-semibold transition active:scale-[0.98] disabled:opacity-40';
  const gaya =
    varian === 'utama'
      ? 'bg-slate-900 text-white'
      : 'border-2 border-slate-300 bg-white text-slate-800';
  return <button className={`${dasar} ${gaya} ${className}`} {...props} />;
}
