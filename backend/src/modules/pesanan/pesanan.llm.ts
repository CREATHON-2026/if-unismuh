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
- "pesanan"      : pembeli memesan sejumlah barang, tanpa menawar harga
- "menawar"      : pembeli meminta harga lebih murah dari biasanya
- "tanya_harga"  : pembeli menanyakan harga, belum memesan
- "bukan_pesanan": sapaan, basa-basi, atau apa pun yang bukan ketiganya

Lalu keluarkan apa yang TERTULIS di pesan itu.

Aturan yang wajib dipatuhi:
1. Nama barang disalin PERSIS seperti ditulis pembeli. Jangan perbaiki ejaan,
   jangan panjangkan singkatan. "kripik psg" tetap "kripik psg".
2. JANGAN menghitung apa pun. Jangan mengalikan jumlah dengan harga, jangan
   menilai pesanan ini untung atau rugi, jangan menebak stok. Kamu hanya membaca.
3. harga_diminta HANYA diisi kalau pembeli benar-benar menyebut angka harga.
   Kalau ia cuma memesan tanpa menyebut harga, isi null.
4. Ubah satuan bicara jadi angka: "20rb" -> 20000, "goceng" -> 5000. Ini
   membaca, bukan menghitung.
5. Kalau sesuatu tidak disebut di pesan, isi null. Jangan menebak.

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
  return bersih;
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
