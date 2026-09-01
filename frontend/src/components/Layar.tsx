import type { ReactNode } from 'react';
import { Logo } from './Logo';

// Kerangka "satu layar satu pertanyaan": logo di atas, pertanyaan, isi, aksi di bawah.
export function Layar({
  pertanyaan,
  children,
  aksi,
  tanpaLogo = false,
  latar,
}: {
  pertanyaan?: string;
  children?: ReactNode;
  aksi?: ReactNode;
  tanpaLogo?: boolean;
  latar?: string;
}) {
  return (
    <div className={`min-h-dvh ${latar ?? 'bg-white'}`}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
        {!tanpaLogo && (
          <div className="pb-6">
            <Logo ukuranIkon={26} kelasTeks="text-lg" />
          </div>
        )}
        {pertanyaan && (
          <h1 className="text-2xl font-bold leading-snug text-slate-900">{pertanyaan}</h1>
        )}
        <div className="flex flex-1 flex-col justify-center gap-4 py-8">{children}</div>
        {aksi && <div className="flex flex-col gap-3 pb-2">{aksi}</div>}
      </div>
    </div>
  );
}
