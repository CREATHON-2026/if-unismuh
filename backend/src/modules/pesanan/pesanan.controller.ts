import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type BalasanReq } from '../../../../shared/types.ts';
import {
  prosesPesan, buatBalasan, ambilDaftarPesan, suntingBalasan, kirimBalasan,
} from './pesanan.service.ts';

/**
 * Controller Pesanan Masuk — lapisan HTTP.
 *
 * Tugasnya TIGA saja: membaca permintaan, memvalidasi bentuknya, memanggil
 * service, lalu mengirim jawaban. Logika domain hidup di pesanan.service.ts;
 * SQL di pesanan.queries.ts. Kalau sebuah fungsi di sini mulai berisi
 * keputusan bisnis, ia salah tempat.
 */

/**
 * POST /pesanan/analisis
 *
 * Menerima teks yang DITEMPEL pedagang dari chat pembeli. Sistem membaca,
 * mengklasifikasi, mengecek margin dan stok, lalu memberi peringatan.
 *
 * Sistem TIDAK PERNAH mengirim apa pun ke nomor pembeli — aturan #4.
 */
export async function analisisPesanan(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Teks pesanannya belum ditempel.');
  }

  kirim(res, await prosesPesan(userId, teks, 'tempel'), 201);
}

/** GET /pesanan — daftar pesanan masuk terbaru. */
export async function daftarPesanan(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await ambilDaftarPesan(userId));
}

const MAKSUD_SAH: BalasanReq['maksud'][] = ['tawar_harga', 'terima', 'tolak', 'jawab_harga'];

/**
 * POST /pesanan/balasan
 *
 * Menyiapkan kalimat balasan untuk DISALIN pedagang sendiri. Angka dihitung
 * SQL lebih dulu di service, lalu disodorkan ke LLM sebagai fakta — aturan #1
 * dan #4.
 */
export async function balasanPesanan(req: Request, res: Response): Promise<void> {
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

  kirim(res, await buatBalasan(userId, {
    maksud,
    produk_id: produkId,
    jumlah: jumlah ?? undefined,
    harga_diminta: hargaDiminta ?? undefined,
  }));
}

/**
 * PATCH /pesanan/:id/balasan
 *
 * Pedagang memperbaiki kalimat draf sebelum mengirimnya. Ini bukan tambahan
 * kenyamanan: aturan #2 menuntut manusia MELIHAT hasil AI, dan melihat tanpa
 * bisa memperbaiki hanya setengah janji.
 */
export async function ubahBalasan(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const id = Number(req.params.id);
  const teks = String(req.body?.teks ?? '').trim();

  if (!Number.isInteger(id)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pesan tidak dikenali.');
  }
  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Balasannya masih kosong.');
  }

  await suntingBalasan(userId, id, teks);
  kirim(res, { ok: true });
}

/**
 * POST /pesanan/:id/kirim-balasan
 *
 * SATU-SATUNYA jalur pengiriman ke nomor pembeli di seluruh aplikasi, dan ia
 * hanya bisa dicapai oleh tombol yang ditekan pedagang. Tidak ada penjadwal
 * dan tidak ada pemanggil otomatis — lihat aturan #4 di CLAUDE.md, yang
 * ditulis ulang saat fitur ini dibangun.
 */
export async function kirimBalasanPesan(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pesan tidak dikenali.');
  }

  await kirimBalasan(userId, id);
  kirim(res, { terkirim: true });
}
