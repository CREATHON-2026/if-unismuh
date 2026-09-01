import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BarisStok } from '../../../../shared/types.ts';
import { ambilDaftarStok, catatStok } from './stok.service.ts';

/**
 * Controller stok — lapisan HTTP: baca, validasi, panggil service, kirim.
 * Logika domain di stok.service.ts, SQL di stok.queries.ts.
 */

/** GET /stok — fitur 12. */
export async function daftarStok(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await ambilDaftarStok(userId));
}

/**
 * POST /stok — catat stok beberapa bahan sekaligus.
 *
 * Inilah yang menghidupkan peringatan "Bahan hanya cukup untuk 14 dari 20
 * yang dipesan" di layar Pesanan Masuk.
 */
export async function simpanStok(req: Request, res: Response): Promise<void> {
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

  kirim(res, { tersimpan: await catatStok(userId, baris) }, 201);
}
