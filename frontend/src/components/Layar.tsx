import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TombolIkon } from './TombolIkon';

// Latar layar. Namanya masih "gradien" karena dipakai di banyak berkas; isinya
// sudah lama bukan gradien, dan sekarang jadi kanvas abu netral. Gradien
// warna-warni yang dulu ada di sini bersaing dengan angka merah dan hijau —
// padahal justru dua warna itulah yang harus paling dulu tertangkap mata.
export const LATAR_GRADIEN = 'bg-kanvas';

// Kerangka layar: header (kembali + wordmark), pertanyaan, isi, aksi bawah.
export function Layar({
  pertanyaan,
  children,
  aksi,
  tanpaLogo = false,
  latar,
  kembali,
  atas = false,
  hero,
}: {
  pertanyaan?: string;
  children?: ReactNode;
  aksi?: ReactNode;
  tanpaLogo?: boolean;
  latar?: string;
  kembali?: () => void;
  atas?: boolean;
  /**
   * Kepala bergradien penuh-lebar, dirender DI LUAR padding mendatar.
   *
   * Kalau diisi, layar bertanggung jawab atas padding isinya sendiri — biasanya
   * dengan membungkusnya dalam `<Lembar>`. Header bawaan, `pertanyaan`, dan
   * `atas` tidak berlaku di jalur ini: gradien sudah menjadi kepalanya, dan
   * menumpuk wordmark di bawahnya membuat dua judul bersaing.
   */
  hero?: ReactNode;
}) {
  if (hero) {
    return (
      <div className={`min-h-dvh ${latar ?? 'bg-kanvas'}`}>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          {hero}
          {children}
          {aksi && <div className="flex flex-col gap-3 px-5 pb-6">{aksi}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-dvh ${latar ?? 'bg-kanvas'}`}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
        {!tanpaLogo && (
          <div className="relative flex items-center justify-center pb-8">
            {kembali && (
              <span className="absolute left-0">
                <TombolIkon ikon={ArrowLeft} label="Kembali" nada="terang" onClick={kembali} />
              </span>
            )}
            <span className="text-sub font-extrabold tracking-[-0.02em] text-tinta">lapakAi</span>
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
