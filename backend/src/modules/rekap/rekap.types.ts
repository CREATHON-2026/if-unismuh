/**
 * Tipe INTERNAL modul rekap. Bentuk yang keluar lewat API (`Rekap`,
 * `TitikTren`) hidup di shared/types.ts, karena itu kontrak dua sisi.
 */

/** Baris hasil `produkTerlarisPeriode`. */
export interface TerlarisPeriode {
  id: number;
  nama: string;
  /**
   * float8, bukan int: `transaksi.jumlah` NUMERIC karena ada barang yang
   * dijual per kilogram. Membulatkannya di sini akan membuat "2,5 kg" jadi
   * "3 kg" di layar tanpa ada yang tahu dari mana bulatnya.
   */
  jumlah_terjual: number;
}

/**
 * Satu baris hasil `trenHarian` — `TitikTren` plus tanggalnya.
 *
 * `tgl` tidak ikut ke API. Ia ada supaya service bisa memakai batas rentang
 * yang DIHITUNG DATABASE saat meminta totalnya, bukan batas yang dihitung
 * ulang di TypeScript dengan jam mesin yang bisa berbeda sehari.
 */
export interface BarisTren {
  /** 'YYYY-MM-DD' */
  tgl: string;
  label: string;
  omzet: number;
  untung_bersih: number;
}
