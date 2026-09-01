import { mintaJson, kosongJadiNull } from '../../lib/llm.ts';

/**
 * Mengubah kalimat bebas jadi daftar baris penjualan.
 *
 * Dipakai dua jalur: hasil transkripsi suara dari browser, dan ketikan bebas.
 * Modul ini tidak peduli teksnya datang dari mana.
 *
 * Model HANYA membaca apa yang diucapkan. Ia tidak pernah diminta menjumlahkan,
 * menghitung total, atau menebak harga yang tidak disebut — aturan #1.
 */

export interface BarisMentah {
  nama_mentah: string | null;
  jumlah: number | null;
  harga_satuan: number | null;
}

interface HasilEkstraksi {
  baris: BarisMentah[];
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
    -> satu baris: kacang, jumlah tidak disebut

Aturan yang wajib dipatuhi:
1. Nama barang disalin PERSIS seperti diucapkan. "kripik psg" tetap "kripik psg".
2. JANGAN menghitung apa pun. Jangan menjumlahkan, jangan mengalikan jumlah
   dengan harga, jangan membuat total. Kamu hanya membaca.
3. harga_satuan HANYA diisi kalau harganya benar-benar disebut. Kalau pedagang
   tidak menyebut harga, JANGAN diisi sama sekali — biarkan kosong.
4. Ubah satuan bicara jadi angka: "20rb" -> 20000, "goceng" -> 5000,
   "seratus ribu" -> 100000. Ini membaca, bukan menghitung.
5. Kalau ada yang tidak disebut, biarkan kosong. JANGAN menulis "tidak
   disebutkan", "tidak ada", atau tanda hubung — biarkan benar-benar kosong.
6. Kalau tidak ada satu pun barang yang bisa dikenali, kembalikan daftar kosong.

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
  return baris
    .map((b) => kosongJadiNull(b, ['nama_mentah', 'jumlah', 'harga_satuan']))
    // Baris tanpa nama barang tidak bisa dipakai apa-apa: tidak bisa
    // dicocokkan, tidak bisa dihitung. Dibuang di sini daripada muncul di
    // layar konfirmasi sebagai baris kosong yang membingungkan.
    .filter((b) => b.nama_mentah !== null);
}
