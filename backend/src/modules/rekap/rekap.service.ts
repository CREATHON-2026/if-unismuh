import type { Rekap } from '../../../../shared/types.ts';
import { ringkasanPenjualan } from '../beranda/beranda.queries.ts';
import { trenHarian, produkTerlarisPeriode } from './rekap.queries.ts';

/**
 * Service Rekap — merangkai tiga hasil query jadi satu jawaban.
 *
 * Tidak ada satu operasi aritmetika pun di berkas ini, termasuk yang terlihat
 * sepele. Menjumlahkan `hari.reduce((a, h) => a + h.omzet, 0)` akan terasa
 * wajar dan tetap salah: itu rumus omzet kedua yang hidup di TypeScript, dan
 * begitu aturan untung berubah di SQL, layar ini diam-diam tertinggal.
 *
 * Totalnya justru memakai `ringkasanPenjualan()` MILIK BERANDA apa adanya.
 * Itulah yang menjamin Rekap dan Beranda tidak akan pernah menyebut angka
 * berbeda untuk rentang yang sama — dan uji-rekap.mjs membandingkan keduanya
 * setiap kali dijalankan.
 */
export async function ringkasRekap(userId: number, hari: number): Promise<Rekap> {
  const [tren, terlaris] = await Promise.all([
    trenHarian(userId, hari),
    produkTerlarisPeriode(userId, hari),
  ]);

  // Batas rentangnya diambil dari hasil SQL, bukan dihitung ulang di sini.
  // `trenHarian` sudah menurunkannya dari CURRENT_DATE database, jadi total dan
  // grafik dijamin mencakup hari yang sama persis.
  const jual = await ringkasanPenjualan(
    userId, tren[0]?.tgl ?? null, tren[tren.length - 1]?.tgl ?? null,
  );

  return {
    // `tgl` dibuang di sini: ia alat dalam, bukan bagian kontrak.
    hari: tren.map(({ label, omzet, untung_bersih }) => ({ label, omzet, untung_bersih })),
    omzet: jual?.omzet ?? 0,
    untung_bersih: jual?.untung_bersih ?? 0,
    ada_transaksi: (jual?.jumlah_baris ?? 0) > 0,
    produk_terlaris: terlaris
      ? { id: terlaris.id, nama: terlaris.nama, jumlah_terjual: terlaris.jumlah_terjual }
      : null,
  };
}
