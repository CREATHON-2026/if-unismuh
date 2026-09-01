import type { ReactNode } from 'react';

/**
 * Pil status kecil — TERLARIS, MERUGI, "perlu dicek".
 *
 * `nada` menentukan arti, bukan selera. Hijau dan merah di sini tunduk pada
 * aturan yang sama seperti di seluruh aplikasi: hijau hanya untuk untung,
 * merah hanya untuk rugi. Untuk status yang bukan soal uang (mis. "sudah
 * dicatat"), pakai `netral`.
 */
export type NadaLencana = 'netral' | 'untung' | 'rugi' | 'tanda';

const GAYA: Record<NadaLencana, string> = {
  netral: 'bg-kanvas text-sedang',
  untung: 'bg-untung-muda text-untung-tua',
  rugi: 'bg-rugi-muda text-rugi',
  tanda: 'bg-tanda text-tanda-tinta',
};

export function Lencana({
  nada = 'netral',
  children,
}: {
  nada?: NadaLencana;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${GAYA[nada]}`}
    >
      {children}
    </span>
  );
}
