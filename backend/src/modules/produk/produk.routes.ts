import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type DetailProduk } from '../../../../shared/types.ts';
import { daftarProduk, detailProduk, bahanProduk } from './produk.queries.ts';

export const rutProduk = Router();
rutProduk.use(wajibLogin);

/**
 * GET /produk — fitur 6.
 *
 * Diurutkan dari margin terendah, jadi produk merugi muncul lebih dulu tanpa
 * perlu dicari. Ini inti fiturnya: pedagang tidak tahu produk mana yang
 * merugikan, jadi aplikasi yang harus menunjukkannya.
 */
rutProduk.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await daftarProduk(userId));
}));

/** GET /produk/:id — rincian bahan dan riwayat penjualan. */
rutProduk.get('/:id', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Produknya tidak dikenali.');
  }

  // Query menyertakan user_id, jadi produk pedagang lain tidak akan ketemu —
  // isolasi terjadi di database, bukan dengan menyaring hasil di sini.
  const dasar = await detailProduk(id, userId);
  if (!dasar) {
    throw new GalatTampil(KODE_GALAT.PRODUK_TIDAK_DITEMUKAN, 'Produk tidak ditemukan.', 404);
  }

  const jawaban: DetailProduk = {
    ...dasar,
    bahan: await bahanProduk(id, userId),
    // Fitur 8 (saran perbaikan harga) belum dibangun. null, bukan angka
    // karangan — frontend menyembunyikan bagiannya sampai fitur itu ada.
    saran_harga: null,
  };

  kirim(res, jawaban);
}));
