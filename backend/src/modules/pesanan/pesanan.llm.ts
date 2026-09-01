import { mintaJson, mintaTeks, kosongJadiNull, tanggalSah } from '../../lib/llm.ts';
import { rupiah } from '../../lib/rupiah.ts';
import type { BalasanReq } from '../../../../shared/types.ts';
import type { HasilKlasifikasi, HitungPesanan } from './pesanan.types.ts';

/**
 * Lapisan LLM modul pesanan — dua tugas bahasa, nol perhitungan:
 *
 *   1. `klasifikasiPesan`  : chat pembeli -> JSON terstruktur
 *   2. `susunBalasan`      : angka hasil SQL -> kalimat balasan
 *
 * Model HANYA membaca dan merangkai. Ia tidak pernah diminta menghitung nilai
 * pesanan, memutuskan untung-rugi, atau memeriksa stok — ketiganya dijawab SQL
 * di pesanan.queries.ts. Aturan #1.
 */

// ---------------------------------------------------------------------------
// 1. Klasifikasi pesan pembeli
// ---------------------------------------------------------------------------

const SKEMA = {
  type: 'object',
  properties: {
    jenis: {
      type: 'string',
      enum: ['pesanan', 'tanya_harga', 'menawar', 'bukan_pesanan'],
      description: 'Maksud pesan pembeli.',
    },
    nama_produk_mentah: {
      type: 'string',
      nullable: true,
      description: 'Nama barang PERSIS seperti ditulis pembeli, jangan dirapikan. null kalau tidak disebut.',
    },
    jumlah: { type: 'number', nullable: true, description: 'Banyaknya yang diminta. null kalau tidak disebut.' },
    harga_diminta: {
      type: 'number', nullable: true,
      description: 'Harga per satuan yang DIMINTA pembeli, dalam rupiah. Hanya diisi kalau pembeli menyebut angka. null kalau tidak.',
    },
    tanggal_dibutuhkan: {
      type: 'string', nullable: true,
      description: 'YYYY-MM-DD kalau bisa dipastikan dari pesan. null kalau tidak jelas.',
    },
    alasan: { type: 'string', description: 'Satu kalimat singkat kenapa diklasifikasikan begitu.' },
  },
  required: ['jenis', 'alasan'],
};

function bangunPromptKlasifikasi(teks: string, hariIni: string): string {
  return `Kamu membaca satu pesan WhatsApp dari pembeli ke pedagang mikro di Indonesia.
Hari ini tanggal ${hariIni}.

Klasifikasikan maksud pesannya:
- "pesanan"      : pembeli memesan sejumlah barang, dan MENERIMA harga yang berlaku
- "menawar"      : pembeli minta harga lebih murah, ATAU menyebut harga versinya
                   sendiri, ATAU minta harga khusus karena beli banyak
- "tanya_harga"  : pembeli menanyakan harga, belum memesan
- "bukan_pesanan": sapaan, basa-basi, ucapan terima kasih, atau apa pun yang
                   bukan ketiganya

Lalu keluarkan apa yang TERTULIS di pesan itu.

Aturan yang wajib dipatuhi:
1. Nama barang disalin PERSIS seperti ditulis pembeli. Jangan perbaiki ejaan,
   jangan panjangkan singkatan. "kripik psg" tetap "kripik psg".
2. JANGAN menghitung apa pun. Jangan mengalikan jumlah dengan harga, jangan
   MEMBAGI harga total dengan jumlah, jangan menilai untung atau rugi, jangan
   menebak stok. Kamu hanya membaca.
3. harga_diminta HANYA diisi kalau pembeli benar-benar menyebut angka harga,
   DAN angka itu jelas harga PER SATUAN.
   - "donat 3000 per biji"      -> harga_diminta 3000  (ada kata "per biji")
   - "donat 20 biji semuanya 70rb" -> harga_diminta null (70rb itu TOTAL)
   - "kripik pisang 10 bungkus 150rb" -> harga_diminta null (150rb itu TOTAL)
   Kalau ragu antara harga satuan dan harga total, isi null. Jangan menebak.
4. Ubah satuan bicara jadi angka: "20rb" -> 20000, "goceng" -> 5000,
   "ceban" -> 10000. Ini membaca, bukan menghitung.
5. Kalau sesuatu tidak disebut di pesan, isi null. Jangan menebak.
   Khususnya jumlah: kalau pembeli tidak menyebut bilangan apa pun, jumlah
   HARUS null. Jangan pernah menulis 1 karena merasa harus mengisi.
   - "kripik pisang berapa harganya?" -> jumlah null, BUKAN 1
6. Kata tanya ("berapa", "berapaan", "masih ada", "?") menandakan pembeli
   sedang bertanya, bukan memesan.
7. Pesan yang cuma sapaan, ucapan terima kasih, konfirmasi transfer, tanya
   alamat, tanya jam buka, atau iklan/spam adalah "bukan_pesanan" — walaupun
   ada angkanya.

Pesan pembeli:
"""
${teks}
"""`;
}

