import type { JenisPesan, KandidatProduk } from '../../../../shared/types.ts';

/**
 * Tipe INTERNAL modul pesanan — bentuk antara yang mengalir antar lapisan
 * (llm -> service -> queries) tapi tidak pernah keluar lewat API.
 *
 * Bentuk yang dikirim ke frontend (AnalisisPesanan, BalasanRes, dst) hidup di
 * shared/types.ts, karena itu kontrak dua sisi. Yang di sini urusan dapur.
 */

/** Keluaran mentah klasifikasi LLM, SETELAH dibersihkan kosongJadiNull. */
export interface HasilKlasifikasi {
  jenis: JenisPesan;
  nama_produk_mentah: string | null;
  jumlah: number | null;
  harga_diminta: number | null;
  tanggal_dibutuhkan: string | null;
  alasan: string;
  /**
   * Diisi penyaring deterministik kalau ada yang tidak bisa dibuktikan dari
   * teks pembeli. Bukan keluaran model — model tidak pernah menilai dirinya
   * sendiri. null berarti tidak ada yang mencurigakan.
   */
  ragu: string | null;
}

/** Keputusan pencocokan nama produk: otomatis, tanya pengguna, atau baru. */
export interface HasilCocok {
  produkId: number | null;
  skor: number | null;
  perluDicek: boolean;
  kandidat: KandidatProduk[];
}

/**
 * HasilCocok plus nama produk kandidat teratas — supaya pemanggil tidak
 * mengulang `kandidat.find(...)` dengan caranya masing-masing.
 * `nama_produk` terisi apa adanya; pemanggil yang memutuskan menyembunyikannya
 * saat `perluDicek` (transaksi menyembunyikan, ekstraksi menampilkan).
 */
export interface CocokNamaProduk extends HasilCocok {
  nama_produk: string | null;
}

/** Baris hasil hitung SQL untuk satu pesanan — semua angka dari database. */
export interface HitungPesanan {
  produk_id: number;
  nama: string;
  modal_per_unit: number | null;
  harga_jual: number;
  /** Harga yang benar-benar dipakai: yang diminta pembeli, atau harga jual
   *  tersimpan kalau pembeli tidak menyebut angka. Ditentukan SQL supaya
   *  tidak ada dua tempat yang memutuskannya berbeda. */
  harga_dipakai: number;
  nilai_pesanan: number | null;
  untung_pesanan: number | null;
  merugi: boolean | null;
  stok_cukup_untuk: number | null;
}

/** Masukan untuk INSERT pesan_masuk. */
export interface SimpanPesanArg {
  userId: number;
  teks: string;
  sumber: 'tempel' | 'whatsapp';
  pengirimSamar: string | null;
  jenis: JenisPesan;
  namaProdukMentah: string | null;
  produkId: number | null;
  jumlah: number | null;
  hargaDiminta: number | null;
  tanggalDibutuhkan: string | null;
  keyakinanCocok: number | null;
  perluDicek: boolean;
  hasilMentah: unknown;
}
