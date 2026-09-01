import { mintaJson, kosongJadiNull } from '../../lib/llm.ts';
import type { BarisMentah } from './transaksi.types.ts';

/**
 * Lapisan LLM modul transaksi: kalimat bebas -> daftar baris penjualan.
 *
 * Dipakai dua jalur: hasil transkripsi suara dari browser, dan ketikan bebas.
 * Modul ini tidak peduli teksnya datang dari mana.
 *
 * Model HANYA membaca apa yang diucapkan. Ia tidak pernah diminta menjumlahkan,
 * menghitung total, atau menebak harga yang tidak disebut — aturan #1.
 */

/** Bentuk mentah dari model — belum melewati penyaring. */
type BarisModel = Omit<BarisMentah, 'ragu'>;

interface HasilEkstraksi {
  baris: BarisModel[];
}

const SKEMA = {
  type: 'object',
  properties: {
    baris: {
      type: 'array',
      description: 'Satu entri per barang yang disebut terjual.',
      items: {
        type: 'object',
        properties: {
          nama_mentah: {
            type: 'string',
            description: 'Nama barang PERSIS seperti diucapkan. Jangan perbaiki ejaan, jangan panjangkan singkatan.',
          },
          jumlah: { type: 'number', description: 'Banyaknya yang terjual.' },
          harga_satuan: {
            type: 'number',
            description: 'Harga per unit dalam rupiah. HANYA diisi kalau harganya benar-benar disebut.',
          },
        },
        required: ['nama_mentah'],
      },
    },
  },
  required: ['baris'],
};

function bangunPrompt(teks: string): string {
  return `Pedagang mikro di Indonesia sedang mencatat penjualannya hari ini dengan
bicara atau mengetik bebas. Ubah kalimatnya menjadi daftar barang yang terjual.

Contoh gaya kalimat yang lazim:
  "hari ini laku 10 kripik pisang sama 5 kacang telur"
    -> dua baris: kripik pisang 10, kacang telur 5
  "kripik 20 bungkus, yang 15 ribuan"
    -> satu baris: kripik 20, harga satuan 15000
  "tadi ada yang beli kacang"
    -> satu baris: kacang, jumlah tidak disebut (JANGAN menuliskan 1)
  "laku mi 10 kripik pisang"
    -> satu baris: kripik pisang 10. Kata mi, ji, pi, ki, mami, tonji, tommi
       adalah partikel dialek Makassar, BUKAN nama barang.
  "laku 3 donat, terus 3 donat lagi"
    -> DUA baris: donat 3 dan donat 3. JANGAN dijumlahkan jadi satu baris 6.
  "3 kripik pisang total 60 ribu"
    -> satu baris: kripik pisang 3 TANPA harga_satuan, karena 60 ribu itu
       harga total, bukan harga per barang. JANGAN membaginya sendiri.

Aturan yang wajib dipatuhi:
1. Nama barang disalin PERSIS seperti diucapkan. "kripik psg" tetap "kripik psg".
2. JANGAN menghitung apa pun. Jangan menjumlahkan, jangan mengalikan jumlah
   dengan harga, jangan membagi harga total. Kamu hanya membaca.
3. harga_satuan HANYA diisi kalau harga PER BARANG benar-benar disebut. Kalau
   yang disebut harga total ("semuanya 60 ribu"), biarkan kosong.
4. Ubah satuan bicara jadi angka: "20rb" -> 20000, "goceng" -> 5000,
   "ceban" -> 10000, "seratus ribu" -> 100000. Ini membaca, bukan menghitung.
5. Kalau ada yang tidak disebut, biarkan kosong. JANGAN menulis "tidak
   disebutkan", "tidak ada", angka 0, atau angka 1 karangan — biarkan kosong.
6. Kalau tidak ada satu pun barang yang bisa dikenali, kembalikan daftar kosong.
7. Kembalikan daftar KOSONG untuk kalimat yang BUKAN catatan penjualan:
   pertanyaan ("berapa harga kripik?"), laporan stok ("stok tinggal 4"),
   perubahan harga ("harga naik jadi 22rb"), belanja bahan ("beli gula 5 kg"),
   rencana atau pesanan untuk nanti ("besok ada pesanan 10"), dan kalimat
   belum/tidak laku ("tena laku" dalam logat Makassar artinya tidak laku).

Kalimat pedagang:
"""
${teks}
"""`;
}

