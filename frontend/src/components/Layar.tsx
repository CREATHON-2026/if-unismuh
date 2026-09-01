import type { ReactNode } from 'react';

// Kerangka "satu layar satu pertanyaan": pertanyaan di atas, isi di tengah, aksi di bawah.
export function Layar({
  pertanyaan,
  children,
  aksi,
}: {
  pertanyaan?: string;
  children?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
      {pertanyaan && (
        <h1 className="text-2xl font-bold leading-snug text-slate-900">{pertanyaan}</h1>
      )}
      <div className="flex flex-1 flex-col justify-center gap-4 py-8">{children}</div>
      {aksi && <div className="flex flex-col gap-3 pb-2">{aksi}</div>}
    </div>
  );
}
