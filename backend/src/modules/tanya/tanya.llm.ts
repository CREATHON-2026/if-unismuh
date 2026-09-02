import { mintaJson, kosongJadiNull, tanggalSah } from '../../lib/llm.ts';
import { MAKSUD, type Maksud } from '../../../../shared/types.ts';
import type { HasilBacaMaksud } from './tanya.types.ts';

/**
 * Lapisan LLM chatbot — SATU tugas: membaca maksud pertanyaan.
 *
 * Model tidak pernah melihat satu pun angka milik pedagang, jadi tidak ada yang
 * bisa dijumlahkannya. Ia hanya menjawab "pertanyaan ini soal apa" dan
 * "produk mana yang disebut". Sisanya SQL. Aturan #1.
 *
 * Bandingkan dengan pesanan.llm.ts: di sana model juga menyusun kalimat, dan
 * penjagaannya berlapis-lapis karena itu. Di sini kalimatnya disusun template,
 * jadi permukaan yang bisa mengarang jauh lebih kecil.
 */

const DAFTAR_MAKSUD = Object.values(MAKSUD);

const SKEMA = {
  type: 'object',
  properties: {
    maksud: {
      type: 'string',
      enum: DAFTAR_MAKSUD,
      description: 'Maksud pertanyaan pedagang.',
    },
    nama_produk_mentah: {
      type: 'string',
      nullable: true,
      description: 'Nama produk PERSIS seperti ditulis pedagang, jangan dirapikan. null kalau tidak disebut.',
    },
    dari: {
      type: 'string', nullable: true,
      description: 'Awal periode YYYY-MM-DD kalau pedagang menyebut rentang waktu yang pasti. null kalau tidak.',
    },
    sampai: {
      type: 'string', nullable: true,
      description: 'Akhir periode YYYY-MM-DD. null kalau tidak disebut.',
    },
  },
  required: ['maksud'],
};

function bangunPrompt(pertanyaan: string, hariIni: string): string {
  return `Kamu membaca satu pertanyaan dari pedagang mikro Indonesia kepada aplikasi pembukuannya.
Hari ini tanggal ${hariIni}.

Tentukan pertanyaan itu maksudnya apa, dari daftar berikut dan HANYA dari daftar ini:

- "untung_periode"   : menanyakan untung, omzet, penghasilan, atau pemasukan
                       dalam suatu periode
- "produk_merugi"    : menanyakan produk mana yang rugi, tekor, atau tidak
                       menguntungkan
- "modal_produk"     : menanyakan modal, biaya bikin, atau HPP satu produk
- "saran_harga"      : menanyakan sebaiknya dijual berapa, harga yang pas,
                       atau apakah harganya perlu naik
- "kapasitas_stok"   : menanyakan bahan yang ada cukup untuk berapa banyak
- "produk_terlaris"  : menanyakan produk apa yang paling laku atau paling laris
- "catat_transaksi"  : BUKAN bertanya. Pedagang sedang melaporkan penjualan yang
                       sudah terjadi, misalnya "tadi laku 12 kripik pisang"
- "tidak_paham"      : apa pun yang bukan keenam di atas — sapaan, cuaca, resep
                       masakan, pertanyaan umum, atau apa pun di luar data usaha
                       pedagang ini

Aturan yang wajib dipatuhi:
1. JANGAN menghitung apa pun. Jangan menjumlahkan, mengalikan, membandingkan
   angka, atau menyimpulkan untung-rugi. Kamu hanya membaca maksudnya.
2. Kamu TIDAK punya akses ke data pedagang, jadi jangan pernah menyebut atau
   menebak angka. Yang kamu keluarkan hanya maksud dan nama produk.
3. Nama produk disalin PERSIS seperti ditulis. Jangan perbaiki ejaan.
   "kripik psg" tetap "kripik psg". null kalau pedagang tidak menyebut produk.
4. Kalau maksudnya tidak jelas atau di luar daftar, jawab "tidak_paham".
   Menebak lebih buruk daripada mengaku tidak paham: pedagang yang ditolak
   akan bertanya ulang, sedangkan jawaban yang salah dipercaya begitu saja.
5. dari/sampai hanya diisi kalau pedagang menyebut waktu yang bisa dipastikan
   tanggalnya. "bulan ini" dan "belakangan ini" TIDAK bisa dipastikan — isi
   null, jangan tulis kata-katanya.

Pertanyaan pedagang:
"""
${pertanyaan}
"""`;
}

/** Model lokal kadang mengarang nilai enum di luar daftar. */
function maksudSah(nilai: unknown): Maksud {
  return DAFTAR_MAKSUD.includes(nilai as Maksud) ? (nilai as Maksud) : MAKSUD.TIDAK_PAHAM;
}

export async function bacaMaksud(pertanyaan: string): Promise<HasilBacaMaksud> {
  const hariIni = new Date().toISOString().slice(0, 10);
  const mentah = await mintaJson<Partial<HasilBacaMaksud>>(
    bangunPrompt(pertanyaan, hariIni), SKEMA,
  );

  // Bersihkan SEBELUM apa pun menyentuh SQL. Ketiga pembersih ini lahir dari
  // bug sungguhan, bukan kehati-hatian teoretis:
  //
  //   - enum di luar daftar  -> maksud yang tidak punya query, lalu 500
  //   - "" / "tidak disebutkan" -> ikut dicocokkan ke daftar produk
  //   - "bulan ini" di kolom DATE -> INSERT/SELECT jatuh
  //
  // Lihat lib/llm.ts.
  const bersih = kosongJadiNull(
    { ...mentah, maksud: maksudSah(mentah.maksud) },
    ['nama_produk_mentah'],
  );

  return {
    maksud: bersih.maksud,
    nama_produk_mentah: bersih.nama_produk_mentah ?? null,
    dari: tanggalSah(bersih.dari),
    sampai: tanggalSah(bersih.sampai),
  };
}
