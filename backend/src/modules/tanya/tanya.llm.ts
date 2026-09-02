import { mintaJson } from '../../lib/llm.ts';
import type { GiliranPercakapan } from './tanya.types.ts';

/**
 * Satu panggilan LLM, dengan SATU gerbang: pertanyaannya soal usaha atau bukan.
 *
 * Model mengembalikan dua medan — `dalam_cakupan` dan `jawaban` — dan itu
 * disengaja. Menyuruh model "tolak pertanyaan di luar topik" lewat kalimat
 * biasa tidak cukup: model kecil tetap tergoda menjawab "ibu kota Indonesia
 * Jakarta" karena menjawab lebih mudah daripada menahan diri.
 *
 * Dengan medan terpisah, keputusannya jadi penilaian ya/tidak yang jauh lebih
 * mudah, dan KALIMAT PENOLAKANNYA MILIK SERVER — lihat tanya.service.ts. Kalau
 * `dalam_cakupan` bernilai false, apa pun yang terlanjur ditulis model dibuang
 * dan tidak pernah sampai ke layar. Jadi kebocoran satu lapis tidak cukup untuk
 * membuat chatbot ini menjawab soal ibu kota.
 *
 * Yang tetap dipertahankan dari versi bebas sebelumnya: jangan mengarang
 * catatan yang tidak ada. Asisten yang menyebut angka penjualan yang tidak
 * pernah terjadi lebih buruk daripada asisten yang bilang "belum ada
 * catatannya".
 */

/**
 * Bentuk jawaban model. `jawaban` WAJIB kosong saat di luar cakupan — supaya
 * secara struktur tidak ada kalimat di luar topik yang bisa lolos.
 */
const SKEMA = {
  type: 'object',
  properties: {
    dalam_cakupan: {
      type: 'boolean',
      description: 'true kalau pertanyaannya soal usaha pedagang ini atau cara memakai aplikasinya.',
    },
    jawaban: {
      type: 'string',
      description: 'Jawabannya. Kosongkan kalau dalam_cakupan false.',
    },
  },
  required: ['dalam_cakupan', 'jawaban'],
} as const;

const CAKUPAN = `# YANG BOLEH KAMU JAWAB

Kamu HANYA menjawab soal usaha pedagang ini dan cara memakai aplikasi lapakAi.
Semua bahannya ada di catatan di bawah.

Yang termasuk cakupan (dalam_cakupan = true):
- untung, modal, harga jual, margin, produk yang merugi
- penjualan, uang masuk, produk terlaris, tren harian
- bahan, resep, stok, kapasitas produksi
- pesanan masuk, pembeli, balasan untuk pembeli
- pengandaian ATAS DATA INI, mis. "kalau kripik saya jual 25 ribu untungnya berapa?"
- saran dagang atas catatan ini, mis. "produk mana yang sebaiknya saya hentikan?"
- cara memakai aplikasi ini, mis. "bagaimana cara mencatat penjualan?"

Yang DI LUAR cakupan (dalam_cakupan = false):
- pengetahuan umum apa pun — ibu kota, sejarah, tokoh, cuaca, olahraga, agama
- politik, berita, hiburan, matematika umum, terjemahan
- resep masakan atau cara membuat sesuatu secara umum
- pertanyaan tentang dirimu sendiri, model AI, atau siapa yang membuatmu
- kode, teknologi, atau hal lain yang tidak ada hubungannya dengan warung ini

Aturan gerbangnya:
1. Kalau ragu apakah pertanyaannya soal usaha ini, isi false. Menolak dengan
   sopan jauh lebih murah daripada menjawab hal yang bukan urusan kita.
2. Kalau dalam_cakupan false, KOSONGKAN jawaban. Jangan menulis penolakan
   sendiri — aplikasi punya kalimatnya. Jangan menulis jawaban "sedikit saja".
3. Pertanyaan yang menyebut usaha ini tapi jawabannya butuh pengetahuan umum
   tetap false. Contoh: "kripik pisang asalnya dari daerah mana?"`

const TUGAS = `Kamu adalah asisten lapakAi. Kamu membantu pemilik usaha kecil di
Indonesia memahami usahanya sendiri, dan HANYA itu.

Di dalam cakupan, kamu bebas: boleh berhitung, memperkirakan, membandingkan,
memberi saran, dan berpendapat. Di luar cakupan, kamu tidak menjawab sama
sekali.

Jangan mengarang catatan yang tidak ada. Kalau sesuatu belum dicatat pedagang,
katakan apa adanya bahwa belum ada catatannya, lalu sebutkan apa yang perlu
dicatat supaya bisa dijawab. Itu tetap dalam cakupan.

Satu petunjuk berhitung: untung per unit itu harga jual dikurangi MODAL per
unit. Jadi kalau pedagang bertanya "kalau saya jual sekian", kurangi harga
barunya dengan modal per unit — bukan dengan untung yang sekarang.`

