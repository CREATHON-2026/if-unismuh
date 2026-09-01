import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BalasanReq, type BalasanRes } from '../../../../shared/types.ts';
import { prosesPesan } from './pesanan.proses.ts';
import { daftarPesan, hitungPesanan } from './pesanan.queries.ts';
import { susunBalasan } from './pesanan.balasan.ts';

export const rutPesanan = Router();
rutPesanan.use(wajibLogin);

/**
 * POST /pesanan/analisis
 *
 * Menerima teks yang DITEMPEL pedagang dari chat pembeli. Sistem membaca,
 * mengklasifikasi, mengecek margin dan stok, lalu memberi peringatan.
 *
 * Sistem TIDAK PERNAH mengirim apa pun ke nomor pembeli — aturan #4.
 */
rutPesanan.post('/analisis', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Teks pesanannya belum ditempel.');
  }

  kirim(res, await prosesPesan(userId, teks, 'tempel'), 201);
}));

/** GET /pesanan — daftar pesanan masuk terbaru. */
rutPesanan.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await daftarPesan(userId));
}));

const MAKSUD_SAH: BalasanReq['maksud'][] = ['tawar_harga', 'terima', 'tolak', 'jawab_harga'];

/**
 * POST /pesanan/balasan
 *
 * Menyiapkan kalimat balasan untuk DISALIN pedagang sendiri. Ini penutup alur
 * Pesanan Masuk — dan momen yang memperlihatkan bahwa pedagang yang memegang
 * kendali, bukan sistem.
 *
 * Sistem TIDAK PERNAH mengirim apa pun ke nomor pembeli — aturan #4. Tidak ada
 * jalur kirim di seluruh backend, dan itu diverifikasi di setiap uji.
 */
rutPesanan.post('/balasan', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const maksud = String(req.body?.maksud ?? '') as BalasanReq['maksud'];
  const produkId = Number(req.body?.produk_id);
  const jumlah = req.body?.jumlah != null ? Number(req.body.jumlah) : null;
  const hargaDiminta = req.body?.harga_diminta != null ? Number(req.body.harga_diminta) : null;

  if (!MAKSUD_SAH.includes(maksud)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Maksud balasannya belum dipilih.');
  }
  if (!Number.isInteger(produkId)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Produknya belum dipilih.');
  }

  // Angka dihitung SQL LEBIH DULU, lalu disodorkan ke LLM sebagai fakta.
  // Query menyertakan user_id, jadi produk pedagang lain tidak akan ketemu.
  const h = await hitungPesanan(produkId, userId, jumlah, hargaDiminta);
  if (!h) {
    throw new GalatTampil(KODE_GALAT.PRODUK_TIDAK_DITEMUKAN, 'Produk tidak ditemukan.', 404);
  }

  let teks: string;
  try {
    teks = await susunBalasan(h, { maksud, produk_id: produkId, jumlah: jumlah ?? undefined, harga_diminta: hargaDiminta ?? undefined });
  } catch (err) {
    console.error('[susun balasan gagal]', err);
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Balasannya belum bisa disusun. Coba lagi, atau tulis sendiri.', 502,
    );
  }

  // `acuan` disertakan supaya angka di kalimat bisa dicocokkan dengan angka
  // dari SQL. Kalau berbeda, berarti model mengarang — dan itu kegagalan.
  const jawaban: BalasanRes = {
    teks,
    acuan: {
      nama: h.nama,
      modal_per_unit: h.modal_per_unit,
      harga_jual: h.harga_jual,
      harga_diminta: hargaDiminta,
      jumlah,
      untung_pesanan: h.untung_pesanan,
      merugi: h.merugi,
    },
  };
  kirim(res, jawaban);
}));
