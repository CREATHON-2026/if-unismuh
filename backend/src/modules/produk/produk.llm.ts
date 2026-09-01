import { mintaJson, kosongJadiNull } from '../../lib/llm.ts';
import type { BahanMentah, ProdukMentah } from './produk.types.ts';

/**
 * Lapisan LLM modul produk: kalimat bebas -> usulan produk baru — fitur 10.
 *
 * Dipakai untuk "tambah produk tanpa form": pedagang cukup mengucapkan apa yang
 * dia jual dan dari bahan apa, tidak perlu mengisi delapan kolom.
 *
 * Model HANYA membaca apa yang diucapkan. Ia tidak menghitung modal, tidak
 * menjumlahkan harga bahan, dan tidak menebak angka yang tidak disebut —
 * aturan #1 dan #8. Modal dihitung SQL setelah produknya disimpan.
 *
 * ★ DUA PANGGILAN, BUKAN SATU. Lihat alasannya di bawah.
 */

// ---------------------------------------------------------------------------
// Kenapa dipecah dua
// ---------------------------------------------------------------------------
//
// Versi pertama meminta semuanya dalam satu keluaran: nama, hasil per batch,
// harga jual, DAN daftar bahan dengan lima angka masing-masing. Hasilnya diukur
// dengan kalimat "tambah kripik pisang, sekali bikin jadi 40 bungkus, dijual 20
// ribu. bahannya pisang 20 kilo 300 ribu, minyak 10 liter 180 ribu":
//
//   hasil_per_batch  -> null   (3 dari 3 percobaan)
//   harga_beli       -> null   (3 dari 3 percobaan)
//   "20 kilo"        -> nyasar ke jumlah_beli
//
// Bukan keluaran acak — polanya konsisten. Kalimat yang sama dengan skema yang
// dipecah dua mengeluarkan 40, 300000, dan 180000 dengan benar. Model 27B
// kehilangan akurasi begitu satu keluaran berisi delapan angka bersemantik
// mirip, dan yang paling sering dikorbankannya justru angka pembagi modal.
//
// Keduanya dijalankan BERSAMAAN, jadi tidak ada waktu tambahan yang berarti.

const SKEMA_KEPALA = {
  type: 'object',
  properties: {
    nama_produk: {
      type: 'string',
      description: 'Nama produk PERSIS seperti diucapkan. Jangan perbaiki ejaan.',
    },
    hasil_per_batch: {
      type: 'number',
      description: 'Sekali bikin jadi berapa unit. HANYA kalau benar-benar disebut.',
    },
    harga_jual: {
      type: 'number',
      description: 'Harga jual per unit dalam rupiah. HANYA kalau benar-benar disebut.',
    },
  },
};

const SKEMA_BAHAN = {
  type: 'object',
  properties: {
    bahan: {
      type: 'array',
      description: 'Bahan yang disebut. Kosongkan kalau tidak ada bahan disebut sama sekali.',
      items: {
        type: 'object',
        properties: {
          nama: { type: 'string', description: 'Nama bahan seperti diucapkan.' },
          satuan: { type: 'string', description: 'kg, liter, buah, tabung, bungkus.' },
          jumlah: { type: 'number', description: 'Berapa banyak bahan ini dipakai sekali bikin.' },
          harga_beli: { type: 'number', description: 'Berapa rupiah uang yang dikeluarkan untuk membelinya.' },
          jumlah_beli: { type: 'number', description: 'Uang itu untuk berapa banyak.' },
        },
        required: ['nama'],
      },
    },
  },
  required: ['bahan'],
};

function promptKepala(teks: string): string {
  return `Pedagang mikro di Indonesia sedang menambahkan satu produk jualannya
dengan bicara atau mengetik bebas. Ambil TIGA hal saja dari kalimatnya:
nama produknya, sekali bikin jadi berapa unit, dan harga jual per unit.

Contoh:
  "tambah kripik pisang, sekali bikin jadi 40 bungkus, dijual 20 ribu"
    -> nama_produk "kripik pisang", hasil_per_batch 40, harga_jual 20000
  "saya juga jual es teh 3 ribu"
    -> nama_produk "es teh", harga_jual 3000, hasil_per_batch tidak disebut

Aturan:
1. Nama produk disalin PERSIS seperti diucapkan.
2. hasil_per_batch adalah SEKALI BIKIN JADI BERAPA UNIT — bukan berapa banyak
   bahannya, bukan berapa yang terjual.
3. Ubah satuan bicara jadi angka: "20 ribu" -> 20000, "goceng" -> 5000.
4. JANGAN menghitung apa pun. JANGAN menebak angka yang tidak disebut —
   biarkan benar-benar kosong, jangan tulis "tidak disebutkan" atau nol.
5. Abaikan bagian kalimat yang menyebut bahan. Itu bukan urusanmu di sini.

Kalimat pedagang:
"""
${teks}
"""`;
}

