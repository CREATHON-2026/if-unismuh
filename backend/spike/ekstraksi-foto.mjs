/**
 * SPIKE: foto buku catatan -> baris transaksi terstruktur
 *
 * Tujuan skrip ini BUKAN jadi kode produksi. Tujuannya menjawab satu
 * pertanyaan secepat mungkin: apakah Gemini bisa membaca buku tulis
 * pedagang yang asli dan berantakan, cukup baik untuk didemokan?
 *
 * Jalankan:
 *   npm install
 *   node spike/ekstraksi-foto.mjs ../foto/buku1.jpg
 *   node spike/ekstraksi-foto.mjs ../foto/            <- semua foto di folder
 *
 * Butuh GEMINI_API_KEY di environment.
 *
 * Aturan yang ditegakkan skrip ini (lihat CLAUDE.md aturan #1):
 * model TIDAK diminta menjumlahkan apa pun. Ia hanya membaca.
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Dicoba berurutan. Model teratas sering kelebihan beban di jam sibuk, dan
 * di lomba 24 jam kamu tidak boleh berhenti hanya karena satu model penuh.
 */
const MODEL_URUT = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
const AMBANG_RAGU = 0.7; // di bawah ini -> ditandai untuk dicek manusia

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic',
};

/**
 * Skema hasil baca. Perhatikan yang TIDAK ada di sini: total, subtotal,
 * omzet, margin. Semua itu tugas SQL. Model hanya mengeluarkan apa yang
 * benar-benar tertulis di halaman.
 */
const SKEMA = {
  type: 'object',
  properties: {
    baris: {
      type: 'array',
      description: 'Satu entri per baris transaksi yang tertulis di halaman.',
      items: {
        type: 'object',
        properties: {
          nama_mentah: {
            type: 'string',
            description: 'Nama barang PERSIS seperti tertulis, termasuk singkatan dan salah eja. Jangan dirapikan.',
          },
          jumlah: { type: 'number', description: 'Banyaknya. null kalau tidak tertulis.', nullable: true },
          harga_satuan: { type: 'number', description: 'Harga per unit dalam rupiah. null kalau tidak tertulis.', nullable: true },
          tanggal: { type: 'string', description: 'YYYY-MM-DD kalau bisa ditentukan, selain itu null.', nullable: true },
          keyakinan: { type: 'number', description: 'Seberapa yakin baris INI terbaca benar, 0 sampai 1.' },
          alasan_ragu: { type: 'string', description: 'Kenapa ragu, mis. "angka tercoret". null kalau yakin.', nullable: true },
        },
        required: ['nama_mentah', 'keyakinan'],
      },
    },
    total_tertulis: {
      type: 'number',
      description: 'Angka total yang DITULIS pedagang di halaman, kalau ada. Ini dibaca, bukan dihitung. null kalau tidak ada.',
      nullable: true,
    },
    catatan_halaman: {
      type: 'string',
      description: 'Hal yang menyulitkan pembacaan: gelap, miring, terlipat, tulisan rapat.',
      nullable: true,
    },
  },
  required: ['baris'],
};

const PROMPT = `Kamu membaca foto buku catatan penjualan milik pedagang mikro di Indonesia.

Tulisannya tangan, sering disingkat, dan formatnya tidak baku. Contoh gaya yang lazim:
  "kripik 10 20rb"        -> nama: kripik, jumlah 10, harga satuan 20000
  "10 bks kripik @20.000" -> nama: kripik, jumlah 10, harga satuan 20000
  "psg goreng 5 x 3000"   -> nama: psg goreng, jumlah 5, harga satuan 3000

Aturan yang wajib kamu patuhi:
1. Keluarkan nama barang PERSIS seperti tertulis. Jangan perbaiki ejaan, jangan
   panjangkan singkatan. "kripik psg" tetap "kripik psg".
2. JANGAN menjumlahkan, mengalikan, atau menghitung apa pun. Kamu hanya membaca.
   Kalau ada angka total di halaman, salin apa adanya ke total_tertulis.
3. Ubah satuan bicara jadi angka: "20rb" -> 20000, "goceng" -> 5000. Ini
   membaca, bukan menghitung.
4. Beri skor keyakinan PER BARIS, bukan satu skor untuk seluruh halaman. Satu
   halaman bisa punya 9 baris jelas dan 2 baris meragukan.
5. Kalau sesuatu tidak terbaca, tetap keluarkan barisnya dengan keyakinan rendah
   dan isi alasan_ragu. Jangan diam-diam membuang baris, dan jangan menebak
   angka yang tidak kamu lihat.`;

function daftarFoto(target) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    return fs.readdirSync(target)
      .filter((f) => MIME[path.extname(f).toLowerCase()])
      .map((f) => path.join(target, f));
  }
  return [target];
}

function rupiah(n) {
  return n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID');
}