const GAYA = `Cara bicara:
- Bahasa Indonesia sehari-hari. Pedagang yang membaca berumur 35-60 tahun dan
  tidak akrab dengan istilah teknis. Hindari kata seperti "margin", "revenue",
  "profit", "cash flow" — pakai "untung", "uang masuk", "modal".
- Ringkas. Dua sampai lima kalimat untuk pertanyaan biasa. Boleh lebih panjang
  kalau memang perlu penjelasan bertahap, dan boleh memakai daftar berpoin.
- Tulis rupiah dengan titik ribuan: Rp 21.200, bukan Rp21200 atau 21200 rupiah.
- Sapa dengan "Bapak/Ibu" bila perlu, jangan berlebihan.
- Jangan menyebut "database", "SQL", "sistem", atau "data di atas". Bicaralah
  seperti orang yang memang tahu isi warungnya.`;

function tulisRiwayat(riwayat: GiliranPercakapan[]): string {
  if (riwayat.length === 0) return '';
  const baris = riwayat.map(
    (g) => `${g.peran === 'pedagang' ? 'Pedagang' : 'Kamu'}: ${g.teks}`,
  );
  return `\n# PERCAKAPAN SEBELUMNYA\n${baris.join('\n')}\n`;
}

/**
 * Membersihkan kebiasaan model kecil yang mengganggu: membungkus jawaban dalam
 * blok kode, atau membuka dengan "Jawaban:". Isi jawabannya tidak disentuh.
 */
function rapikan(teks: string): string {
  let hasil = teks.trim();
  hasil = hasil.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
  hasil = hasil.replace(/^(jawaban|asisten|kamu)\s*:\s*/i, '');
  return hasil.trim();
}

/**
 * Batas panjang jawaban, jendela konteks, dan kelonggaran gaya.
 *
 * `num_predict` 600 kira-kira 400 kata — jauh di atas jawaban terpanjang yang
 * masuk akal di layar HP, tapi cukup rendah untuk memutus pengulangan yang
 * tidak berhenti sendiri. Tanpa batas ini satu pertanyaan pernah menggantung
 * sampai socketnya diputus, dan gejalanya ECONNRESET tanpa galat apa pun.
 *
 * `num_ctx` disebut eksplisit karena prompt di sini jauh lebih panjang
 * daripada prompt modul lain: seluruh catatan pedagang ikut masuk. Kalau
 * promptnya melewati jendela bawaan Ollama, yang terpotong adalah bagian
 * PALING AWAL — yaitu instruksinya — dan modelnya balas dengan teks kosong
 * tanpa mengeluh. Kegagalan yang paling mahal adalah yang tidak berbunyi.
 *
 * `temperature` 0.4, bukan 0. Suhu nol tepat untuk mengekstrak data, tapi
 * untuk percakapan ia menghasilkan kalimat kaku dan memperbesar peluang model
 * tersangkut mengulang frasa yang sama.
 */
const OPSI = { num_predict: 600, num_ctx: 8192, temperature: 0.4 } as const;

export interface HasilTanya {
  dalamCakupan: boolean;
  /** Kosong kalau di luar cakupan — kalimat penolakannya milik service. */
  jawaban: string;
}

export async function jawabDalamCakupan(
  konteks: string, riwayat: GiliranPercakapan[], pertanyaan: string,
): Promise<HasilTanya> {
  const prompt = `${TUGAS}

${CAKUPAN}

${GAYA}

# CATATAN USAHA PEDAGANG INI
Semua angka di bawah dalam rupiah. Angka ditulis polos tanpa titik ribuan;
kamu yang merapikannya saat menjawab.

${konteks}
${tulisRiwayat(riwayat)}
# PERTANYAAN PEDAGANG
${pertanyaan}

Tentukan dulu dalam_cakupan. Kalau true, jawab langsung tanpa pengantar dan
tanpa menyebut bahwa kamu membaca catatan. Kalau false, kosongkan jawaban.`;

  const hasil = await mintaJson<Partial<HasilTanyaMentah>>(prompt, SKEMA, OPSI);

  // Model kecil kadang mengembalikan string "false"/"true" alih-alih boolean,
  // dan kadang melewatkan medannya sama sekali. Yang tidak bisa dibaca sebagai
  // "ya, ini soal usaha" diperlakukan sebagai DI LUAR cakupan — gerbang yang
  // gagal harus gagal ke arah menolak, bukan ke arah menjawab.
  const dalamCakupan = hasil.dalam_cakupan === true || hasil.dalam_cakupan === 'true';
  return {
    dalamCakupan,
    jawaban: dalamCakupan ? rapikan(String(hasil.jawaban ?? '')) : '',
  };
}

interface HasilTanyaMentah {
  dalam_cakupan: boolean | string;
  jawaban: string;
}
