import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { pastikanBahanLengkap } from '../../lib/validasi.ts';
import { KODE_GALAT, type BahanMasukan } from '../../../../shared/types.ts';
import {
  ambilDaftarProduk, ambilDetailProduk, usulkanProdukDariTeks, simpanProdukBaru,
} from './produk.service.ts';

/**
 * Controller produk — lapisan HTTP: baca, validasi, panggil service, kirim.
 * Logika domain di produk.service.ts, SQL di produk.queries.ts.
 */

/**
 * GET /produk — fitur 6.
 *
 * Diurutkan dari margin terendah, jadi produk merugi muncul lebih dulu tanpa
 * perlu dicari. Ini inti fiturnya: pedagang tidak tahu produk mana yang
 * merugikan, jadi aplikasi yang harus menunjukkannya.
 */
export async function daftarProduk(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await ambilDaftarProduk(userId));
}

/** GET /produk/:id — rincian bahan, riwayat penjualan, dan saran harga. */
export async function detailProduk(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Produknya tidak dikenali.');
  }

  const detail = await ambilDetailProduk(id, userId);
  if (!detail) {
    throw new GalatTampil(KODE_GALAT.PRODUK_TIDAK_DITEMUKAN, 'Produk tidak ditemukan.', 404);
  }

  kirim(res, detail);
}

/**
 * POST /produk/dari-teks — fitur 10, tambah produk tanpa form.
 * ★ TIDAK MENYIMPAN APA PUN — hasil AI wajib dikonfirmasi manusia dulu
 * (aturan #2). Alurnya di produk.service.ts.
 */
export async function usulanProduk(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada yang diucapkan atau diketik.');
  }

  kirim(res, await usulkanProdukDariTeks(userId, teks));
}

/**
 * POST /produk — simpan produk, jalan masuk kedua selain onboarding.
 *
 * Menerima bentuk yang sama dengan yang dikeluarkan /produk/dari-teks setelah
 * dibetulkan pengguna, dan juga dipakai untuk menambah produk secara manual.
 * Berbeda dengan onboarding, bahan BOLEH kosong — pedagang yang buru-buru
 * berhak mencatat produknya dulu.
 */
export async function simpanProduk(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const namaProduk = String(req.body?.nama_produk ?? '').trim();
  const hargaJual = Number(req.body?.harga_jual);
  const bahan = (req.body?.bahan ?? []) as BahanMasukan[];

  if (!namaProduk) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Nama produknya belum diisi.');
  }
  if (!Number.isFinite(hargaJual) || hargaJual < 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Harga jualnya belum benar.');
  }
  if (!Array.isArray(bahan)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Daftar bahannya tidak terbaca.');
  }

  // Tanpa bahan, hasil_per_batch tidak punya arti apa-apa — dipaksa null supaya
  // tidak ada angka menggantung yang membuat modal seolah bisa dihitung.
  let hasilPerBatch: number | null = null;

  if (bahan.length > 0) {
    hasilPerBatch = Number(req.body?.hasil_per_batch);
    if (!Number.isFinite(hasilPerBatch) || hasilPerBatch <= 0) {
      throw new GalatTampil(
        KODE_GALAT.RESEP_BELUM_LENGKAP,
        'Sekali bikin jadi berapa? Isinya harus lebih dari 0.',
      );
    }
    pastikanBahanLengkap(bahan);
  }

  kirim(res, await simpanProdukBaru(userId, namaProduk, hargaJual, hasilPerBatch, bahan), 201);
}