async function bacaSatuFoto(client, berkas) {
  const ext = path.extname(berkas).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`format tidak didukung: ${ext}`);

  const base64 = fs.readFileSync(berkas, { encoding: 'base64' });

  let galatTerakhir;
  for (const model of MODEL_URUT) {
    const mulai = Date.now();
    try {
      const interaction = await client.interactions.create({
        model,
        input: [
          { type: 'text', text: PROMPT },
          { type: 'image', data: base64, mime_type: mime },
        ],
        response_format: { type: 'text', mime_type: 'application/json', schema: SKEMA },
      });
      const detik = ((Date.now() - mulai) / 1000).toFixed(1);
      return { hasil: JSON.parse(interaction.output_text), detik, model };
    } catch (err) {
      galatTerakhir = err;
      // 429/500/503 = sibuk atau gangguan sementara -> coba model berikutnya.
      // Selain itu (400 skema salah, 401 kunci salah) percuma diulang.
      const sementara = /\b(429|500|503)\b|high demand|overload|unavailable/i.test(err.message);
      if (!sementara) throw err;
      console.log(`   ${model} sedang penuh, coba model berikutnya...`);
    }
  }
  throw galatTerakhir;
}

function laporkan(berkas, hasil, detik, model) {
  const baris = hasil.baris ?? [];
  const ragu = baris.filter((b) => b.keyakinan < AMBANG_RAGU);

  console.log(`\n${'='.repeat(64)}`);
  console.log(`${path.basename(berkas)}   ${detik} detik   ${model}`);
  console.log('='.repeat(64));

  if (baris.length === 0) {
    console.log('  TIDAK ADA BARIS TERBACA — ini kegagalan, periksa fotonya.');
  }

  for (const [i, b] of baris.entries()) {
    const tanda = b.keyakinan < AMBANG_RAGU ? '[!]' : '   ';
    console.log(
      `${tanda} ${String(i + 1).padStart(2)}. ${b.nama_mentah.padEnd(22)}` +
      ` ${String(b.jumlah ?? '—').padStart(4)} x ${rupiah(b.harga_satuan).padEnd(12)}` +
      ` yakin ${b.keyakinan.toFixed(2)}`
    );
    if (b.alasan_ragu) console.log(`         ragu: ${b.alasan_ragu}`);
  }

  console.log(`\n  ${baris.length} baris, ${ragu.length} perlu dicek manusia`);
  if (hasil.total_tertulis != null) {
    console.log(`  total yang ditulis pedagang: ${rupiah(hasil.total_tertulis)}  (dibaca, bukan dihitung)`);
  }
  if (hasil.catatan_halaman) console.log(`  catatan foto: ${hasil.catatan_halaman}`);

  return { jumlahBaris: baris.length, jumlahRagu: ragu.length };
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Pakai: node spike/ekstraksi-foto.mjs <foto.jpg | folder-foto/>');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY belum diisi. Ambil di https://aistudio.google.com/apikey');
    process.exit(1);
  }

  const client = new GoogleGenAI({});
  const fotos = daftarFoto(target);
  console.log(`Menguji ${fotos.length} foto  (urutan model: ${MODEL_URUT.join(' -> ')})\n`);

  const rekap = [];
  const mentah = {};

  for (const berkas of fotos) {
    try {
      const { hasil, detik, model } = await bacaSatuFoto(client, berkas);
      mentah[path.basename(berkas)] = hasil;
      rekap.push({ berkas, gagal: false, ...laporkan(berkas, hasil, detik, model) });
    } catch (err) {
      console.log(`\n${path.basename(berkas)}  GAGAL: ${err.message}`);
      rekap.push({ berkas, gagal: true, jumlahBaris: 0, jumlahRagu: 0 });
    }
  }

  fs.writeFileSync('spike/hasil-mentah.json', JSON.stringify(mentah, null, 2), 'utf-8');

  const totalBaris = rekap.reduce((a, r) => a + r.jumlahBaris, 0);
  const totalRagu = rekap.reduce((a, r) => a + r.jumlahRagu, 0);
  const gagal = rekap.filter((r) => r.gagal).length;

  console.log(`\n${'='.repeat(64)}`);
  console.log('REKAP');
  console.log('='.repeat(64));
  console.log(`  foto diuji        : ${fotos.length}  (${gagal} gagal total)`);
  console.log(`  baris terbaca     : ${totalBaris}`);
  console.log(`  perlu dicek       : ${totalRagu}` +
    (totalBaris ? `  (${Math.round((totalRagu / totalBaris) * 100)}%)` : ''));
  console.log(`  JSON mentah       : spike/hasil-mentah.json`);
  console.log(`\n  Sekarang BUKA hasil-mentah.json dan cocokkan dengan fotonya sendiri.`);
  console.log(`  Yang menentukan lolos bukan jumlah barisnya, tapi apakah angkanya BENAR.`);
}

main().catch((err) => {
  console.error('\nGagal:', err.message);
  process.exit(1);
});
