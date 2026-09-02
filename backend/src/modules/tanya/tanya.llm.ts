import { mintaJson, kosongJadiNull, tanggalSah } from '../../lib/llm.ts';
import type { Lembar } from './tanya.fakta.ts';
import {
  HITUNG, type GiliranPercakapan, type HasilTanya, type JenisHitung, type PermintaanHitung,
} from './tanya.types.ts';

/**
 * Lapisan LLM chatbot.
 *
 * Model di sini BEBAS menjawab apa saja — menjelaskan, menafsirkan, menyarankan
 * — selama semua yang menyangkut usaha pedagang bersandar pada lembar fakta
 * yang sudah dihitung SQL. Satu kalimat memisahkan yang boleh dari yang tidak:
 *
 *   Model boleh memilih angka mana yang relevan dan apa artinya.
 *   Model tidak boleh menghasilkan angka.
 *
 * "Kripik pisang rugi Rp 1.200 tiap terjual, dan itu justru produk paling laku
 * Bapak" adalah penafsiran — semua angkanya sudah ada sebelum model dipanggil.
 * "Kalau dinaikkan jadi 25.000 untungnya Rp 3.800" adalah perhitungan, dan
 * angka itu tidak ada sebelumnya. Yang kedua harus lewat `minta_hitung`, yang
 * dijalankan SQL. Aturan #1 di CLAUDE.md.
 *
 * Model diminta MENYALIN tulisan rupiah dari lembar fakta, bukan mengetik ulang
 * angkanya. Itu yang membuat penjaga rupiah di tanya.service.ts bisa
 * mencocokkan tiap "Rp ..." di jawaban dengan padanan persis.
 */

const TIDAK = 'tidak';

const SKEMA = {
  type: 'object',
  properties: {
    jawaban: {
      type: 'string',
      description: 'Jawaban untuk pedagang, bahasa Indonesia sehari-hari. Kosongkan kalau minta_hitung diisi.',
    },
    kunci_dipakai: {
      type: 'array',
      items: { type: 'string' },
      description: 'Nama kunci dari LEMBAR FAKTA yang benar-benar dipakai di jawaban.',
    },
    di_luar_cakupan: {
      type: 'boolean',
      description: 'true kalau pertanyaannya bukan soal usaha pedagang ini dan bukan soal aplikasi ini.',
    },
    lapor_penjualan: {
      type: 'boolean',
      description: 'true kalau pedagang sedang MELAPORKAN penjualan yang sudah terjadi, bukan bertanya.',
    },
    minta_hitung: {
      type: 'string',
      enum: [TIDAK, HITUNG.SIMULASI_HARGA, HITUNG.UNTUNG_PERIODE],
      description: 'Isi kalau jawabannya butuh angka yang belum ada di lembar fakta.',
    },
    hitung_produk: { type: 'string', nullable: true, description: 'Nama produk untuk simulasi_harga.' },
    hitung_harga_baru: { type: 'integer', nullable: true, description: 'Harga jual baru dalam rupiah, angka saja.' },
    hitung_dari: { type: 'string', nullable: true, description: 'YYYY-MM-DD.' },
    hitung_sampai: { type: 'string', nullable: true, description: 'YYYY-MM-DD.' },
  },
  required: ['jawaban'],
};

interface MentahTanya {
  jawaban?: string;
  kunci_dipakai?: unknown;
  di_luar_cakupan?: unknown;
  lapor_penjualan?: unknown;
  minta_hitung?: unknown;
  hitung_produk?: string | null;
  hitung_harga_baru?: unknown;
  hitung_dari?: unknown;
  hitung_sampai?: unknown;
}

/**
 * Aturan yang sama persis dipasang di kedua tahap.
 *
 * Ditulis sekali di sini, bukan disalin ke dua prompt. Aturan yang disalin
 * adalah aturan yang suatu saat berbeda di satu tempat — dan tahap kedualah
 * yang menghasilkan kalimat akhir, jadi justru di sana pelanggarannya paling
 * mahal.
 */