export async function ekstrakBarisPenjualan(teks: string): Promise<BarisMentah[]> {
  const mentah = await mintaJson<HasilEkstraksi>(bangunPrompt(teks), SKEMA);
  const baris = Array.isArray(mentah?.baris) ? mentah.baris : [];

  // Bersihkan bentuk keluaran SEBELUM apa pun menyentuh SQL. Model lokal
  // mengisi field kosong dengan 0 atau frasa penampung seperti
  // "tidak disebutkan" — lihat lib/llm.ts.
  const bersih = baris
    .map((b) => kosongJadiNull({ ...b, ragu: null as string | null }, ['nama_mentah', 'jumlah', 'harga_satuan']))
    // Baris tanpa nama barang tidak bisa dipakai apa-apa: tidak bisa
    // dicocokkan, tidak bisa dihitung. Dibuang di sini daripada muncul di
    // layar konfirmasi sebagai baris kosong yang membingungkan.
    .filter((b) => b.nama_mentah !== null);

  return saringBaris(teks, bersih);
}

// ---------------------------------------------------------------------------
// Penyaring deterministik SETELAH model.
//
// Dua uji 200 kalimat (ketik umum + logat Makassar) menunjukkan kebiasaan
// model lokal yang tidak hilang lewat prompt saja: mengarang jumlah 1,
// menjadikan partikel dialek ("mi", "ji") sebagai barang, diam-diam membagi
// harga total, dan salah membaca slang uang. Penyaring ini menangkapnya
// DI KODE — bukan dengan menebak, tapi dengan mengosongkan nilai yang tak
// bisa dibuktikan dari teks dan menandai sisanya (aturan #8).
//
// Aritmetika di bawah adalah PEMERIKSAAN kode terhadap keluaran model, bukan
// perhitungan finansial — hasilnya tidak pernah tampil sebagai angka di layar.
// ---------------------------------------------------------------------------

/**
 * Kata yang bukan barang bila BERDIRI SENDIRI: partikel dialek Sulawesi
 * Selatan, sapaan, dan kata kerja jual-beli. "mi goreng" (dua kata) tetap
 * lolos — yang disaring hanya "mi" sebatang kara.
 */
const BUKAN_BARANG = new RegExp(
  "^(mi|ji|pi|ki|mo|ka|na|ta|mami|tonji|tommi|toh|deng|di'?|bede'?|kodong|tawwa"
  + "|iye'?|tabe'?|bela|ces|daeng|puang|sodara|anu|bos|bang|kak|dah|dong|nih|sih"
  + '|deh|ya|yah|lah|kok|kan|ewako|laku|terjual|kejual|jual|dijual|beli|dibeli'
  + '|nabeli|laris|habis|ludes)$', 'i',
);

/** "10", "10 x 20rb", atau "laku 10" juga bukan nama barang. */
const NAMA_ANGKA = /^[\d\s.,x@-]+$/;
const KERJA_ANGKA = /^(laku|terjual|kejual|jual|dijual|beli|dibeli)\b[\s\d.,x@-]*$/i;

/** Ada bilangan di teks? Digit, kata bilangan Indonesia, atau angka Makassar/Bugis. */
const ADA_BILANGAN = new RegExp(
  '\\d|\\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas'
  + '|seratus|seribu|sejuta|selusin'
  + '|belas|puluh|ratus|ribu|juta|lusin|kodi)\\b'
  + '|\\bse(bungkus|biji|buah|butir|pasang|lusin|piring|gelas|porsi|ikat|iket)\\b'
  + '|\\bsi(biji|bungkus)\\b'
  + "|\\b(rua|tallu|appa'?|annang|pitu|sagantuju|salapang|sampulo|seppulo"
  + "|seddi|tellu|eppa'?|arua|asera|se're)\\b"
  + '|\\b(goceng|ceban|goban|gopek|seceng|cepek)\\b', 'i',
);

/** Slang uang bernilai pasti — kamus baca, bukan perhitungan. */
const SLANG_UANG: Record<string, number> = {
  goceng: 5000, ceban: 10000, goban: 50000, gopek: 500, seceng: 1000, cepek: 100,
};

const KATA_TOTAL = /\btotal(nya)?\b|\bsemua(nya)?\b|\bjadi(nya)?\b|keseluruhan/i;
const KATA_SATUAN = /\bper\b|@|masing|\bsatu(an|nya|nye)?\b|s[ei]biji|s[ei]bungkus|\beach\b|(rb|ribu|000)-?an\b/i;
const NEGASI_JUAL = /\b(belum|tidak|tdk|nda?k?|tena)\b[\s\S]{0,24}\b(laku|terjual|kejual|beli|pembeli)/i;

