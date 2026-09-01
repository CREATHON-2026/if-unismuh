import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BarisKonfirmasi } from '../../../../shared/types.ts';
import {
  usulanEkstraksiDariTeks, hitungPratinjau, konfirmasiEkstraksi,
} from './ekstraksi.service.ts';

/**
 * Controller ekstraksi — lapisan HTTP: baca, validasi, panggil service,
 * kirim. Logika domain di ekstraksi.service.ts, SQL di ekstraksi.queries.ts.
 */

/** Validasi bentuk baris dari layar konfirmasi — satu bentuk untuk semua
 *  jalan masuk (foto, suara, ketik). */
function bacaBarisKonfirmasi(mentah: unknown): BarisKonfirmasi[] {
  if (!Array.isArray(mentah) || mentah.length === 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada baris yang dikirim.');
  }
  return mentah.map((b, i) => {
    const jumlah = Number(b?.jumlah);
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Jumlahnya harus lebih dari 0.');
    }
    return {
      urutan: Number.isInteger(Number(b?.urutan)) ? Number(b.urutan) : i + 1,
      produk_id: b?.produk_id == null ? null : Number(b.produk_id),
      jumlah,
      harga_satuan: b?.harga_satuan == null ? null : Number(b.harga_satuan),
      tanggal: b?.tanggal ? String(b.tanggal) : null,
    };
  });
}

/**
 * POST /ekstraksi/dari-teks
 *
 * ★ TIDAK MENYIMPAN KE `transaksi` — hasil AI mendarat di tabel `ekstraksi`
 * berstatus `menunggu` (aturan #2). Alurnya di ekstraksi.service.ts.
 */
export async function dariTeks(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada yang diucapkan atau diketik.');
  }

  kirim(res, await usulanEkstraksiDariTeks(userId, teks));
}

/**
 * POST /ekstraksi/pratinjau — hitung ulang subtotal saat baris disunting.
 * Aturan #7: frontend tidak pernah mengalikan sendiri.
 */
export async function pratinjau(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const baris = bacaBarisKonfirmasi(req.body?.baris);
  kirim(res, await hitungPratinjau(userId, baris));
}

/**
 * POST /ekstraksi/konfirmasi — satu-satunya jalan hasil AI masuk ke
 * `transaksi`. Foto mentahnya dihapus di sini: buku catatan berisi data usaha
 * yang sensitif, dan setelah hasilnya terstruktur, gambarnya tidak punya
 * alasan untuk disimpan.
 */
export async function konfirmasi(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const ekstraksiId = Number(req.body?.ekstraksi_id);
  const baris = bacaBarisKonfirmasi(req.body?.baris);

  if (!Number.isInteger(ekstraksiId)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Ekstraksinya tidak dikenali.');
  }

  const tersimpan = await konfirmasiEkstraksi(userId, ekstraksiId, baris);
  kirim(res, { tersimpan, berkas_dihapus: true }, 201);
}
