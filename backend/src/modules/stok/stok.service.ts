import { GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BarisStok, type StokBahan } from '../../../../shared/types.ts';
import { daftarStok, simpanStok, BahanTidakSah } from './stok.queries.ts';

/**
 * Service stok — logika domain, tanpa Express. SQL di stok.queries.ts.
 */

/**
 * Daftar bahan beserta stoknya. Bahan yang belum pernah dicatat tampil dengan
 * `jumlah: null`, bukan 0 — frontend menampilkannya sebagai "belum dicatat",
 * bukan "habis".
 */
export function ambilDaftarStok(userId: number): Promise<StokBahan[]> {
  return daftarStok(userId);
}

/**
 * Catat stok beberapa bahan sekaligus — masuk semua atau tidak sama sekali.
 * Bahan milik pengguna lain membatalkan seluruh batch (dicek di SQL).
 */
export async function catatStok(userId: number, baris: BarisStok[]): Promise<number> {
  try {
    return await simpanStok(userId, baris);
  } catch (err) {
    if (err instanceof BahanTidakSah) {
      throw new GalatTampil(
        KODE_GALAT.PERMINTAAN_TIDAK_VALID,
        'Ada bahan yang tidak dikenali. Tidak ada stok yang tersimpan.',
      );
    }
    throw err;
  }
}
