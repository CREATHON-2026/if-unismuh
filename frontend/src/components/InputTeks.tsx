import type { InputHTMLAttributes } from 'react';

// Input besar untuk jari yang tidak terbiasa; angka utama mudah dibaca.
export function InputTeks(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-14 w-full rounded-2xl border-2 border-slate-300 px-4 text-lg outline-none focus:border-slate-900"
      {...props}
    />
  );
}
