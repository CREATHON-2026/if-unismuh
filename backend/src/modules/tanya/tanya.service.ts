import { GalatTampil } from '../../lib/http.ts';
import { llmSiap } from '../../lib/llm.ts';
import { KODE_GALAT, type RiwayatTanyaRes, type TanyaRes } from '../../../../shared/types.ts';
import { ambilData, susunKonteks } from './tanya.konteks.ts';
import { jawabBebas } from './tanya.llm.ts';
import { riwayat, simpanGiliran } from './tanya.queries.ts';

/**
 * Alur chatbot, seluruhnya.
 *
 * baca data -> susun jadi teks -> panggil LLM -> simpan giliran -> kirim.
 *
 * Tidak ada percabangan di tengahnya. Versi sebelumnya punya penggolong
 * maksud, pengalih ke layar Catat, dan pemeriksa angka yang menolak jawaban;
 * semuanya dicabut. Model sekarang menjawab apa pun dengan caranya sendiri,
 * dan yang kita kerjakan tinggal menyiapkan bahan sebaik mungkin.
 */

/** Delapan giliran = 16 baris. Cukup untuk "kalau yang tadi bagaimana?". */
const GILIRAN_DIINGAT = 8;
const BARIS_DIINGAT = GILIRAN_DIINGAT * 2;

/** Pertanyaan lebih panjang dari ini hampir pasti tempelan, bukan pertanyaan. */
const MAKS_HURUF = 2000;

export async function jawabPertanyaan(
  userId: number, pertanyaanMentah: string,
): Promise<TanyaRes> {
  const pertanyaan = pertanyaanMentah.trim().slice(0, MAKS_HURUF);
  if (pertanyaan.length === 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pertanyaannya belum terisi.');
  }

  if (!llmSiap()) {
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Asistennya sedang tidak bisa dihubungi. Coba lagi sebentar lagi.',
      503,
    );
  }

  const [data, sebelumnya] = await Promise.all([
    ambilData(userId),
    riwayat(userId, BARIS_DIINGAT),
  ]);

  const jawaban = await jawabBebas(susunKonteks(data), sebelumnya, pertanyaan);

  // Disimpan setelah jawabannya jadi, bukan sebelum: giliran yang gagal di
  // tengah jalan tidak pantas ikut jadi ingatan percakapan berikutnya.
  await simpanGiliran(userId, pertanyaan, jawaban, BARIS_DIINGAT);

  return { jawaban };
}

/**
 * Percakapan yang MASIH DIINGAT server, siap ditampilkan layar.
 *
 * Batasnya sengaja sama dengan yang dipakai `jawabPertanyaan` sebagai konteks
 * (`BARIS_DIINGAT`). Kalau layar menampilkan lebih banyak daripada yang diingat
 * model, pengguna akan merujuk giliran lama yang sebenarnya sudah dilupakan —
 * dan jawabannya terasa seperti model yang tiba-tiba pikun.
 */
export async function ambilRiwayat(userId: number): Promise<RiwayatTanyaRes> {
  return { giliran: await riwayat(userId, BARIS_DIINGAT) };
}