export async function klasifikasiPesan(teks: string): Promise<HasilKlasifikasi> {
  const hariIni = new Date().toISOString().slice(0, 10);
  const mentah = await mintaJson<HasilKlasifikasi>(bangunPromptKlasifikasi(teks, hariIni), SKEMA);

  // Bersihkan bentuk keluaran SEBELUM apa pun menyentuh SQL.
  //
  // Model lokal mengisi field kosong dengan 0/"" dan menulis tanggal sebagai
  // teks bebas ("hari sabtu"). Keduanya merusak: yang pertama membuat harga
  // Rp 0 dipakai sebagai harga sungguhan, yang kedua menjatuhkan INSERT ke
  // kolom DATE. Lihat lib/llm.ts.
  const bersih = kosongJadiNull(mentah, ['nama_produk_mentah', 'jumlah', 'harga_diminta']);
  bersih.tanggal_dibutuhkan = tanggalSah(bersih.tanggal_dibutuhkan);
  return saringPesan(teks, bersih);
}

// ---------------------------------------------------------------------------
// Penyaring deterministik SETELAH model.
//
// Sekawan dengan `saringBaris` di modul transaksi, dan lahir dari uji yang
// sama: keluaran model lokal punya kebiasaan yang tidak hilang lewat prompt.
// Uji 120 pesan pembeli menemukan tiga di antaranya berbahaya:
//
//   1. Harga TOTAL dibaca sebagai harga per satuan. "kripik pisang 10 bungkus
//      150rb" tersimpan sebagai Rp 150.000/bungkus, jadi nilai pesanannya
//      membengkak 10x dan penanda rugi TERBALIK — aplikasi bilang untung
//      padahal pedagang rugi. Ini kebalikan dari gunanya aplikasi ini ada.
//   2. jumlah 1 dikarang untuk pertanyaan. "kripik pisang berapa harganya?"
//      masuk daftar sebagai pesanan 1 bungkus yang tidak pernah ada.
//   3. Tawaran terbaca sebagai pesanan biasa, jadi pedagang menerima potongan
//      harga tanpa sadar sedang ditawar.
//
// Penyaring ini tidak menebak: ia MENGOSONGKAN yang tidak bisa dibuktikan dari
// teks, lalu menandainya supaya pedagang yang memutuskan (aturan #8).
//
// Aritmetika di bawah adalah PEMERIKSAAN kode terhadap keluaran model, bukan
// perhitungan finansial — hasilnya tidak pernah tampil sebagai angka di layar.
// ---------------------------------------------------------------------------

