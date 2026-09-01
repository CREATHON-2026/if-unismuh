import { MODE_DEMO, KODE_DEMO } from '../../config/env.ts';
import { buatToken } from '../../lib/token.ts';
import { GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type Pengguna } from '../../../../shared/types.ts';
import { cariPenggunaLewatNomor, buatPengguna, ambilPengguna } from './auth.queries.ts';

/**
 * Service auth — logika domain identitas, tanpa Express.
 *
 * Identitas = nomor HP + OTP. Tidak ada email, tidak ada password — aturan #3.
 */

export interface Sesi {
  token: string;
  /** Belum punya nama usaha = belum lewat onboarding. */
  pengguna_baru: boolean;
  pengguna: Pengguna;
}

/**
 * Kirim OTP ke nomor pedagang.
 *
 * Di mode demo tidak ada SMS yang benar-benar dikirim — kodenya selalu
 * KODE_DEMO, dan itu DISEBUTKAN TERUS TERANG di presentasi.
 * Lihat docs/08-keamanan-data.md.
 */
export function kirimOtp(): { terkirim: true; mode_demo: true } {
  if (!MODE_DEMO) {
    throw new GalatTampil(
      KODE_GALAT.GALAT_SERVER,
      'Pengiriman OTP belum tersambung ke gateway SMS.', 501,
    );
  }
  return { terkirim: true, mode_demo: true };
}

/**
 * Verifikasi OTP dan buka sesi.
 *
 * Nomor HP jadi identitas. Kalau nomornya belum pernah dipakai, penggunanya
 * dibuat di sini juga — tidak ada layar "daftar" yang terpisah, karena satu
 * layar tambahan di gerbang adalah satu alasan lagi untuk menyerah.
 */
export async function verifikasiOtp(nomor: string, kode: string): Promise<Sesi> {
  if (!(MODE_DEMO && kode === KODE_DEMO)) {
    throw new GalatTampil(KODE_GALAT.OTP_SALAH, 'Kodenya belum cocok. Coba periksa lagi.');
  }

  const pengguna = (await cariPenggunaLewatNomor(nomor)) ?? (await buatPengguna(nomor));

  return {
    token: buatToken(pengguna!.id),
    pengguna_baru: pengguna!.nama_usaha === null,
    pengguna: pengguna!,
  };
}

/**
 * Pulihkan DAN perpanjang sesi — dipanggil setiap aplikasi dibuka.
 *
 * Token baru dikembalikan tiap kali, jadi pedagang yang membuka aplikasi
 * seminggu sekali tidak pernah kehabisan sesi. Sesi pendek membunuh retensi —
 * lihat docs/08-keamanan-data.md.
 */
export async function pulihkanSesi(userId: number): Promise<Sesi> {
  const pengguna = await ambilPengguna(userId);

  if (!pengguna) {
    // Tokennya sah secara kriptografis tapi penggunanya sudah tidak ada.
    throw new GalatTampil(
      KODE_GALAT.TIDAK_TERAUTENTIKASI, 'Sesi sudah tidak berlaku, silakan masuk lagi.', 401,
    );
  }

  return {
    token: buatToken(pengguna.id),
    pengguna_baru: pengguna.nama_usaha === null,
    pengguna,
  };
}
