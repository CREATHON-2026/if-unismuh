import { rupiah } from '../../lib/rupiah.ts';
import { GalatTampil } from '../../lib/http.ts';
import {
  KODE_GALAT,
  type BahanMasukan, type BahanUsulan, type DetailProduk, type RingkasanProduk,
  type SaranHarga, type TemuanPertama, type UsulanProduk,
} from '../../../../shared/types.ts';
import { daftarProduk, detailProduk, bahanProduk, saranHarga } from './produk.queries.ts';
import { ekstrakProdukBaru } from './produk.llm.ts';
// Penyimpanan produk hidup di modul onboarding karena di sanalah ia lahir.
// Dipakai ulang, BUKAN disalin: dua jalur INSERT untuk produk yang sama akan
// berbeda diam-diam saat salah satunya diubah — lihat backend/CLAUDE.md.
import { buatProdukDenganResep } from '../onboarding/onboarding.service.ts';
// Pencocokan nama yang sama dengan yang dipakai suara dan chat, supaya
// "kacang telor" mengenali "Kacang Telur" yang sudah ada di semua jalur.
import { cocokkanNamaProduk } from '../pesanan/pesanan.service.ts';
import type { SaranMentah } from './produk.types.ts';

/**
 * Service produk — logika domain, tanpa Express.
 * SQL di produk.queries.ts, bacaan LLM di produk.llm.ts.
 */

/**
 * Rangkai kalimat saran dari ANGKA YANG SUDAH DIHITUNG SQL.
 *
 * Tidak memakai LLM, dan itu disengaja: kalimat ini muncul di setiap layar
 * detail produk, jadi menggantungkannya pada server LLM berarti layar detail
 * ikut lambat setiap kali server itu sedang sibuk.
 */
function alasanSaran(s: SaranMentah): string {
  return `Modal Anda ${rupiah(s.harga_impas)} per unit. Supaya untung sekitar 20%, `
    + `jual ${rupiah(s.harga_disarankan)} — naik ${rupiah(s.kenaikan)} dari harga sekarang.`;
}

/** Daftar produk, diurutkan SQL dari margin terendah — fitur 6. */
export function ambilDaftarProduk(userId: number): Promise<RingkasanProduk[]> {
  return daftarProduk(userId);
}

/**
 * Detail satu produk: rincian bahan, riwayat, dan saran harga.
 * null kalau produknya tidak ada ATAU bukan milik pengguna ini — query
 * menyertakan user_id, isolasi terjadi di database.
 */
export async function ambilDetailProduk(
  id: number, userId: number,
): Promise<DetailProduk | null> {
  const dasar = await detailProduk(id, userId);
  if (!dasar) return null;

  const [bahan, saran] = await Promise.all([
    bahanProduk(id, userId),
    saranHarga(id, userId),
  ]);

  // null kalau tidak ada yang perlu disarankan — resep belum diisi, atau
  // harganya sudah mencapai target. Frontend menyembunyikan bagiannya.
  const saranLengkap: SaranHarga | null = saran
    ? { ...saran, alasan: alasanSaran(saran) }
    : null;

  return { ...dasar, bahan, saran_harga: saranLengkap };
}

/**
 * Kalimat bebas -> USULAN produk baru — fitur 10, tambah produk tanpa form.
 *
 * ★ TIDAK MENYIMPAN APA PUN. Ini hasil ekstraksi AI, jadi aturan #2 berlaku:
 * semuanya lewat layar konfirmasi manusia dulu. Yang tidak disebut pedagang
 * TIDAK ditebak — ia dikembalikan kosong dan ditanyakan lewat `yang_kurang`.
 * Aturan #8.
 */
export async function usulkanProdukDariTeks(
  userId: number, teks: string,
): Promise<UsulanProduk> {
  let mentah;
  try {
    mentah = await ekstrakProdukBaru(teks);
  } catch (err) {
    console.error('[ekstraksi produk baru gagal]', err);
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Belum bisa dibaca. Coba sebutkan lagi lebih pelan, atau isi manual.', 502,
    );
  }

  const bahan: BahanUsulan[] = mentah.bahan.map((b) => ({
    nama: b.nama!,
    satuan: b.satuan,
    jumlah: b.jumlah,
    harga_beli: b.harga_beli,
    jumlah_beli: b.jumlah_beli,
    // Resep setengah jadi menghasilkan modal yang salah TANPA pesan galat —
    // itu kegagalan paling mahal di aplikasi ini, jadi baris yang belum lengkap
    // ditahan di sini, bukan dibiarkan lolos.
    perlu_dicek: b.jumlah == null || b.harga_beli == null || b.jumlah_beli == null,
  }));

  const yangKurang: string[] = [];
  const catatan: string[] = [];

  if (mentah.nama_produk === null) yangKurang.push('Produk ini namanya apa?');
  if (mentah.harga_jual === null) yangKurang.push('Dijual berapa per satuannya?');
  if (bahan.length > 0 && mentah.hasil_per_batch === null) {
    yangKurang.push('Sekali bikin jadi berapa banyak?');
  }
  const bahanBelumLengkap = bahan.filter((b) => b.perlu_dicek);
  if (bahanBelumLengkap.length > 0) {
    yangKurang.push(
      `Lengkapi jumlah dan harga beli untuk: ${bahanBelumLengkap.map((b) => b.nama).join(', ')}.`,
    );
  }

  // Bahan kosong TIDAK memblokir. Pedagang yang buru-buru berhak mencatat
  // produknya dulu — asal akibatnya disebutkan, bukan didiamkan.
  if (bahan.length === 0) {
    catatan.push('Bahannya belum disebut, jadi modal dan untung produk ini belum bisa dihitung.');
  }

  return {
    nama_produk: mentah.nama_produk,
    hasil_per_batch: mentah.hasil_per_batch,
    harga_jual: mentah.harga_jual,
    bahan,
    produk_mirip: mentah.nama_produk
      ? (await cocokkanNamaProduk(userId, mentah.nama_produk)).kandidat
      : [],
    perlu_dicek: yangKurang.length > 0,
    yang_kurang: yangKurang,
    catatan,
  };
}

/**
 * Simpan produk baru — jalan masuk kedua selain onboarding. Modal TIDAK
 * dihitung di sini; yang dikembalikan dibaca dari v_margin_produk setelah
 * barisnya masuk. Aturan #1.
 */
export function simpanProdukBaru(
  userId: number,
  namaProduk: string,
  hargaJual: number,
  hasilPerBatch: number | null,
  bahan: BahanMasukan[],
): Promise<TemuanPertama | null> {
  return buatProdukDenganResep(userId, namaProduk, hargaJual, hasilPerBatch, bahan);
}
