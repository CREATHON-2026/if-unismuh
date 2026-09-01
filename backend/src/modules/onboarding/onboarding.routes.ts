import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BahanMasukan, type JenisUsaha } from '../../../../shared/types.ts';
import { simpanUsaha, simpanResep, ambilTemuanPertama } from './onboarding.queries.ts';

export const rutOnboarding = Router();
rutOnboarding.use(wajibLogin);

const JENIS_SAH: JenisUsaha[] = ['makanan', 'minuman', 'sembako', 'jasa', 'lainnya'];

/** POST /onboarding/usaha — dua dari tiga pertanyaan onboarding. */
rutOnboarding.post('/usaha', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const nama = String(req.body?.nama_usaha ?? '').trim();
  const jenis = String(req.body?.jenis_usaha ?? '') as JenisUsaha;

  if (!nama) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Nama usahanya belum diisi.');
  }
  if (!JENIS_SAH.includes(jenis)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pilih dulu jenis usahanya.');
  }

  kirim(res, await simpanUsaha(userId, nama, jenis));
}));

/**
 * POST /onboarding/resep
 *
 * ★ Endpoint terpenting di seluruh aplikasi. Di sinilah temuan pertama lahir —
 * momen yang membuat pengguna tidak menutup aplikasi, sebelum ia mencatat satu
 * transaksi pun. Lihat docs/07-alur-pengguna.md.
 *
 * Handler ini hanya memvalidasi masukan lalu memanggil query. Modal dan margin
 * TIDAK dihitung di sini maupun di berkas query — keduanya dibaca dari view
 * SQL. Aturan #1.
 */
rutOnboarding.post('/resep', jalur(async (req, res) => {
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

  const produkId = await simpanResep(userId, namaProduk, hargaJual, hasilPerBatch, bahan);
  kirim(res, await ambilTemuanPertama(produkId, userId), 201);
}));
