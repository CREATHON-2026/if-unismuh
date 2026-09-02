import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LogoTeks } from './Logo';

// Latar layar. Namanya masih "gradien" karena dipakai di banyak berkas; isinya
// sudah lama bukan gradien, dan sekarang jadi kanvas abu netral. Gradien
// warna-warni yang dulu ada di sini bersaing dengan angka merah dan hijau —
// padahal justru dua warna itulah yang harus paling dulu tertangkap mata.
export const LATAR_GRADIEN = 'bg-kanvas';

// Tombol kembali standar — bentuknya sama di semua layar.
export function TombolKembali({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Kembali"
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl leading-none text-tinta shadow-sm ring-1 ring-garis active:scale-95"
    >
      ←
    </button>
  );
}

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
    <div className={`min-h-dvh ${latar ?? 'bg-kanvas'}`}>
      {/* Satu kolom di semua ukuran — ini aplikasi saku, bukan dashboard.
          Di tablet/desktop kolomnya melebar secukupnya lalu berhenti: 512px
          (md) dan 576px (xl). Lebih dari itu, baris teks jadi terlalu panjang
          dan angka-angka yang harus dibandingkan saling menjauh. */}
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6 md:max-w-lg md:px-8 md:py-8 xl:max-w-xl">
        {!tanpaLogo && (
          <div className="relative flex items-center justify-center pb-6 sm:pb-8">
            {kembali && (
              <button
                type="button"
                aria-label="Kembali"
                onClick={kembali}
                className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full text-tinta transition active:scale-95"
              >
                <ArrowLeft size={24} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
            <LogoTeks className="text-sub" />
          </div>
        )}
        {pertanyaan && (
          <h1 className="text-2xl font-bold leading-snug tracking-[-0.02em] text-tinta">{pertanyaan}</h1>
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