const ATURAN_ANGKA = `ATURAN ANGKA — ini yang paling penting:
1. SATU-SATUNYA sumber angka adalah LEMBAR FAKTA di atas. Kamu tidak boleh
   menjumlahkan, mengurangi, mengalikan, membagi, atau memperkirakan apa pun.
2. Tulisan rupiah DISALIN PERSIS dari lembar fakta, lengkap dengan titiknya.
   Kalau lembar fakta menulis "Rp 21.200", tulis "Rp 21.200" — jangan
   "Rp 21200", jangan "21 ribu", jangan dibulatkan.
3. Kalau angka yang dibutuhkan TIDAK ADA di lembar fakta, JANGAN dikarang.
   Pilih salah satu: minta dihitung lewat "minta_hitung", atau katakan terus
   terang bahwa datanya belum ada.
4. Kunci yang tidak ada di lembar fakta berarti datanya memang belum dicatat.
   Katakan begitu, dan sebutkan apa yang perlu diisi pedagang. Jangan pernah
   memperlakukan data yang belum ada sebagai nol.
5. Isi "kunci_dipakai" dengan nama kunci yang benar-benar kamu pakai. Ini yang
   ditampilkan ke pedagang sebagai bukti, jadi harus jujur.`;

const ATURAN_GAYA = `CARA BICARA:
- Bahasa Indonesia sehari-hari yang sederhana. Pembacanya pedagang berusia
  35-60 tahun yang tidak terbiasa dengan istilah akuntansi. Jangan pakai kata
  "margin", "HPP", "profit", "revenue" — pakai "untung", "modal", "uang masuk".
- Sapa dengan "Bapak/Ibu".
- Ringkas: dua sampai empat kalimat. Kalau pedagang minta rinci, boleh lebih.
- Langsung ke jawabannya di kalimat pertama. Jangan mengulang pertanyaannya.
- Boleh menafsirkan dan menyarankan, asalkan bersandar pada angka di lembar
  fakta. "Kripik pisang paling laku, tapi justru dijual di bawah modal — makin
  laku makin dalam ruginya" adalah jawaban yang baik.`;

function tulisRiwayat(riwayat: GiliranPercakapan[]): string {
  if (riwayat.length === 0) return '';
  const baris = riwayat
    .map((g) => `${g.peran === 'pedagang' ? 'Pedagang' : 'Kamu'}: ${g.teks}`)
    .join('\n');
  const terakhir = riwayat[riwayat.length - 1];
  return `\nPERCAKAPAN SEBELUMNYA (urut dari lama ke baru):
"""
${baris}
"""
Kata tunjuk seperti "yang itu", "yang tadi", atau "itu" menunjuk ke hal yang
PALING BARU disebut — yaitu di baris terakhir: "${terakhir.teks}". Bukan yang
paling sering muncul di percakapan.

Angka di percakapan lama BOLEH JADI SUDAH BASI. Ambil angka hanya dari lembar
fakta di atas, tidak pernah dari percakapan lama.
`;
}

