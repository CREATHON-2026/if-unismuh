import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { pastikanBahanLengkap } from '../../lib/validasi.ts';
import { KODE_GALAT, type BahanMasukan, type JenisUsaha } from '../../../../shared/types.ts';
import { perbaruiUsaha, buatProdukDenganResep } from './onboarding.service.ts';

/**
 * Controller onboarding — lapisan HTTP: baca, validasi, panggil service,
 * kirim. Logika domain di onboarding.service.ts, SQL di onboarding.queries.ts.
 */

const JENIS_SAH: JenisUsaha[] = ['makanan', 'minuman', 'sembako', 'jasa', 'lainnya'];

/** POST /onboarding/usaha — dua dari tiga pertanyaan onboarding. */
export async function simpanUsaha(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const nama = String(req.body?.nama_usaha ?? '').trim();
  const jenis = String(req.body?.jenis_usaha ?? '') as JenisUsaha;

  if (!nama) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Nama usahanya belum diisi.');
  }
  if (!JENIS_SAH.includes(jenis)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pilih dulu jenis usahanya.');
  }

  kirim(res, await perbaruiUsaha(userId, nama, jenis));
}

/**
 * POST /onboarding/resep
 *
 * ★ Endpoint terpenting di seluruh aplikasi. Di sinilah temuan pertama lahir —
 * momen yang membuat pengguna tidak menutup aplikasi, sebelum ia mencatat satu
 * transaksi pun. Lihat docs/07-alur-pengguna.md.
 *
 * Di onboarding, bahan WAJIB ada — tanpa bahan tidak ada modal, dan tanpa
 * modal tidak ada temuan. Modal dan margin dibaca dari view SQL. Aturan #1.
 */
export async function simpanResepOnboarding(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const namaProduk = String(req.body?.nama_produk ?? '').trim();
  const bahan = (req.body?.bahan ?? []) as BahanMasukan[];
  const hasilPerBatch = Number(req.body?.hasil_per_batch);
  const hargaJual = Number(req.body?.harga_jual);

  if (!namaProduk) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Nama produknya belum diisi.');
  }
  if (!Array.isArray(bahan) || bahan.length === 0) {
    throw new GalatTampil(
      KODE_GALAT.RESEP_BELUM_LENGKAP,
      'Bahannya belum diisi, jadi modal belum bisa dihitung.',
    );
  }
  if (!Number.isFinite(hasilPerBatch) || hasilPerBatch <= 0) {
    throw new GalatTampil(
      KODE_GALAT.RESEP_BELUM_LENGKAP,
      'Sekali bikin jadi berapa? Isinya harus lebih dari 0.',
    );
  }
  if (!Number.isFinite(hargaJual) || hargaJual < 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Harga jualnya belum benar.');
  }
  pastikanBahanLengkap(bahan);

  kirim(res, await buatProdukDenganResep(userId, namaProduk, hargaJual, hasilPerBatch, bahan), 201);
}
