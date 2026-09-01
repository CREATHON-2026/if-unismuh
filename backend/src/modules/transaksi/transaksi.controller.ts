import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BarisTransaksi } from '../../../../shared/types.ts';
import {
  catatTransaksi, ambilDaftarTransaksi, usulkanTransaksiDariTeks,
} from './transaksi.service.ts';

/**
 * Controller transaksi — lapisan HTTP: baca, validasi, panggil service,
 * kirim. Logika domain di transaksi.service.ts, SQL di transaksi.queries.ts.
 */

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function bacaTanggal(mentah: unknown): string | null {
  const tanggal = mentah ? String(mentah) : null;
  if (tanggal !== null && !TANGGAL.test(tanggal)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Tanggalnya belum benar.');
  }
  return tanggal;
}

/**
 * POST /transaksi — fitur 3, ketik manual.
 *
 * TIDAK lewat layar konfirmasi: aturan #2 mengatur hasil AI, sedangkan yang
 * diketik manusia sudah dikonfirmasi saat diketik. Ini juga lantai dasar yang
 * menahan semuanya — kalau foto dan suara gagal, jalur ini yang membuat
 * aplikasi tetap berguna.
 */
export async function simpanTransaksiManual(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const tanggal = bacaTanggal(req.body?.tanggal);
  const baris = req.body?.baris as BarisTransaksi[] | undefined;

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

  kirim(res, { tersimpan: await catatTransaksi(userId, tanggal, baris) }, 201);
}

/** GET /transaksi?dari=&sampai= — bawaan: bulan berjalan. */
export async function daftarTransaksiPeriode(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const dari = req.query.dari ? String(req.query.dari) : null;
  const sampai = req.query.sampai ? String(req.query.sampai) : null;
  kirim(res, await ambilDaftarTransaksi(userId, dari, sampai));
}

/**
 * POST /transaksi/dari-teks — fitur 2, dan ketikan bebas.
 *
 * ★ TIDAK MENYIMPAN APA PUN — hasil AI wajib lewat layar konfirmasi manusia
 * dulu (aturan #2). Penjelasan alurnya di transaksi.service.ts.
 */
export async function usulanDariTeks(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();
  const tanggal = bacaTanggal(req.body?.tanggal);

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada yang diucapkan atau diketik.');
  }

  kirim(res, await usulkanTransaksiDariTeks(userId, teks, tanggal));
}
