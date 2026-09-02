import { rupiah } from '../../lib/rupiah.ts';
import { ringkasanPenjualan } from '../beranda/beranda.queries.ts';
import { bahanFakta, produkFakta, profilUsaha } from './tanya.queries.ts';
import type { LembarFakta } from './tanya.types.ts';

/**
 * Lembar fakta — seluruh keadaan usaha, dirakit sekali sebelum model membaca
 * pertanyaannya.
 *
 * Chatbot yang bebas menjawab tidak bisa menebak pertanyaan berikutnya, jadi
 * tidak bisa juga menyiapkan query yang tepat setelah membacanya. Karena itu
 * semuanya sudah di atas meja lebih dulu, dan tugas model tinggal memilih.
 *
 * Berkas ini MERAKIT dan MEMFORMAT. Tidak ada satu pun operasi aritmetika di
 * sini — semua angkanya datang jadi dari tanya.queries.ts. Kalau suatu saat
 * ada yang menambahkan `+`, `-`, atau `*` di berkas ini, itu aturan #1 yang
 * bocor lewat pintu belakang.
 */

type JenisFakta = 'rupiah' | 'angka' | 'teks';

interface Fakta {
  kunci: string;
  nilai: number | string;
  jenis: JenisFakta;
}

export interface Lembar {
  /** kunci -> nilai mentah. Ini yang jadi isi `acuan`. */
  peta: LembarFakta;
  /** Lembar fakta sebagaimana dibaca model. */
  teks: string;
  /**
   * Setiap tulisan rupiah yang SAH muncul di jawaban, misalnya "Rp 21.200".
   *
   * Model diminta menyalin, bukan mengetik ulang angka. Penjaga rupiah di
   * tanya.service.ts mencocokkan tiap "Rp ..." di jawaban ke himpunan ini;
   * yang tidak ada di sini berarti dikarang.
   */
  rupiahSah: Set<string>;
  /**
   * kunci -> angkanya sebagai deretan digit, hanya untuk fakta berjenis rupiah.
   *
   * Dipakai membalik arah pencarian: dari angka yang muncul di kalimat, kembali
   * ke kunci asalnya. Tanpa ini `acuan` cuma berisi kunci yang MODEL AKUI
   * dipakai, dan model yang lupa mengakuinya membuat angka yang benar terlihat
   * seperti angka karangan.
   */
  digitPerKunci: Map<string, string>;
  /**
   * Hasil perhitungan SQL yang baru saja dijalankan, terpisah dari lembar utama.
   *
   * Dipisah karena tahap dua pernah gagal justru karena tidak dipisah: hasil
   * simulasi ikut tenggelam di antara puluhan baris fakta produk, dan model
   * menjawab pengandaian memakai angka produk lain yang kebetulan terlihat
   * lebih menyenangkan. Ditaruh di kepala prompt tahap dua, ia jadi satu-satunya
   * yang mungkin dibaca lebih dulu.
   */
  hasilTeks: string;
  /** Nama produk apa adanya, untuk menyelesaikan rujukan seperti "yang itu". */
  namaProduk: string[];
  adaProduk: boolean;
  adaTransaksi: boolean;
}

/**
 * Nama produk jadi awalan kunci: "Kripik Pisang" -> "kripik_pisang".
 *
 * Kunci memakai nama, bukan nomor urut. `produk_1_modal` memaksa model
 * mengingat produk mana yang nomor satu, dan kartu "angka yang dipakai" di
 * layar jadi tidak terbaca oleh pedagang. `kripik_pisang_modal_per_unit`
 * terbaca oleh keduanya.
 */
function slug(nama: string): string {
  return nama.toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'produk';
}

/** Awalan yang dijamin unik, supaya dua produk bernama mirip tidak bertabrakan. */
function awalanUnik(nama: string, terpakai: Set<string>): string {
  const dasar = slug(nama);
  if (!terpakai.has(dasar)) {
    terpakai.add(dasar);
    return dasar;
  }
  for (let i = 2; ; i += 1) {
    const coba = `${dasar}_${i}`;
    if (!terpakai.has(coba)) {
      terpakai.add(coba);
      return coba;
    }
  }
}

