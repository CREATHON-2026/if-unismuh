import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { rapikanNomor, nomorValid, keInternasional } from '../../lib/nomor.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import { hubungkanWhatsapp, statusWhatsapp } from './wa.client.ts';

/**
 * Controller WhatsApp — lapisan HTTP di atas wa.client.ts (adapter Baileys,
 * HANYA MEMBACA). Tidak ada endpoint kirim, dan memang tidak boleh ada —
 * aturan #4.
 */

/**
 * GET /whatsapp/status
 *
 * Dipakai frontend untuk menampilkan keadaan sambungan dan QR kalau perlu
 * dipindai. `hanya_baca` selalu true — sistem tidak punya jalur mengirim.
 */
export async function status(_req: Request, res: Response): Promise<void> {
  kirim(res, statusWhatsapp());
}

/**
 * POST /whatsapp/hubungkan
 *
 * Dua cara menautkan:
 *
 *   { "nomor_hp": "081244085616" }  -> KODE PAIRING. Pengguna memasukkan 8
 *                                      digit di HP-nya. Berguna saat aplikasi
 *                                      dibuka di HP yang sama dengan akun
 *                                      WhatsApp-nya — layar sendiri tidak
 *                                      bisa dipindai
 *   {}                              -> QR. String mentahnya dikembalikan lewat
 *                                      GET /whatsapp/status untuk dirender
 *                                      aplikasi (juga tampil di terminal)
 *
 * Menyambungkan WhatsApp sifatnya OPSIONAL. Kalau tidak pernah dipanggil,
 * atau kalau sesinya putus, Pesanan Masuk tetap berfungsi penuh lewat tempel
 * manual di POST /pesanan/analisis.
 *
 * Kodenya tidak langsung ada — socket butuh beberapa detik untuk siap. Panggil
 * GET /whatsapp/status sesaat kemudian untuk mengambilnya.
 */
export async function hubungkan(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const nomorMentah = req.body?.nomor_hp ? String(req.body.nomor_hp) : null;

  if (nomorMentah !== null && !nomorValid(rapikanNomor(nomorMentah))) {
    throw new GalatTampil(
      KODE_GALAT.PERMINTAAN_TIDAK_VALID,
      'Nomor HP-nya belum benar. Contoh: 081234567890',
    );
  }

  await hubungkanWhatsapp(
    userId,
    nomorMentah ? keInternasional(nomorMentah) : undefined,
  );
  kirim(res, statusWhatsapp(), 202);
}
