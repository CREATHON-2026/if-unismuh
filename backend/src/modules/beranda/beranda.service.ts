import type { Beranda } from '../../../../shared/types.ts';
import { ringkasanPenjualan, temuanProduk } from './beranda.queries.ts';

/**
 * Service Beranda — merangkai dua hasil query jadi satu jawaban. Semua angka
 * datang dari SQL; tidak ada satu operasi aritmetika pun di berkas ini.
 */

/**
 * GET /beranda — fitur 7: omzet vs untung bersih bersebelahan.
 * `dari`/`sampai` null berarti bulan berjalan (bawaan diputuskan SQL).
 */
export async function ringkasBeranda(
  userId: number, dari: string | null, sampai: string | null,
): Promise<Beranda> {
  const [jual, produk] = await Promise.all([
    ringkasanPenjualan(userId, dari, sampai),
    temuanProduk(userId),
  ]);

  return {
    omzet: jual?.omzet ?? 0,
    untung_bersih: jual?.untung_bersih ?? 0,
    ada_transaksi: (jual?.jumlah_baris ?? 0) > 0,
    baris_tanpa_modal: jual?.baris_tanpa_modal ?? 0,
    jumlah_produk_merugi: produk?.jumlah_produk_merugi ?? 0,
    produk_paling_merugi: produk?.nama != null && produk.margin_per_unit != null
      ? { nama: produk.nama, margin_per_unit: produk.margin_per_unit }
      : null,
  };
}
