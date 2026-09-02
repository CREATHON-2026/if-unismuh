import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { GalatTampil, kirim } from '../../lib/http.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import type { CaraBayar, StatusPesanan } from '../../../../shared/types.ts';
import {
  ambilSatu, batalkan, bayar, buatPesananBaru, cekBayar, pilihanUntukPesan,
  riwayat, selesaikan, struk,
} from './proses.service.ts';

/**
 * Controller proses — lapisan HTTP: baca, validasi, panggil service, kirim.
 * Logika domain di proses.service.ts, SQL di proses.queries.ts.
 */

const CARA_SAH: CaraBayar[] = ['tunai', 'transfer', 'qris', 'nanti'];
const STATUS_SAH: StatusPesanan[] = ['menunggu_bayar', 'diproses', 'selesai', 'batal'];

/** Id yang bukan angka dijawab 404, bukan 400: hasilnya sama-sama tidak ada. */
function bacaId(nilai: unknown): number {
  const id = Number(nilai);
  if (!Number.isInteger(id) || id <= 0) {
    throw new GalatTampil(KODE_GALAT.PESANAN_TIDAK_DITEMUKAN, 'Pesanan tidak ditemukan.', 404);
  }
  return id;
}

/** POST /proses — ubah kesepakatan jadi pesanan bernomor. */
export async function buat(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;

  const pesanId = req.body?.pesan_id == null ? null : Number(req.body.pesan_id);
  const produkId = Number(req.body?.produk_id);
  const jumlah = Number(req.body?.jumlah);
  const hargaSatuan = Number(req.body?.harga_satuan);

  if (!Number.isInteger(produkId) || produkId <= 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Produknya belum dipilih.');
  }
  if (!Number.isFinite(jumlah) || jumlah <= 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Jumlahnya harus lebih dari 0.');
  }
  // Harga 0 SAH — itu cara mencatat pesanan gratis, dan pedagang memang
  // sesekali memberi. Yang tidak masuk akal cuma harga minus.
  if (!Number.isFinite(hargaSatuan) || hargaSatuan < 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Harganya belum benar.');
  }
  if (pesanId !== null && !Number.isInteger(pesanId)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pesan asalnya tidak terbaca.');
  }

  kirim(res, await buatPesananBaru(userId, pesanId, produkId, jumlah, Math.round(hargaSatuan)), 201);
}

/** GET /proses?status= — riwayat, semua status. */
export async function daftar(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const mentah = req.query.status ? String(req.query.status) : null;

  if (mentah !== null && !STATUS_SAH.includes(mentah as StatusPesanan)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Saringan statusnya tidak dikenal.');
  }
  kirim(res, await riwayat(userId, mentah as StatusPesanan | null));
}

/** GET /proses/:id */
export async function detail(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await ambilSatu(userId, bacaId(req.params.id)));
}

/** POST /proses/:id/bayar — langkah 1. Belum menyentuh buku besar. */
export async function catatBayar(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const cara = String(req.body?.cara ?? '') as CaraBayar;

  if (!CARA_SAH.includes(cara)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Cara bayarnya belum dipilih.');
  }
  kirim(res, await bayar(userId, bacaId(req.params.id), cara));
}

/** GET /proses/:id/bayar/status — polling Midtrans. */
export async function statusBayar(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await cekBayar(userId, bacaId(req.params.id)));
}

/** POST /proses/:id/selesai — langkah 2. Di sinilah untung naik. */
export async function tandaiSelesai(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await selesaikan(userId, bacaId(req.params.id)));
}

/** POST /proses/:id/batal */
export async function tandaiBatal(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const alasan = String(req.body?.alasan ?? '').trim();

  // Alasan WAJIB. Pesanan gagal tanpa sebab tidak mengajarkan apa pun; dengan
  // sebab, pedagang bisa melihat pola — kehabisan bahan, pembeli batal, salah
  // harga — dan itu justru bagian paling berguna dari riwayat kegagalan.
  if (!alasan) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Alasan batalnya belum diisi.');
  }
  kirim(res, await batalkan(userId, bacaId(req.params.id), alasan.slice(0, 200)));
}

/** GET /proses/:id/struk — TANPA modal dan untung. Pembeli ikut melihatnya. */
export async function cetakStruk(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await struk(userId, bacaId(req.params.id)));
}

/** GET /pesanan/:id/pilihan — isi bottom sheet. Dipasang di modul pesanan. */
export async function pilihan(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await pilihanUntukPesan(userId, bacaId(req.params.id)));
}
