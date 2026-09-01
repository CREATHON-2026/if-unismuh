import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Baris daftar: chip ikon, judul, keterangan, lalu nilai di kanan.
 *
 * Dipakai untuk produk, pesanan, dan hasil ekstraksi supaya ketiganya terasa
 * satu bahasa. Tinggi minimum 72px — rujukan rupanya memakai baris padat, tapi
 * jari yang tidak terbiasa butuh sasaran yang lebih besar daripada itu.
 *
 * `nilai` sudah jadi dan sudah diformat. Tidak ada hitungan di sini.
 */
export function BarisDaftar({
  ikon: Ikon,
  judul,
  meta,
  nilai,
  nadaNilai = 'netral',
  nadaIkon = 'netral',
  kanan,
  onClick,
}: {
  ikon?: LucideIcon;
  judul: string;
  /** Baris kecil di bawah judul — satuan, jumlah, waktu */
  meta?: ReactNode;
  /** Sudah diformat. "—" kalau belum diketahui, bukan "0". */
  nilai?: string;
  nadaNilai?: 'netral' | 'untung' | 'rugi';
  nadaIkon?: 'netral' | 'untung' | 'rugi' | 'tanda';
  /** Ditaruh di bawah nilai, biasanya <Lencana> */
  kanan?: ReactNode;
  onClick?: () => void;
}) {
  const warnaNilai =
    nadaNilai === 'rugi' ? 'text-rugi' : nadaNilai === 'untung' ? 'text-untung' : 'text-tinta';
  const warnaChip =
    nadaIkon === 'rugi'
      ? 'bg-rugi-muda text-rugi'
      : nadaIkon === 'untung'
        ? 'bg-untung-muda text-untung'
        : nadaIkon === 'tanda'
          ? 'bg-tanda text-tanda-tinta'
          : 'bg-kanvas text-sedang';

  const isi = (
    <div className="flex min-h-[72px] w-full items-center gap-3.5 px-4 py-3.5 text-left">
      {Ikon && (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${warnaChip}`}
          aria-hidden="true"
        >
          <Ikon size={20} strokeWidth={1.8} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-utama font-semibold text-tinta">{judul}</p>
        {meta && <div className="mt-0.5 text-kecil leading-relaxed text-redup">{meta}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {nilai && <span className={`angka text-utama font-bold ${warnaNilai}`}>{nilai}</span>}
        {kanan}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full transition active:scale-[0.99]">
        {isi}
      </button>
    );
  }
  return isi;
}

/**
 * Pembungkus daftar: kartu putih dengan garis pemisah antarbaris.
 * Dipisah dari `BarisDaftar` supaya baris bisa dipakai sendirian juga.
 */
export function KartuDaftar({ children }: { children: ReactNode }) {
  return <div className="kartu divide-y divide-garis overflow-hidden">{children}</div>;
}
