import type { LucideIcon } from 'lucide-react';

export type AksiCepat = {
  ikon: LucideIcon;
  label: string;
  onClick: () => void;
};

/**
 * Kartu aksi cepat yang menyeberangi jahitan antara hero dan lembar.
 *
 * Letaknya bukan hiasan: benda yang menimpa dua bidang sekaligus terbaca
 * sebagai lapisan paling atas tanpa perlu bayangan tebal, dan itu satu-satunya
 * cara membuat empat pintasan terlihat lebih penting daripada daftar di
 * bawahnya tanpa memperbesar apa pun.
 *
 * Maksimal empat. Lima membuat lebar tiap kolom di bawah 70px, dan labelnya
 * mulai terpotong di layar 360px.
 *
 * Bayangan dipakai di sini karena kartu ini memang mengambang — lihat alasan
 * lengkap soal bayangan terbatas di index.css.
 */
export function KartuAksi({ aksi }: { aksi: readonly AksiCepat[] }) {
  return (
    <div className="flex items-stretch justify-between rounded-kartu bg-kartu px-1.5 py-4 shadow-mengambang">
      {aksi.slice(0, 4).map((a) => {
        const Ikon = a.ikon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="flex min-h-16 flex-1 flex-col items-center justify-center gap-2 rounded-kontrol px-1 transition active:scale-95"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full bg-merek-muda text-merek"
              aria-hidden="true"
            >
              <Ikon size={21} strokeWidth={1.9} />
            </span>
            <span className="text-kecil font-medium leading-tight text-sedang">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
