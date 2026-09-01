import { mintaJson, kosongJadiNull, tanggalSah } from '../../lib/llm.ts';
import type { JenisPesan } from '../../../../shared/types.ts';

/**
 * Klasifikasi dan ekstraksi pesan pembeli.
 *
 * Model HANYA membaca apa yang tertulis di chat. Ia tidak pernah diminta
 * menghitung nilai pesanan, memutuskan untung-rugi, atau memeriksa stok —
 * ketiganya dijawab SQL di pesanan.queries.ts. Aturan #1.
 */

export interface HasilKlasifikasi {
  jenis: JenisPesan;
  nama_produk_mentah: string | null;
  jumlah: number | null;
  harga_diminta: number | null;
  tanggal_dibutuhkan: string | null;
  alasan: string;
}

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

function bangunPrompt(teks: string, hariIni: string): string {
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
  const mentah = await mintaJson<HasilKlasifikasi>(bangunPrompt(teks, hariIni), SKEMA);

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
