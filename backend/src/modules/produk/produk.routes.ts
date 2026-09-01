import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type DetailProduk, type SaranHarga } from '../../../../shared/types.ts';
import { rupiah } from '../../lib/rupiah.ts';
import { daftarProduk, detailProduk, bahanProduk, saranHarga } from './produk.queries.ts';

/**
 * Rangkai kalimat saran dari ANGKA YANG SUDAH DIHITUNG SQL.
 *
 * Tidak memakai LLM, dan itu disengaja: kalimat ini muncul di setiap layar
 * detail produk, jadi menggantungkannya pada server LLM berarti layar detail
 * ikut lambat setiap kali server itu sedang sibuk.
 */
function alasanSaran(s: { harga_impas: number; harga_disarankan: number; kenaikan: number }): string {
  return `Modal Anda ${rupiah(s.harga_impas)} per unit. Supaya untung sekitar 20%, `
    + `jual ${rupiah(s.harga_disarankan)} — naik ${rupiah(s.kenaikan)} dari harga sekarang.`;
}

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

  const [bahan, saran] = await Promise.all([
    bahanProduk(id, userId),
    saranHarga(id, userId),
  ]);

  // null kalau tidak ada yang perlu disarankan — resep belum diisi, atau
  // harganya sudah mencapai target. Frontend menyembunyikan bagiannya.
  const saranLengkap: SaranHarga | null = saran
    ? { ...saran, alasan: alasanSaran(saran) }
    : null;

  const jawaban: DetailProduk = {
    ...dasar,
    bahan,
    saran_harga: saranLengkap,
  };

  kirim(res, jawaban);
}));