function promptBahan(teks: string): string {
  return `Pedagang mikro di Indonesia menyebut bahan-bahan untuk membuat
produknya. Untuk SETIAP bahan, catat namanya, satuannya, berapa banyak dipakai,
berapa rupiah harga belinya, dan harga itu untuk berapa banyak.

Contoh:
  "bahannya pisang 20 kilo 300 ribu, minyak 10 liter 180 ribu"
    -> pisang: satuan kg, jumlah 20, harga_beli 300000, jumlah_beli 20
    -> minyak: satuan liter, jumlah 10, harga_beli 180000, jumlah_beli 10
  "kemasan dipakai 40, belinya seratus lembar 45 ribu"
    -> kemasan: jumlah 40, harga_beli 45000, jumlah_beli 100

Aturan:
1. Angka yang diikuti satuan (kilo, liter, biji, lembar) adalah JUMLAH.
   Angka rupiah (ribu, rb, juta) adalah HARGA_BELI. JANGAN tertukar.
2. Nama bahan disalin PERSIS seperti diucapkan.
3. JANGAN menghitung apa pun. Jangan menjumlahkan harga, jangan mencari modal.
4. JANGAN menebak yang tidak disebut — biarkan kosong, jangan tulis
   "tidak disebutkan" dan jangan tulis nol.
5. Kalau tidak ada bahan yang disebut sama sekali, kembalikan daftar kosong.
6. Nama produknya sendiri BUKAN bahan. Jangan masukkan ke daftar.

Kalimat pedagang:
"""
${teks}
"""`;
}

interface HasilKepala {
  nama_produk: string | null;
  hasil_per_batch: number | null;
  harga_jual: number | null;
}

interface HasilBahan {
  bahan: BahanMentah[];
}

export async function ekstrakProdukBaru(teks: string): Promise<ProdukMentah> {
  const [kepala, isi] = await Promise.all([
    mintaJson<HasilKepala>(promptKepala(teks), SKEMA_KEPALA),
    mintaJson<HasilBahan>(promptBahan(teks), SKEMA_BAHAN),
  ]);

  // Bersihkan bentuk keluaran SEBELUM apa pun menyentuh SQL. Model lokal
  // mengisi field kosong dengan 0 atau frasa penampung seperti
  // "tidak disebutkan" — lihat lib/llm.ts. Nol sangat berbahaya di sini:
  // harga_jual 0 akan lolos validasi dan membuat produk terlihat merugi total.
  const bersih = kosongJadiNull(kepala ?? {}, [
    'nama_produk', 'hasil_per_batch', 'harga_jual',
  ]) as HasilKepala;

  const bahan = Array.isArray(isi?.bahan) ? isi.bahan : [];

  return {
    nama_produk: bersih.nama_produk,
    hasil_per_batch: bersih.hasil_per_batch,
    harga_jual: bersih.harga_jual,
    bahan: bahan
      .map((b) => kosongJadiNull(b, ['nama', 'satuan', 'jumlah', 'harga_beli', 'jumlah_beli']))
      // Bahan tanpa nama tidak bisa dipakai apa-apa dan hanya akan muncul di
      // layar konfirmasi sebagai baris kosong yang membingungkan.
      .filter((b) => b.nama !== null)
      .map(lengkapiJumlahBeli),
  };
}

/**
 * "kacang tanah 10 kilo, belinya 100 ribu" berarti 100.000 untuk 10 kilo itu.
 *
 * Pedagang menyebut jumlah beli terpisah HANYA kalau memang berbeda dari yang
 * dipakai — "kemasan dipakai 40, belinya seratus lembar 45 ribu". Jadi kalau
 * jumlah beli tidak disebut sama sekali, bacaan yang benar adalah sama dengan
 * jumlah yang dipakai.
 *
 * Dilakukan di sini, bukan dengan menyuruh model lebih patuh, karena ini
 * deterministik dan bisa dijelaskan. Dan ini bukan menebak angka: tidak ada
 * bilangan baru yang dikarang, hanya satu bacaan yang sudah ada di kalimatnya.
 *
 * Yang menahan kalau bacaan ini keliru adalah layar konfirmasi — nilainya
 * tampil apa adanya untuk dibetulkan sebelum disimpan. Aturan #2.
 */
function lengkapiJumlahBeli(b: BahanMentah): BahanMentah {
  if (b.jumlah_beli !== null || b.jumlah === null || b.harga_beli === null) return b;
  return { ...b, jumlah_beli: b.jumlah };
}