/** Semua angka yang benar-benar tertulis di teks, termasuk bentuk "60 ribu". */
function angkaDiTeks(teks: string): Set<number> {
  const hasil = new Set<number>();
  for (const m of teks.matchAll(/(\d+(?:[.,]\d{3})+|\d+)\s*(rb|ribu|k\b|jt|juta)?/gi)) {
    const dasar = Number(m[1].replace(/[.,]/g, ''));
    if (!Number.isFinite(dasar)) continue;
    hasil.add(dasar);
    if (m[2]) hasil.add(dasar * (/jt|juta/i.test(m[2]) ? 1_000_000 : 1000));
  }
  for (const [kata, nilai] of Object.entries(SLANG_UANG)) {
    if (new RegExp(`\\b${kata}\\b`, 'i').test(teks)) hasil.add(nilai);
  }
  return hasil;
}

export function saringBaris(teks: string, masuk: BarisMentah[]): BarisMentah[] {
  const angka = angkaDiTeks(teks);

  // 1. Buang baris yang namanya bukan barang. Kalau ada yang terbuang, jumlah
  //    baris lain ikut diragukan: uji logat Makassar menunjukkan baris partikel
  //    sering MENCURI jumlah milik barang di sebelahnya ("laku mi 10 kripik
  //    pisang" -> mi x10 + kripik pisang x1).
  const bersih: BarisMentah[] = [];
  let adaTersaring = false;
  for (const b of masuk) {
    const nama = (b.nama_mentah ?? '').trim();
    if (BUKAN_BARANG.test(nama) || NAMA_ANGKA.test(nama) || KERJA_ANGKA.test(nama)) {
      adaTersaring = true;
      continue;
    }
    bersih.push({ ...b });
  }

  const tandai = (b: BarisMentah, alasan: string) => { if (b.ragu == null) b.ragu = alasan; };
  const tanya = /\?/.test(teks);
  const negasi = NEGASI_JUAL.test(teks);
  const totalTanpaSatuan = KATA_TOTAL.test(teks) && !KATA_SATUAN.test(teks);
  const slangDiTeks = Object.keys(SLANG_UANG)
    .filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(teks));

  for (const b of bersih) {
    if (adaTersaring) tandai(b, 'ada kata yang tersaring, jumlahnya mohon dipastikan');

    // 2. Model suka mengarang jumlah 1 padahal teksnya tidak menyebut bilangan
    //    apa pun. Jumlah yang tidak bisa dibuktikan dari teks dikosongkan,
    //    supaya rute menandainya "tidak disebut" (aturan #8).
    if (b.jumlah !== null && !ADA_BILANGAN.test(teks)) b.jumlah = null;

    // 3. Kamus slang: kalau "ceban" yang tertulis, harganya ya 10.000.
    if (b.harga_satuan !== null && slangDiTeks.length === 1
        && b.harga_satuan !== SLANG_UANG[slangDiTeks[0]]) {
      b.harga_satuan = SLANG_UANG[slangDiTeks[0]];
    }

    // 3b. Tidak ada barang seharga di bawah Rp 100 — "masing-masing 1 bungkus"
    //     kadang terbaca model sebagai harga_satuan 1.
    if (b.harga_satuan !== null && b.harga_satuan < 100) {
      b.harga_satuan = null;
      tandai(b, 'harganya tidak wajar, mohon dipastikan');
    }

    // 4. Harga total yang menyaru jadi harga satuan — dua bukti terpisah:
    //    (a) harga x jumlah persis angka yang tertulis, padahal harganya
    //        sendiri tidak tertulis -> model membaginya diam-diam;
    //    (b) teks memakai kata "total/semuanya" tanpa kata satuan apa pun.
    if (b.harga_satuan !== null && b.jumlah !== null && b.jumlah > 1) {
      const dibagi = !angka.has(b.harga_satuan) && angka.has(b.harga_satuan * b.jumlah);
      if (dibagi || totalTanpaSatuan) {
        b.harga_satuan = null;
        tandai(b, 'sepertinya harga total, bukan harga per barang');
      }
    }

    if (tanya) tandai(b, 'sepertinya pertanyaan, bukan catatan penjualan');
    if (negasi) tandai(b, 'ada kata seperti "belum/tidak laku", mohon dipastikan');

    // 5. Batas kewajaran: x22000 dari kalimat "harga naik jadi 22rb" tidak
    //    boleh tampil meyakinkan.
    if (b.jumlah !== null
        && (b.jumlah > 999 || (b.harga_satuan !== null && b.jumlah === b.harga_satuan && b.jumlah >= 1000))) {
      tandai(b, 'jumlahnya tidak wajar untuk satu catatan');
    }
  }

  return bersih;
}
