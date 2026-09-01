import type { InputHTMLAttributes } from 'react';

// Gaya input standar — dipakai semua kolom isian supaya seragam antar layar.
export const KELAS_INPUT =
  'h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 text-utama text-tinta outline-none transition placeholder:text-redup focus:border-hero';

// Input besar untuk jari yang tidak terbiasa; angka utama mudah dibaca.
export function InputTeks(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-14 w-full rounded-2xl border-[1.5px] border-garis-tua bg-kartu px-4 text-lg text-tinta outline-none transition placeholder:text-redup focus:border-hero"
      {...props}
    />
  );
}
