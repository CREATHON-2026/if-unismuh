import { GalatTampil } from '../../lib/http.ts';
import { llmSiap } from '../../lib/llm.ts';
import { KODE_GALAT, type RiwayatTanyaRes, type TanyaRes } from '../../../../shared/types.ts';
import { ambilData, susunKonteks } from './tanya.konteks.ts';
import { jawabDalamCakupan } from './tanya.llm.ts';
import { riwayat, simpanGiliran } from './tanya.queries.ts';

/**
 * Alur chatbot, seluruhnya.
 *
 * baca data -> susun jadi teks -> panggil LLM -> simpan giliran -> kirim.
 *
 * Satu-satunya percabangan di tengahnya adalah GERBANG CAKUPAN. Versi
 * sebelumnya punya penggolong maksud, pengalih ke layar Catat, dan pemeriksa
 * angka yang menolak jawaban; semuanya dicabut, dan sempat digantikan asisten
 * yang benar-benar bebas menjawab apa saja.
 *
 * Kebebasan itu ditarik kembali sebagian: chatbot ini hanya menjawab soal usaha
 * pedagang sendiri dan cara memakai aplikasinya. Alasannya bukan kerapian —
 * asisten yang dengan senang hati menjawab "ibu kota Indonesia Jakarta" membuat
 * seluruh produk terbaca sebagai pembungkus ChatGPT, dan itu pertanyaan yang
 * akan diajukan juri. Yang dijual di sini adalah jawaban yang bersandar pada
 * catatan pedagang, bukan pengetahuan umum.
 *
 * Gerbangnya berlapis dua: model mengisi `dalam_cakupan`, dan service yang
 * menulis kalimat penolakannya. Lihat tanya.llm.ts.
 */

/** Delapan giliran = 16 baris. Cukup untuk "kalau yang tadi bagaimana?". */
const GILIRAN_DIINGAT = 8;
const BARIS_DIINGAT = GILIRAN_DIINGAT * 2;

/** Pertanyaan lebih panjang dari ini hampir pasti tempelan, bukan pertanyaan. */
const MAKS_HURUF = 2000;

/**
 * Jawaban untuk pertanyaan di luar cakupan.
 *
 * Ditulis di server, bukan diminta ke model, karena inilah yang membuat
 * gerbangnya berarti: model cukup memutuskan ya/tidak, dan kalimatnya tidak
 * pernah bergantung pada kedisiplinan model kecil yang sedang tergoda menjawab.
 *
 * Isinya menyebutkan apa yang bisa ditanyakan. Penolakan yang hanya berkata
 * "tidak bisa" memaksa pengguna menebak sendiri batasnya, dan pengguna kita
 * berumur 35-60 tahun dan baru pertama memakai chatbot.
 */
const DI_LUAR_CAKUPAN =
  'Maaf, saya hanya bisa menjawab soal usaha Bapak/Ibu sendiri — untung, modal, '
  + 'harga, produk, bahan, stok, penjualan, dan pesanan yang masuk. '
  + 'Coba tanyakan misalnya "bulan ini untung saya berapa?" atau '
  + '"produk mana yang merugi?".';

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

  const hasil = await jawabDalamCakupan(susunKonteks(data), sebelumnya, pertanyaan);

  // Kalimat penolakannya DITULIS DI SINI, bukan oleh model. Kalau gerbangnya
  // menutup, apa pun yang terlanjur disusun model dibuang dan tidak pernah
  // sampai ke layar — jadi satu kebocoran di sisi model tidak cukup untuk
  // membuat chatbot ini menjawab soal ibu kota.
  //
  // Penolakannya menyebutkan apa yang BISA ditanyakan. Menolak tanpa memberi
  // jalan adalah jalan buntu, dan pengguna kita tidak akan menebak sendiri
  // pertanyaan mana yang boleh.
  const jawaban = hasil.dalamCakupan && hasil.jawaban !== ''
    ? hasil.jawaban
    : DI_LUAR_CAKUPAN;

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