/** Ada bilangan di teks? Digit atau kata bilangan yang lazim di pesan pembeli. */
const ADA_BILANGAN = new RegExp(
  '\\d|\\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas'
  + '|seratus|seribu|sejuta|selusin|belas|puluh|ratus|ribu|juta|lusin|kodi)\\b'
  + '|\\bse(bungkus|biji|buah|butir|pasang|lusin|piring|gelas|porsi|ikat|iket)\\b'
  + '|\\bsi(biji|bungkus)\\b'
  + '|\\b(goceng|ceban|goban|gopek|seceng|cepek)\\b', 'i',
);

/** Slang uang bernilai pasti — kamus baca, bukan perhitungan. */
const SLANG_UANG: Record<string, number> = {
  goceng: 5000, ceban: 10000, goban: 50000, gopek: 500, seceng: 1000, cepek: 100,
};

const KATA_TOTAL = /\btotal(nya)?\b|\bsemua(nya)?\b|\bjadi(nya)?\b|keseluruhan|\bborong(an)?\b/i;
const KATA_SATUAN = /\bper\b|@|masing|\bsatu(an|nya|nye)?\b|s[ei]biji|s[ei]bungkus|\beach\b|(rb|ribu|000)-?an\b/i;

/**
 * Penanda pembeli sedang MENAWAR, bukan sekadar memesan.
 *
 * Dipisah dari model karena ini pekerjaan bahasa yang deterministik, dan
 * karena salah di sini mahal: tawaran yang terbaca sebagai pesanan biasa
 * membuat pedagang menyetujui potongan harga tanpa pernah melihat
 * peringatannya.
 */
const PENANDA_TAWAR = new RegExp(
  '\\b(nawar|menawar|ditawar|tawar|nego|negonya|diskon|potongan|kurangin|kurangi'
  + '|murahin|murahkan|dimurahin|obral)\\b'
  + '|\\b(bisa|boleh|dapat|dapet|bole)\\b[\\s\\S]{0,30}\\b(kurang|murah|turun|nego|nawar)\\b'
  + '|\\bharga\\b[\\s\\S]{0,20}\\b(kurang|turun|khusus|spesial|grosir)\\b'
  + '|\\b(kalau|kalo)\\b[\\s\\S]{0,40}\\bdapat\\b[\\s\\S]{0,15}\\bharga\\b', 'i',
);

/**
 * Pembeli ini sedang minta harga lebih murah?
 *
 * Diekspor karena pesanan.service.ts perlu tahu jawabannya: di sana ada harga
 * jual tersimpan yang bisa memutuskan tawar-menawar dari ANGKA, dan kedua
 * bukti itu harus dibaca bersama. Kalau tidak, kalimat setegas "bisa ji kurang
 * harganya?" bisa kalah oleh angka yang kebetulan sama dengan harga jual, dan
 * tawaran itu tersimpan sebagai pesanan biasa.
 */
export function adaPenandaTawar(teks: string): boolean {
  return PENANDA_TAWAR.test(teks);
}

/** Pertanyaan harga murni — pembeli belum memesan apa pun. */
const TANYA_HARGA = /\bberapa(an|kah)?\b|\bharganya\b\s*\?|price\s*list|\bpricelist\b/i;

/**
 * Satu kalimat untuk satu temuan, dipakai penyaring teks di berkas ini DAN
 * penjaga harga-jual di pesanan.service.ts. Ditulis sekali supaya pedagang
 * tidak pernah membaca dua kalimat berbeda untuk masalah yang sama.
 */
export const HARGA_TOTAL =
  'Angka harganya sepertinya TOTAL, bukan harga per barang — untung-ruginya dihitung '
  + 'memakai harga jual biasa dulu. Mohon dipastikan ke pembeli.';

/** Semua angka yang benar-benar tertulis di teks, termasuk bentuk "150 rb". */
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