function tulisNilai(f: Fakta): string {
  if (f.jenis === 'rupiah') return rupiah(f.nilai as number);
  return String(f.nilai);
}

/**
 * "Rp 21.200" -> "21200".
 *
 * Yang dibandingkan adalah ANGKANYA, bukan cara menulisnya. Titik pemisah
 * ribuan, spasi setelah "Rp", dan tanda minus semuanya soal rupa; angka yang
 * tidak ada di lembar fakta itulah yang berarti dikarang.
 */
export function digit(teks: string): string {
  return teks.replace(/\D/g, '');
}

function rakit(bagian: { judul: string; fakta: Fakta[] }[]): Lembar {
  const peta: LembarFakta = {};
  const rupiahSah = new Set<string>();
  const digitPerKunci = new Map<string, string>();
  const baris: string[] = [];

  for (const b of bagian) {
    if (b.fakta.length === 0) continue;
    baris.push(`== ${b.judul} ==`);
    for (const f of b.fakta) {
      peta[f.kunci] = f.nilai;
      const tampil = tulisNilai(f);
      if (f.jenis === 'rupiah') {
        rupiahSah.add(tampil);
        digitPerKunci.set(f.kunci, digit(tampil));
      }
      baris.push(`${f.kunci}: ${tampil}`);
    }
    baris.push('');
  }

  return {
    peta,
    rupiahSah,
    digitPerKunci,
    teks: baris.join('\n').trim(),
    hasilTeks: '',
    namaProduk: [],
    adaProduk: false,
    adaTransaksi: false,
  };
}

/**
 * Tambahkan fakta HANYA kalau nilainya benar-benar diketahui.
 *
 * Kunci yang hilang membuat model menjawab "belum bisa dihitung". Kunci berisi
 * 0 membuatnya menjawab "modalnya nol rupiah". Perbedaan itu adalah selisih
 * antara jujur dan berbohong, dan seluruh berkas ini bergantung padanya —
 * lihat catatan NULL di v_kapasitas_produk.
 */
function isi(daftar: Fakta[], kunci: string, nilai: number | string | null | undefined, jenis: JenisFakta): void {
  if (nilai === null || nilai === undefined) return;
  daftar.push({ kunci, nilai, jenis });
}

