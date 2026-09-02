import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Grid ubin ikon. Empat kolom — sama seperti rujukannya, dan itu batas atasnya:
 * pada 360px, lima kolom menyisakan 60px per ubin dan labelnya mulai patah di
 * tengah kata.
 */
export function GridUbin({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-4 gap-x-2 gap-y-5">{children}</div>;
}

/**
 * Satu ubin ikon: kotak membulat berlatar muda, ikon berwarna, label di bawah.
 *
 * `nada` tunduk pada aturan warna yang sama seperti seluruh aplikasi. `merek`
 * adalah nada bawaannya justru karena ungu tidak berarti apa-apa soal uang —
 * pintasan navigasi memang tidak seharusnya memberi isyarat untung atau rugi.
 * Hijau dan merah di sini hanya sah kalau ubinnya memang menunjuk ke angka
 * untung atau rugi.
 */
export function UbinIkon({
  ikon: Ikon,
  label,
  nada = 'merek',
  onClick,
  lencana,
}: {
  ikon: LucideIcon;
  label: string;
  nada?: 'merek' | 'untung' | 'rugi' | 'tanda' | 'netral';
  onClick: () => void;
  /** Angka kecil di pojok ubin, mis. jumlah pesanan baru. Sudah jadi teks. */
  lencana?: string;
}) {
  const gaya =
    nada === 'untung'
      ? 'bg-untung-muda text-untung'
      : nada === 'rugi'
        ? 'bg-rugi-muda text-rugi'
        : nada === 'tanda'
          ? 'bg-tanda text-tanda-tinta'
          : nada === 'netral'
            ? 'bg-permukaan text-sedang'
            : 'bg-merek-muda text-merek';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-kontrol pt-1 transition active:scale-95"
    >
      <span className="relative">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-ubin ${gaya}`}
          aria-hidden="true"
        >
          <Ikon size={24} strokeWidth={1.9} />
        </span>
        {lencana && (
          <span className="angka absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rugi px-1 text-label font-bold text-white">
            {lencana}
          </span>
        )}
      </span>
      <span className="text-center text-kecil font-medium leading-tight text-sedang">{label}</span>
    </button>
  );
}
