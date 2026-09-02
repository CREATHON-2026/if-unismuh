import type { Maksud } from '../../../../shared/types.ts';

/**
 * Keluaran LLM untuk satu pertanyaan.
 *
 * Perhatikan apa yang TIDAK ada di sini: tidak ada satu pun angka hasil
 * hitungan. Model hanya boleh mengembalikan maksud, nama produk apa adanya,
 * dan rentang tanggal. Semua rupiah lahir di tanya.queries.ts.
 */
export interface HasilBacaMaksud {
  maksud: Maksud;
  /** Nama produk PERSIS seperti ditulis pengguna. null kalau tidak menyebut. */
  nama_produk_mentah: string | null;
  /** YYYY-MM-DD, atau null kalau pengguna tidak menyebut periode. */
  dari: string | null;
  sampai: string | null;
}

/** Baris v_margin_produk yang dipakai jawaban "produk mana yang merugi". */
export interface BarisMerugi {
  nama: string;
  harga_jual: number;
  modal_per_unit: number;
  margin_per_unit: number;
  /**
   * `ABS(margin_per_unit)` — dihitung SQL, bukan `Math.abs()` di sini.
   *
   * Kalimatnya berbunyi "rugi Rp 1.200", bukan "rugi Rp -1.200", jadi angka
   * positifnya harus ada. Kalau dibalik tandanya di TypeScript, `acuan` berisi
   * angka yang SQL tidak pernah keluarkan — dan `acuan` adalah jejak audit
   * jawaban ini. Satu-satunya cara jejak itu bernilai adalah kalau isinya
   * benar-benar datang dari SQL.
   */
  rugi_per_unit: number;
}

export interface BarisModal {
  nama: string;
  harga_jual: number;
  modal_per_unit: number | null;
  margin_per_unit: number | null;
  /** Lihat catatan di BarisMerugi.rugi_per_unit. */
  rugi_per_unit: number | null;
}

export interface BarisSaranHarga {
  nama: string;
  harga_jual: number;
  harga_impas: number;
  harga_disarankan: number;
  kenaikan: number;
  untung_per_unit: number;
}

export interface BarisKapasitas {
  nama: string;
  maks_unit: number | null;
}

export interface BarisTerlaris {
  nama: string;
  jumlah_terjual: number;
  omzet: number;
}