export async function susunLembar(userId: number): Promise<Lembar> {
  const [profil, ringkas, produk, bahan] = await Promise.all([
    profilUsaha(userId),
    ringkasanPenjualan(userId, null, null),
    produkFakta(userId),
    bahanFakta(userId),
  ]);

  const hariIni = new Date().toISOString().slice(0, 10);

  const usaha: Fakta[] = [];
  isi(usaha, 'usaha_nama', profil?.nama_usaha, 'teks');
  isi(usaha, 'usaha_jenis', profil?.jenis_usaha, 'teks');
  isi(usaha, 'tanggal_hari_ini', hariIni, 'teks');
  isi(usaha, 'periode_yang_dihitung', 'bulan berjalan sampai hari ini', 'teks');

  const ringkasan: Fakta[] = [];
  if (ringkas) {
    isi(ringkasan, 'omzet_periode', ringkas.omzet, 'rupiah');
    isi(ringkasan, 'untung_bersih_periode', ringkas.untung_bersih, 'rupiah');
    isi(ringkasan, 'jumlah_transaksi_periode', ringkas.jumlah_baris, 'angka');
    isi(ringkasan, 'transaksi_belum_dihitung_untungnya', ringkas.baris_tanpa_modal, 'angka');
  }

  const terpakai = new Set<string>();
  const fProduk: Fakta[] = [];
  for (const p of produk) {
    const k = awalanUnik(p.nama, terpakai);
    isi(fProduk, `${k}_nama`, p.nama, 'teks');
    isi(fProduk, `${k}_harga_jual`, p.harga_jual, 'rupiah');
    isi(fProduk, `${k}_modal_per_unit`, p.modal_per_unit, 'rupiah');
    isi(fProduk, `${k}_untung_per_unit`, p.margin_per_unit, 'rupiah');
    isi(fProduk, `${k}_terjual_periode`, p.terjual_periode, 'angka');
    isi(fProduk, `${k}_omzet_periode`, p.omzet_periode, 'rupiah');
    isi(fProduk, `${k}_bahan_cukup_untuk`, p.maks_unit, 'angka');
    isi(fProduk, `${k}_harga_disarankan`, p.harga_disarankan, 'rupiah');
    isi(fProduk, `${k}_untung_per_unit_kalau_pakai_harga_disarankan`,
      p.untung_per_unit_disarankan, 'rupiah');

    // Ditulis sebagai kata, bukan disimpulkan model dari tanda minus. Model
    // kecil salah membaca "-1200" sebagai untung lebih sering daripada yang
    // enak didengar, dan salah di sini membalik seluruh makna jawabannya.
    if (p.merugi !== null) {
      isi(fProduk, `${k}_status`, p.merugi ? 'DIJUAL DI BAWAH MODAL (rugi)' : 'harga di atas modal (untung)', 'teks');
    } else {
      isi(fProduk, `${k}_status`, 'modal belum diketahui karena resepnya belum diisi', 'teks');
    }
  }

  const fBahan: Fakta[] = [];
  for (const b of bahan) {
    const k = `bahan_${slug(b.nama)}`;
    isi(fBahan, `${k}_harga_beli`, b.harga_beli, 'rupiah');
    isi(fBahan, `${k}_jumlah_beli`, `${b.jumlah_beli} ${b.satuan}`, 'teks');
    isi(fBahan, `${k}_sisa_stok`,
      b.stok === null ? 'belum pernah dicatat' : `${b.stok} ${b.satuan}`, 'teks');
  }

  const lembar = rakit([
    { judul: 'USAHA', fakta: usaha },
    { judul: 'RINGKASAN PERIODE BERJALAN', fakta: ringkasan },
    { judul: 'PRODUK', fakta: fProduk },
    { judul: 'BAHAN DAN STOK', fakta: fBahan },
  ]);

  lembar.namaProduk = produk.map((p) => p.nama);
  lembar.adaProduk = produk.length > 0;
  lembar.adaTransaksi = (ringkas?.jumlah_baris ?? 0) > 0;
  return lembar;
}

/**
 * Sisipkan hasil perhitungan ke dalam lembar yang sudah ada.
 *
 * Dipakai di tahap kedua: model meminta sebuah perhitungan, SQL menjalankannya,
 * lalu hasilnya masuk ke lembar yang sama supaya boleh dikutip dengan aturan
 * yang persis sama seperti fakta lainnya — termasuk ikut ke `rupiahSah`, jadi
 * angka hasil simulasi tetap terjaga penjaga rupiah.
 */
export function tambahHasilHitung(
  lembar: Lembar, judul: string, isian: { kunci: string; nilai: number | string; jenis: JenisFakta }[],
): Lembar {
  const baris: string[] = [`== ${judul} ==`];
  for (const f of isian) {
    lembar.peta[f.kunci] = f.nilai;
    const tampil = tulisNilai(f as Fakta);
    if (f.jenis === 'rupiah') {
      lembar.rupiahSah.add(tampil);
      lembar.digitPerKunci.set(f.kunci, digit(tampil));
    }
    baris.push(`${f.kunci}: ${tampil}`);
  }
  lembar.teks = `${lembar.teks}\n\n${baris.join('\n')}`;
  lembar.hasilTeks = lembar.hasilTeks
    ? `${lembar.hasilTeks}\n\n${baris.join('\n')}`
    : baris.join('\n');
  return lembar;
}
