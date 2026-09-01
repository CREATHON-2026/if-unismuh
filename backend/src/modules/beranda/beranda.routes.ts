import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim } from '../../lib/http.ts';
import type { Beranda } from '../../../../shared/types.ts';
import { ringkasanPenjualan, temuanProduk } from './beranda.queries.ts';

export const rutBeranda = Router();
rutBeranda.use(wajibLogin);

/**
 * GET /beranda?dari=&sampai= — fitur 7.
 *
 * Bawaan periodenya bulan berjalan. Pemilih tanggal adalah friksi untuk
 * pengguna 35–60 tahun, jadi parameternya ada tapi tidak wajib dipakai.
 *
 * Semua angka datang dari SQL. Route ini hanya merangkai dua hasil query.
 */
rutBeranda.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const dari = req.query.dari ? String(req.query.dari) : null;
  const sampai = req.query.sampai ? String(req.query.sampai) : null;

  const [jual, produk] = await Promise.all([
    ringkasanPenjualan(userId, dari, sampai),
    temuanProduk(userId),
  ]);

  const jawaban: Beranda = {
    omzet: jual?.omzet ?? 0,
    untung_bersih: jual?.untung_bersih ?? 0,
    ada_transaksi: (jual?.jumlah_baris ?? 0) > 0,
    baris_tanpa_modal: jual?.baris_tanpa_modal ?? 0,
    jumlah_produk_merugi: produk?.jumlah_produk_merugi ?? 0,
    produk_paling_merugi: produk?.nama != null && produk.margin_per_unit != null
      ? { nama: produk.nama, margin_per_unit: produk.margin_per_unit }
      : null,
  };

  kirim(res, jawaban);
}));
