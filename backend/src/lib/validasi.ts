import { GalatTampil } from './http.ts';
import { KODE_GALAT, type BahanMasukan } from '../../../shared/types.ts';

/**
 * Validasi masukan yang dipakai LEBIH DARI SATU modul.
 *
 * Aturan kelengkapan bahan dipakai onboarding (wawancara resep) dan produk
 * (tambah produk). Dulu keduanya menyalin loop yang sama — dan dua salinan
 * validasi akan berbeda diam-diam begitu salah satunya diperbaiki. Aturan
 * KAPAN bahan boleh kosong tetap milik masing-masing controller; yang di sini
 * hanya "kalau ada barisnya, isinya harus lengkap".
 */

/**
 * Pastikan setiap baris bahan lengkap: ada nama, jumlah dipakai, jumlah beli,
 * dan harga beli. Resep setengah jadi menghasilkan modal yang salah TANPA
 * pesan galat — kegagalan paling mahal di aplikasi ini.
 */
export function pastikanBahanLengkap(bahan: BahanMasukan[]): void {
  for (const b of bahan) {
    if (!b?.nama?.trim()) {
      throw new GalatTampil(KODE_GALAT.RESEP_BELUM_LENGKAP, 'Ada bahan yang belum ada namanya.');
    }
    if (!(Number(b.jumlah) > 0) || !(Number(b.jumlah_beli) > 0) || !(Number(b.harga_beli) >= 0)) {
      throw new GalatTampil(
        KODE_GALAT.RESEP_BELUM_LENGKAP,
        `Data bahan "${b.nama}" belum lengkap: perlu jumlah dipakai, jumlah beli, dan harga beli.`,
      );
    }
  }
}
