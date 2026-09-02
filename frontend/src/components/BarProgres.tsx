/**
 * Bar progres untuk rincian "modal datang dari sini".
 *
 * `persen` datang JADI dari API — dihitung di SQL, tidak di sini. Menaruh angka
 * yang sudah jadi ke lebar bar bukan aritmetika uang, jadi aturan #7 aman.
 * Kalau suatu saat ada yang tergoda menghitung `biaya / total * 100` di berkas
 * ini, itu pelanggaran, bukan penyederhanaan.
 *
 * `persen === null` berarti modalnya belum diketahui. Bar-nya tidak digambar
 * dan nilainya ditulis "—". Menggambar bar kosong akan terbaca sebagai "nol
 * persen", padahal artinya "belum tahu" — dua hal yang sangat berbeda.
 */
export function BarProgres({
  label,
  sub,
  persen,
  nilai,
  nada = 'netral',
}: {
  label: string;
  /** Keterangan kecil di kanan label, mis. "200 g" */
  sub?: string;
  persen: number | null;
  /** Sudah diformat */
  nilai: string;
  nada?: 'netral' | 'tenaga';
}) {
  const warnaBar = nada === 'tenaga' ? 'bg-redup' : 'bg-merek';

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-isi font-semibold text-tinta">
          {label}
          {sub && <span className="ml-2 text-kecil font-normal text-redup">{sub}</span>}
        </p>
        <span className="angka shrink-0 text-isi font-bold text-tinta">{nilai}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-kanvas">
          {persen !== null && (
            <div
              className={`h-full rounded-full ${warnaBar}`}
              style={{ width: `${Math.min(persen, 100)}%` }}
            />
          )}
        </div>
        <span className="angka w-11 shrink-0 text-right text-kecil font-semibold text-redup">
          {persen === null ? '—' : `${persen}%`}
        </span>
      </div>
    </div>
  );
}