function bangunPrompt(lembar: Lembar, riwayat: GiliranPercakapan[], pertanyaan: string): string {
  return `Kamu adalah lapakAi, asisten pembukuan untuk pedagang mikro Indonesia.
Kamu sedang berbicara dengan SATU pedagang, dan seluruh data di bawah ini
adalah miliknya.

LEMBAR FAKTA (semua sudah dihitung oleh database, bukan olehmu):
"""
${lembar.teks}
"""
${tulisRiwayat(riwayat)}
${ATURAN_ANGKA}

CAKUPAN:
Kamu menjawab apa saja yang berhubungan dengan usaha pedagang ini dan dengan
aplikasi lapakAi — untung, modal, harga, stok, bahan, produk, penjualan,
pesanan, cara memakai aplikasi, sampai saran usaha yang bersandar pada
datanya. Pertanyaan lanjutan dan obrolan biasa seputar itu juga kamu jawab.

Set "di_luar_cakupan": true HANYA kalau pertanyaannya benar-benar tidak ada
hubungannya — misalnya politik, cuaca, resep masakan umum, kesehatan, atau
minta dibuatkan puisi. Jangan memakainya untuk menghindari pertanyaan sulit
soal usahanya.

Set "lapor_penjualan": true kalau pedagang sedang MELAPORKAN penjualan yang
sudah terjadi, bukan bertanya. Ini penting dan sering terlewat — periksa
setiap kalimat masuk. Ciri-cirinya: tidak ada tanda tanya, ada jumlah barang,
dan ada kata waktu lampau.
  "tadi laku 12 kripik pisang"        -> lapor_penjualan: true
  "hari ini terjual 5 bungkus"        -> lapor_penjualan: true
  "barusan jual 3 kacang telur"       -> lapor_penjualan: true
  "kripik pisang laku berapa bulan ini?" -> BERTANYA, lapor_penjualan: false
Kamu tidak mencatat apa pun; pedagang akan diarahkan ke layar Catat.

KALAU BUTUH ANGKA BARU:
Isi "minta_hitung" dan KOSONGKAN "jawaban". Database yang akan menghitung,
lalu kamu diminta lagi untuk menyusun kalimatnya.

- "${HITUNG.SIMULASI_HARGA}": pedagang bertanya "kalau saya jual sekian,
  bagaimana?". Isi "hitung_produk" dan "hitung_harga_baru".

  Ini WAJIB, tanpa kecuali. Untung pada harga yang belum dipakai TIDAK PERNAH
  ada di lembar fakta, jadi menjawabnya sendiri berarti kamu menghitung — dan
  kamu tidak boleh menghitung. Contoh:
    "kalau kripik saya jual 25000 untungnya berapa?"
      -> minta_hitung: "${HITUNG.SIMULASI_HARGA}", jawaban: ""
    "kalau yang itu saya jual 7000 bagaimana?"
      -> minta_hitung: "${HITUNG.SIMULASI_HARGA}", jawaban: ""
    "untung kripik sekarang berapa?"
      -> harga sekarang sudah ada di lembar fakta, jawab langsung.
  Menulis "untungnya jadi Rp 5.000" tanpa minta dihitung adalah kesalahan
  paling berat yang bisa kamu buat, meskipun angkanya kebetulan benar.

  "hitung_harga_baru" DISALIN DARI KALIMAT PEDAGANG, bukan dari lembar fakta.
  Ini paling sering salah, jadi baca dua kali: kalau pedagang menulis "jual
  25000", isi 25000 — JANGAN mengisi harga yang disarankan di lembar fakta,
  meskipun angkanya terlihat lebih pantas. Pedagang menanyakan harga MILIKNYA,
  dan menjawab dengan harga lain berarti menjawab pertanyaan yang tidak ia
  ajukan. Tulis angka saja, tanpa "Rp" dan tanpa titik. "25 ribu" jadi 25000.

  "hitung_produk" diisi nama produk persis seperti ia menulisnya. Kalau ia
  memakai kata tunjuk seperti "yang itu" atau "yang tadi", yang dimaksud
  adalah produk yang PALING BARU disebut di percakapan sebelumnya — lihat
  giliran paling bawah, bukan yang paling sering muncul.

- "${HITUNG.UNTUNG_PERIODE}": pedagang menanyakan untung/omzet pada rentang
  tanggal DI LUAR periode berjalan, dan tanggalnya bisa dipastikan. Isi
  "hitung_dari" dan "hitung_sampai" format YYYY-MM-DD. Kalau rentangnya tidak
  bisa dipastikan tanggalnya, jangan dipakai — jawab dengan angka periode
  berjalan dan katakan periodenya.

Selain dua itu, tidak ada perhitungan lain yang tersedia. Kalau yang diminta
di luar keduanya, katakan terus terang bahwa itu belum bisa dihitung.

${ATURAN_GAYA}

Pertanyaan pedagang:
"""
${pertanyaan}
"""`;
}

function bangunPromptLanjutan(
  lembar: Lembar, riwayat: GiliranPercakapan[], pertanyaan: string,
): string {
  return `Kamu adalah lapakAi, asisten pembukuan untuk pedagang mikro Indonesia.

Database sudah menjalankan perhitungan yang kamu minta. INI HASILNYA, dan
inilah SATU-SATUNYA dasar jawabanmu:
"""
${lembar.hasilTeks}
"""

Baca sekali lagi baris-baris di atas sebelum menulis. Pertanyaan pedagang
menyangkut angka di situ, bukan angka lain.

- Produk yang ditanyakan adalah yang tertulis di "simulasi_produk". Sebut nama
  itu, jangan nama produk lain, meskipun pedagang tidak menyebutnya.
- Untung pada harga baru adalah "simulasi_untung_per_unit_harga_baru", apa
  adanya — termasuk kalau nilainya minus. Kalau minus, katakan terus terang
  bahwa harga itu justru membuat rugi. Jangan menggantinya dengan angka lain
  yang terlihat lebih menyenangkan.
- Angka yang berasal dari harga yang DISARANKAN sistem bukan jawaban untuk
  harga yang pedagang tanyakan. Jangan dipakai.

Lembar fakta di bawah hanya untuk latar, misalnya nama satuan atau harga
sekarang. Angka inti jawabannya diambil dari hasil perhitungan di atas.
"""
${lembar.teks}
"""
${tulisRiwayat(riwayat)}
${ATURAN_ANGKA}

Jangan minta dihitung lagi — isi "minta_hitung" dengan "${TIDAK}".

Kalau hasil perhitungannya bersandar pada laju penjualan yang sekarang,
SEBUTKAN asumsinya, misalnya "kalau lakunya tetap seperti bulan ini". Menyebut
perkiraan sebagai kepastian adalah cara tercepat kehilangan kepercayaan
pedagang.

${ATURAN_GAYA}

Pertanyaan pedagang:
"""
${pertanyaan}
"""`;
}

