import { GalatTampil } from '../../lib/http.ts';
import {
  KODE_GALAT,
  type BarisTransaksi, type BarisUsulan, type UsulanTransaksi,
} from '../../../../shared/types.ts';
import { cocokkanNamaProduk } from '../pesanan/pesanan.service.ts';
import { ekstrakBarisPenjualan } from './transaksi.llm.ts';
import { simpanTransaksi, daftarTransaksi, ProdukTidakSah } from './transaksi.queries.ts';

/**
 * Service transaksi — logika domain, tanpa Express.
 * SQL di transaksi.queries.ts, bacaan LLM di transaksi.llm.ts.
 */

/**
 * Catat banyak baris sekaligus — fitur 3, ketik manual.
 * Masuk semua atau tidak sama sekali; kegagalan satu baris membatalkan batch.
 */
export async function catatTransaksi(
  userId: number, tanggal: string | null, baris: BarisTransaksi[],
): Promise<number> {
  try {
    return await simpanTransaksi(userId, tanggal, baris);
  } catch (err) {
    if (err instanceof ProdukTidakSah) {
      // Seluruh batch dibatalkan — tidak ada satu baris pun yang tersimpan.
      throw new GalatTampil(
        KODE_GALAT.PRODUK_TIDAK_DITEMUKAN,
        'Ada produk yang tidak dikenali. Tidak ada penjualan yang tersimpan.',
      );
    }
    throw err;
  }
}

/** Daftar transaksi satu rentang tanggal; bawaan bulan berjalan (di SQL). */
export function ambilDaftarTransaksi(
  userId: number, dari: string | null, sampai: string | null,
) {
  return daftarTransaksi(userId, dari, sampai);
}

/**
 * Kalimat bebas -> USULAN baris penjualan — fitur 2 (suara) dan ketikan bebas.
 *
 * ★ TIDAK MENYIMPAN APA PUN. Ini hasil ekstraksi AI, jadi aturan #2 berlaku:
 * semuanya harus lewat layar konfirmasi manusia dulu. Bentuk keluarannya
 * sengaja cocok dengan POST /transaksi, sehingga komponen baris yang sama
 * bisa dipakai untuk suara, foto, dan ketik manual.
 */
export async function usulkanTransaksiDariTeks(
  userId: number, teks: string, tanggal: string | null,
): Promise<UsulanTransaksi> {
  let mentah;
  try {
    mentah = await ekstrakBarisPenjualan(teks);
  } catch (err) {
    console.error('[ekstraksi teks penjualan gagal]', err);
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Belum bisa dibaca. Coba ucapkan lagi lebih pelan, atau catat manual.', 502,
    );
  }

  // Pencocokan nama produk lewat SATU pintu di pesanan.service.ts — ambang
  // dan aturan selisih kandidatnya sama persis, jadi suara dan chat tidak
  // pernah berperilaku berbeda untuk nama yang sama.
  const baris: BarisUsulan[] = [];
  for (const m of mentah) {
    const cocok = await cocokkanNamaProduk(userId, m.nama_mentah!);
    // Keraguan datang dari dua arah: pencocokan nama (pg_trgm) dan penyaring
    // deterministik di transaksi.llm.ts. Keduanya tampil sebagai satu penanda
    // supaya layar konfirmasi cukup melihat satu field.
    const ragu = m.ragu ?? (m.jumlah == null ? 'jumlahnya tidak disebut' : null);
    baris.push({
      nama_mentah: m.nama_mentah!,
      produk_id: cocok.perluDicek ? null : cocok.produkId,
      nama_produk: cocok.perluDicek ? null : cocok.nama_produk,
      jumlah: m.jumlah,
      harga_satuan: m.harga_satuan,
      perlu_dicek: cocok.perluDicek || ragu !== null,
      ...(ragu !== null ? { alasan_ragu: ragu } : {}),
      kandidat: cocok.kandidat,
    });
  }

  return {
    tanggal: tanggal ?? new Date().toISOString().slice(0, 10),
    baris,
  };
}
