import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BarisStok } from '../../../../shared/types.ts';
import { daftarStok, simpanStok, BahanTidakSah } from './stok.queries.ts';

export const rutStok = Router();
rutStok.use(wajibLogin);

/**
 * GET /stok — fitur 12.
 *
 * Bahan yang belum pernah dicatat tampil dengan `jumlah: null`, bukan 0.
 * Frontend harus menampilkannya sebagai "belum dicatat", bukan "habis".
 */
rutStok.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await daftarStok(userId));
}));

/**
 * POST /stok — catat stok beberapa bahan sekaligus.
 *
 * Inilah yang menghidupkan peringatan "Bahan hanya cukup untuk 14 dari 20
 * yang dipesan" di layar Pesanan Masuk. Sebelum ada endpoint ini, jawabannya
 * selalu "stok belum dicatat".
 */
rutStok.post('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const baris = req.body?.baris as BarisStok[] | undefined;

  if (!Array.isArray(baris) || baris.length === 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada stok yang dicatat.');
  }
  for (const b of baris) {
    if (!Number.isInteger(Number(b?.bahan_id))) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Ada baris yang bahannya belum dipilih.');
    }
    if (!(Number(b.jumlah) >= 0)) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Jumlah stok tidak boleh minus.');
    }
  }

  try {
    kirim(res, { tersimpan: await simpanStok(userId, baris) }, 201);
  } catch (err) {
    if (err instanceof BahanTidakSah) {
      throw new GalatTampil(
        KODE_GALAT.PERMINTAAN_TIDAK_VALID,
        'Ada bahan yang tidak dikenali. Tidak ada stok yang tersimpan.',
      );
    }
    throw err;
  }
}));
