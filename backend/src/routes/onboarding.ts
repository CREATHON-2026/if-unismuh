import { Router } from 'express';
import { satu, transaksiDb } from '../db.ts';
import { wajibLogin, type ReqBerpengguna } from '../auth.ts';
import { jalur, kirim, GalatTampil } from '../http.ts';
import { KODE_GALAT, type BahanMasukan, type JenisUsaha } from '../../../shared/types.ts';

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

  const pengguna = await satu(
    `UPDATE pengguna SET nama_usaha = $2, jenis_usaha = $3
     WHERE id = $1
     RETURNING id, nomor_hp, nama_usaha, jenis_usaha`,
    [userId, nama, jenis],
  );
  kirim(res, pengguna);
}));

/**
 * POST /onboarding/resep
 *
 * ★ Endpoint terpenting di seluruh aplikasi. Di sinilah temuan pertama lahir —
 * momen yang membuat pengguna tidak menutup aplikasi, sebelum ia mencatat satu
 * transaksi pun. Lihat docs/07-alur-pengguna.md.
 *
 * Perhatikan: backend TIDAK menghitung modal di JavaScript. Ia menulis bahan,
 * produk, dan resep, lalu MEMBACA hasilnya dari view v_margin_produk. Semua
 * aritmetika hidup di SQL — aturan #1.
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
    throw new GalatTampil(KODE_GALAT.RESEP_BELUM_LENGKAP, 'Bahannya belum diisi, jadi modal belum bisa dihitung.');
  }
  if (!Number.isFinite(hasilPerBatch) || hasilPerBatch <= 0) {
    throw new GalatTampil(KODE_GALAT.RESEP_BELUM_LENGKAP, 'Sekali bikin jadi berapa? Isinya harus lebih dari 0.');
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

  const produkId = await transaksiDb(async (c) => {
    const { rows: [produk] } = await c.query(
      `INSERT INTO produk (user_id, nama, harga_jual, hasil_per_batch)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, namaProduk, Math.round(hargaJual), hasilPerBatch],
    );

    for (const b of bahan) {
      // Pakai bahan yang sudah ada kalau namanya sama, supaya harga bahan
      // tidak terpecah jadi beberapa baris yang bisa berbeda nilainya.
      const { rows: [ada] } = await c.query(
        'SELECT id FROM bahan WHERE user_id = $1 AND lower(nama) = lower($2) LIMIT 1',
        [userId, b.nama.trim()],
      );
      const bahanId = ada
        ? ada.id
        : (await c.query(
            `INSERT INTO bahan (user_id, nama, satuan, harga_beli, jumlah_beli)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [userId, b.nama.trim(), b.satuan ?? 'buah', Math.round(Number(b.harga_beli)), Number(b.jumlah_beli)],
          )).rows[0].id;

      await c.query(
        `INSERT INTO resep (produk_id, bahan_id, jumlah_pakai) VALUES ($1, $2, $3)
         ON CONFLICT (produk_id, bahan_id) DO UPDATE SET jumlah_pakai = EXCLUDED.jumlah_pakai`,
        [produk.id, bahanId, Number(b.jumlah)],
      );
    }
    return produk.id as number;
  });

  // Angka datang dari SQL, bukan dihitung di sini.
  const hasil = await satu(
    `SELECT produk_id, nama, modal_per_unit, harga_jual, margin_per_unit, merugi
     FROM v_margin_produk WHERE produk_id = $1 AND user_id = $2`,
    [produkId, userId],
  );

  kirim(res, hasil, 201);
}));
