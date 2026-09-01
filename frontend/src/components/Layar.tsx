import type { ReactNode } from 'react';

// Gradien lembut brand: oranye kanan-atas, teal kiri-bawah.
export const LATAR_GRADIEN =
  'bg-[#F4F6FB] [background-image:radial-gradient(55%_35%_at_88%_8%,rgba(245,131,31,0.16),transparent_65%),radial-gradient(45%_30%_at_8%_96%,rgba(56,189,248,0.14),transparent_60%)]';

// Kerangka layar: header (kembali + wordmark), pertanyaan, isi, aksi bawah.
export function Layar({
  pertanyaan,
  children,
  aksi,
  tanpaLogo = false,
  latar,
  kembali,
  atas = false,
}: {
  pertanyaan?: string;
  children?: ReactNode;
  aksi?: ReactNode;
  tanpaLogo?: boolean;
  latar?: string;
  kembali?: () => void;
  atas?: boolean;
}) {
  return (
    <div className={`min-h-dvh ${latar ?? 'bg-[#F6F7FB]'}`}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-6">
        {!tanpaLogo && (
          <div className="relative flex items-center justify-center pb-8">
            {kembali && (
              <button
                type="button"
                aria-label="Kembali"
                onClick={kembali}
                className="absolute left-0 p-1 text-3xl leading-none text-slate-900 active:scale-95"
              >
                ←
              </button>
            )}
            <span className="font-logo text-2xl font-semibold text-[#D9A468]">lapakAi</span>
          </div>
        )}
        {pertanyaan && (
          <h1 className="font-logo text-2xl font-bold leading-snug text-slate-900">{pertanyaan}</h1>
        )}
        <div
          className={`flex flex-1 flex-col gap-4 py-6 ${atas ? 'justify-start' : 'justify-center'}`}
        >
          {children}
        </div>
        {aksi && <div className="flex flex-col gap-3 pb-2">{aksi}</div>}
      </div>
    </div>
  );
}
