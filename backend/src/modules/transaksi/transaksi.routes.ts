import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BarisTransaksi } from '../../../../shared/types.ts';
import { simpanTransaksi, daftarTransaksi, ProdukTidakSah } from './transaksi.queries.ts';

export const rutTransaksi = Router();
rutTransaksi.use(wajibLogin);

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /transaksi — fitur 3, ketik manual.
 *
 * Menerima banyak baris sekaligus. TIDAK lewat layar konfirmasi: aturan #2
 * mengatur hasil AI, sedangkan yang diketik manusia sudah dikonfirmasi saat
 * diketik.
 *
 * Ini juga lantai dasar yang menahan semuanya — kalau foto dan suara gagal,
 * jalur ini yang membuat aplikasi tetap berguna.
 */
rutTransaksi.post('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const tanggal = req.body?.tanggal ? String(req.body.tanggal) : null;
  const baris = req.body?.baris as BarisTransaksi[] | undefined;

  if (tanggal !== null && !TANGGAL.test(tanggal)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Tanggalnya belum benar.');
  }
  if (!Array.isArray(baris) || baris.length === 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada penjualan yang dicatat.');
  }

  for (const b of baris) {
    if (!Number.isInteger(Number(b?.produk_id))) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Ada baris yang produknya belum dipilih.');
    }
    if (!(Number(b.jumlah) > 0)) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Jumlahnya harus lebih dari 0.');
    }
    if (b.harga_satuan !== undefined && !(Number(b.harga_satuan) >= 0)) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Harganya belum benar.');
    }
  }

  try {
    const tersimpan = await simpanTransaksi(userId, tanggal, baris);
    kirim(res, { tersimpan }, 201);
  } catch (err) {
    if (err instanceof ProdukTidakSah) {
      // Seluruh batch dibatalkan — tidak ada satu baris pun yang tersimpan.
      throw new GalatTampil(
        KODE_GALAT.PRODUK_TIDAK_DITEMUKAN,
        'Ada produk yang tidak dikenali. Tidak ada penjualan yang tersimpan.',
      );
    }
    throw err;
  }
}));

/** GET /transaksi?dari=&sampai= — bawaan: bulan berjalan. */
rutTransaksi.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const dari = req.query.dari ? String(req.query.dari) : null;
  const sampai = req.query.sampai ? String(req.query.sampai) : null;
  kirim(res, await daftarTransaksi(userId, dari, sampai));
}));