const JENIS_SAH: string[] = [HITUNG.SIMULASI_HARGA, HITUNG.UNTUNG_PERIODE];

/**
 * Harga yang masuk akal untuk dagangan mikro.
 *
 * Batas atas ada bukan karena rupiah tidak bisa sebesar itu, tapi karena model
 * kecil kadang menulis "25000000" untuk "25 ribu". Angka sebesar itu tetap
 * menghasilkan query yang sah, dan pedagang melihat perkiraan untung yang
 * mustahil tanpa tahu sebabnya.
 */
const HARGA_MAKS = 100_000_000;

function bacaHarga(nilai: unknown): number | null {
  const n = typeof nilai === 'string' ? Number(nilai.replace(/[^\d]/g, '')) : nilai;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const bulat = Math.round(n);
  return bulat > 0 && bulat <= HARGA_MAKS ? bulat : null;
}

function bacaPermintaanHitung(m: MentahTanya): PermintaanHitung | null {
  const jenis = typeof m.minta_hitung === 'string' ? m.minta_hitung : TIDAK;
  if (!JENIS_SAH.includes(jenis)) return null;

  const bersih = kosongJadiNull({ produk: m.hitung_produk ?? null }, ['produk']);
  return {
    jenis: jenis as JenisHitung,
    produk: bersih.produk,
    harga_baru: bacaHarga(m.hitung_harga_baru),
    dari: tanggalSah(m.hitung_dari),
    sampai: tanggalSah(m.hitung_sampai),
  };
}

/** Buang kunci karangan: hanya yang benar-benar ada di lembar fakta yang lolos. */
function saringKunci(nilai: unknown, lembar: Lembar): string[] {
  if (!Array.isArray(nilai)) return [];
  const unik = new Set<string>();
  for (const k of nilai) {
    if (typeof k === 'string' && Object.hasOwn(lembar.peta, k)) unik.add(k);
  }
  return [...unik];
}

function rapikan(m: MentahTanya, lembar: Lembar): HasilTanya {
  return {
    di_luar_cakupan: m.di_luar_cakupan === true,
    lapor_penjualan: m.lapor_penjualan === true,
    jawaban: typeof m.jawaban === 'string' ? m.jawaban.trim() : '',
    kunci_dipakai: saringKunci(m.kunci_dipakai, lembar),
    perlu_hitung: bacaPermintaanHitung(m),
  };
}

/** Tahap pertama: jawab, atau minta dihitung dulu. */
export async function tanyaTahapSatu(
  lembar: Lembar, riwayat: GiliranPercakapan[], pertanyaan: string,
): Promise<HasilTanya> {
  const mentah = await mintaJson<MentahTanya>(
    bangunPrompt(lembar, riwayat, pertanyaan), SKEMA,
  );
  return rapikan(mentah, lembar);
}

/** Tahap kedua: hasil SQL sudah masuk lembar, tinggal dirangkai jadi kalimat. */
export async function tanyaTahapDua(
  lembar: Lembar, riwayat: GiliranPercakapan[], pertanyaan: string,
): Promise<HasilTanya> {
  const mentah = await mintaJson<MentahTanya>(
    bangunPromptLanjutan(lembar, riwayat, pertanyaan), SKEMA,
  );
  const hasil = rapikan(mentah, lembar);
  // Tahap kedua tidak boleh meminta hitungan lagi. Model kecil sesekali
  // mengulang permintaannya, dan tanpa pemutus ini rangkaiannya bisa berputar.
  return { ...hasil, perlu_hitung: null };
}