export function saringPesan(teks: string, masuk: HasilKlasifikasi): HasilKlasifikasi {
  const h: HasilKlasifikasi = { ...masuk, ragu: masuk.ragu ?? null };
  const tandai = (alasan: string) => { if (h.ragu === null) h.ragu = alasan; };
  const angka = angkaDiTeks(teks);

  // 1. Jumlah yang tidak bisa dibuktikan dari teks dikosongkan. Model mengisi
  //    1 karena merasa harus mengisi sesuatu; akibatnya pertanyaan harga masuk
  //    daftar sebagai pesanan satu bungkus yang tidak pernah dipesan siapa pun.
  if (h.jumlah !== null && !ADA_BILANGAN.test(teks)) {
    h.jumlah = null;
  }

  // 2. Tawaran yang menyamar jadi pesanan biasa. Kata-kata tawar-menawar
  //    deterministik; kalau ada, pedagang berhak melihatnya sebagai tawaran.
  if (h.jenis === 'pesanan' && PENANDA_TAWAR.test(teks)) {
    h.jenis = 'menawar';
  }

  // 3. Pertanyaan harga tidak membawa tawaran. Angka di kalimat seperti
  //    "kacang telur masih 5rb kan?" adalah harga yang DIINGAT pembeli, bukan
  //    yang ia minta — memakainya sebagai harga pesanan membuat SQL menghitung
  //    untung-rugi dari angka yang tidak pernah ditawarkan siapa pun.
  if (h.jenis === 'tanya_harga' && h.harga_diminta !== null) {
    h.harga_diminta = null;
    tandai('Pembeli sedang bertanya harga, bukan menawar — angka di pesannya tidak dipakai sebagai harga pesanan.');
  }

  // 4. Slang uang punya nilai pasti — kalau yang tertulis "ceban", harganya
  //    Rp 10.000, bukan tafsiran model.
  const slang = Object.keys(SLANG_UANG)
    .filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(teks));
  if (h.harga_diminta !== null && slang.length === 1
      && h.harga_diminta !== SLANG_UANG[slang[0]]) {
    h.harga_diminta = SLANG_UANG[slang[0]];
  }

  // 5. Tidak ada barang seharga di bawah Rp 100.
  if (h.harga_diminta !== null && h.harga_diminta < 100) {
    h.harga_diminta = null;
    tandai('Harga yang disebut pembeli tidak wajar, jadi tidak dipakai — mohon dipastikan dulu.');
  }

  // 6. Harga total yang menyaru jadi harga satuan — dua bukti dari TEKS saja.
  //    Bukti ketiga, yang paling kuat, butuh harga jual tersimpan dan karena
  //    itu ada di pesanan.service.ts.
  if (h.harga_diminta !== null && h.jumlah !== null && h.jumlah > 1) {
    const dibagi = !angka.has(h.harga_diminta) && angka.has(h.harga_diminta * h.jumlah);
    const totalTanpaSatuan = KATA_TOTAL.test(teks) && !KATA_SATUAN.test(teks);
    if (dibagi || totalTanpaSatuan) {
      h.harga_diminta = null;
      tandai(HARGA_TOTAL);
    }
  }

  // 7. Kalimat tanya yang tersimpan sebagai pesanan tetap ditandai, supaya
  //    pedagang memastikan dulu sebelum menyiapkan barang.
  if ((h.jenis === 'pesanan' || h.jenis === 'menawar')
      && TANYA_HARGA.test(teks) && !/\b(pesan|order|ambil|beli|kirim|minta|mau)\b/i.test(teks)) {
    tandai('Pesan ini terbaca seperti pertanyaan, bukan pesanan — mohon dipastikan dulu.');
  }

  return h;
}

