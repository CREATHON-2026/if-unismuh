import type { LucideIcon } from 'lucide-react';
import { Tombol } from './Tombol';

/**
 * Layar kosong — dengan jalan keluar.
 *
 * Menjawab tiga hal berurutan, dan urutannya penting:
 *   judul     apa yang terjadi
 *   pesan     kenapa kosong
 *   aksi      apa yang bisa dilakukan sekarang
 *
 * Sebelumnya layar kosong hanya menjawab dua yang pertama. "Belum ada produk.
 * Tambahkan lewat wawancara resep" memberi tahu pengguna apa yang harus
 * dilakukan tanpa memberi cara melakukannya — mereka harus menebak menu mana
 * yang membuka wawancara itu.
 *
 * `aksi` opsional karena ada kosong yang memang tidak butuh tindakan: "tidak
 * ada produk yang merugi" adalah kabar baik, bukan pekerjaan.
 */
export function KeadaanKosong({
  ikon: Ikon,
  judul,
  pesan,
  labelAksi,
  onAksi,
}: {
  ikon: LucideIcon;
  judul: string;
  pesan: string;
  labelAksi?: string;
  onAksi?: () => void;
}) {
  return (
    <div className="kartu mt-4 flex flex-col items-center px-5 py-9 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-kanvas text-redup"
        aria-hidden="true"
      >
        <Ikon size={26} strokeWidth={1.8} />
      </span>

      <p className="mt-4 text-utama font-semibold text-tinta">{judul}</p>
      <p className="mt-1.5 max-w-[32ch] text-isi leading-relaxed text-sedang">{pesan}</p>

      {labelAksi && onAksi && (
        <div className="mt-5 w-full max-w-[16rem]">
          <Tombol onClick={onAksi}>{labelAksi}</Tombol>
        </div>
      )}
    </div>
  );
}