// ---------------------------------------------------------------------------
// 2. Menyusun balasan untuk DISALIN pedagang sendiri
//
// Satu-satunya tempat di seluruh aplikasi tempat keluaran LLM tampil sebagai
// bahasa, bukan data. Dan justru karena itu paling rawan: model akan tergoda
// "membantu" dengan menghitung ulang atau membulatkan angka.
//
// Penjagaannya berlapis:
//   1. Semua angka dihitung SQL dulu, lalu disodorkan ke prompt sebagai fakta
//   2. Prompt melarang keras mengubah atau menambah angka
//   3. Jawaban tetap menyertakan `acuan` berisi angka SQL, sehingga siapa pun
//      bisa mencocokkan apakah kalimatnya jujur
//
// Sistem TIDAK PERNAH mengirim teks ini — aturan #4.
// ---------------------------------------------------------------------------

function bangunPromptBalasan(h: HitungPesanan, req: BalasanReq): string {
  const jumlah = req.jumlah ?? null;
  const fakta: string[] = [
    `Nama produk: ${h.nama}`,
    `Harga jual normal: ${rupiah(h.harga_jual)} per unit`,
  ];
  if (h.modal_per_unit !== null) fakta.push(`Modal pedagang: ${rupiah(h.modal_per_unit)} per unit`);
  if (jumlah !== null) fakta.push(`Jumlah yang diminta pembeli: ${jumlah} unit`);
  if (req.harga_diminta != null) fakta.push(`Harga yang ditawar pembeli: ${rupiah(req.harga_diminta)} per unit`);
  if (h.untung_pesanan !== null) {
    fakta.push(h.merugi
      ? `Kalau diterima di harga itu, pedagang RUGI ${rupiah(Math.abs(h.untung_pesanan))} untuk pesanan ini`
      : `Kalau diterima, pedagang untung ${rupiah(h.untung_pesanan)} untuk pesanan ini`);
  }
  if (h.stok_cukup_untuk !== null && jumlah !== null && h.stok_cukup_untuk < jumlah) {
    fakta.push(`Bahan pedagang hanya cukup untuk ${h.stok_cukup_untuk} unit, bukan ${jumlah}`);
  }

  const arahan: Record<BalasanReq['maksud'], string> = {
    tawar_harga: h.merugi
      ? 'Pembeli menawar di bawah modal. Tolak tawarannya dengan halus, sebutkan harga yang bisa diberikan, dan tetap tawarkan agar ia jadi membeli.'
      : 'Pembeli menawar. Balas dengan sopan — boleh diterima atau ditawar balik sedikit.',
    terima: 'Terima pesanannya dengan ramah dan sebutkan totalnya.',
    tolak: 'Tolak pesanan dengan halus, sebutkan alasannya secara sopan.',
    jawab_harga: 'Pembeli menanyakan harga. Jawab dengan ramah dan singkat.',
  };

  return `Kamu membantu pedagang mikro Indonesia menyusun balasan WhatsApp untuk pembeli.

FAKTA (sudah dihitung sistem, semuanya benar):
${fakta.map((f) => '- ' + f).join('\n')}

TUGAS: ${arahan[req.maksud]}

Aturan yang wajib dipatuhi:
1. JANGAN menghitung apa pun. Jangan menjumlahkan, mengalikan, atau membulatkan.
   Pakai HANYA angka yang tertulis di FAKTA, persis apa adanya.
2. JANGAN menyebut kata "modal", "rugi", atau "untung" kepada pembeli. Itu
   urusan dalam pedagang; pembeli tidak boleh tahu.
3. Tulis seperti pedagang Indonesia menulis WhatsApp: ramah, singkat, sopan.
   Sapa dengan "Kak". Maksimal 3 kalimat.
4. Keluarkan HANYA teks balasannya. Tanpa tanda kutip, tanpa penjelasan,
   tanpa pilihan ganda.`;
}

export async function susunBalasan(h: HitungPesanan, req: BalasanReq): Promise<string> {
  const teks = await mintaTeks(bangunPromptBalasan(h, req));
  // Model kadang membungkus jawabannya dengan tanda kutip meski sudah dilarang.
  return teks.replace(/^["'`]+|["'`]+$/g, '').trim();
}
