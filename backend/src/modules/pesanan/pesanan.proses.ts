import { rupiah } from '../../lib/rupiah.ts';
import { geminiSiap } from '../../lib/gemini.ts';
import { GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type AnalisisPesanan } from '../../../../shared/types.ts';
import { klasifikasiPesan } from './pesanan.klasifikasi.ts';
import {
  cariKandidatProduk, putuskanCocok, hitungPesanan, simpanPesan,
  type HitungPesanan,
} from './pesanan.queries.ts';

/**
 * Pipeline Pesanan Masuk, dipakai DUA jalur masuk:
 *   1. teks yang ditempel pedagang  (sumber 'tempel')
 *   2. pesan yang dibaca dari WhatsApp (sumber 'whatsapp')
 *
 * Ditaruh di satu tempat supaya kedua jalur tidak pernah berbeda perilakunya.
 * Kalau logika ini diduplikasi, cepat atau lambat satu jalur akan menyimpan
 * sesuatu yang jalur lain menolaknya — dan tidak ada yang menyadarinya.
 */

/**
 * Susun kalimat peringatan dari ANGKA YANG SUDAH DIHITUNG SQL.
 * Fungsi ini tidak menghitung apa pun — hanya merangkai.
 */
function susunPeringatan(
  h: HitungPesanan, jumlah: number | null, perluDicek: boolean, namaMentah: string | null,
): string[] {
  const pesan: string[] = [];

  if (h.modal_per_unit === null) {
    pesan.push(`Resep "${h.nama}" belum diisi, jadi untung-ruginya belum bisa dihitung.`);
  } else if (h.merugi) {
    const rugi = h.untung_pesanan !== null
      ? ` — rugi ${rupiah(Math.abs(h.untung_pesanan))} untuk pesanan ini`
      : '';
    pesan.push(
      `Harga ${rupiah(h.harga_dipakai)} di bawah modal ${rupiah(h.modal_per_unit)}${rugi}.`,
    );
  }

  if (h.stok_cukup_untuk === null) {
    pesan.push('Stok bahan belum dicatat, jadi kecukupannya belum bisa dicek.');
  } else if (jumlah !== null && h.stok_cukup_untuk < jumlah) {
    pesan.push(`Bahan hanya cukup untuk ${h.stok_cukup_untuk} dari ${jumlah} yang dipesan.`);
  }

  if (perluDicek) {
    pesan.push(`Nama "${namaMentah}" belum pasti cocok dengan "${h.nama}" — mohon dipastikan dulu.`);
  }
  return pesan;
}

const BUKAN_PESANAN: AnalisisPesanan = {
  pesan_id: null, jenis: 'bukan_pesanan',
  produk: null, nama_produk_mentah: null, jumlah: null,
  harga_diminta: null, tanggal_dibutuhkan: null,
  perlu_dicek: false, kandidat: [],
  nilai_pesanan: null, untung_pesanan: null, merugi: null,
  stok_cukup_untuk: null, stok_kurang: null,
  peringatan: [],
};

export async function prosesPesan(
  userId: number,
  teks: string,
  sumber: 'tempel' | 'whatsapp',
  pengirimSamar: string | null = null,
): Promise<AnalisisPesanan> {
  if (!geminiSiap()) {
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Layanan pembaca pesan belum siap. Coba lagi sebentar lagi.', 503,
    );
  }

  let baca;
  try {
    baca = await klasifikasiPesan(teks);
  } catch (err) {
    console.error('[klasifikasi pesanan gagal]', err);
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Pesannya belum bisa dibaca. Coba tempel ulang, atau catat manual.', 502,
    );
  }

  // Bukan pesanan: tidak disimpan sama sekali. Pembeli tidak pernah setuju
  // datanya diproses aplikasi ini, jadi yang tidak kita butuhkan tidak kita
  // simpan. Lihat docs/08-keamanan-data.md.
  if (baca.jenis === 'bukan_pesanan') return BUKAN_PESANAN;

  // Pencocokan nama produk — deterministik lewat pg_trgm, bukan tebakan LLM.
  const kandidat = baca.nama_produk_mentah
    ? await cariKandidatProduk(userId, baca.nama_produk_mentah)
    : [];
  const cocok = baca.nama_produk_mentah
    ? putuskanCocok(kandidat)
    : { produkId: null, skor: null, perluDicek: true, kandidat: [] };

  // Semua angka di bawah ini datang dari SQL.
  const hitung = cocok.produkId
    ? await hitungPesanan(cocok.produkId, userId, baca.jumlah, baca.harga_diminta)
    : null;

  const peringatan = hitung
    ? susunPeringatan(hitung, baca.jumlah, cocok.perluDicek, baca.nama_produk_mentah)
    : [`Produk "${baca.nama_produk_mentah ?? '(tidak disebut)'}" belum ada di daftar. Tambahkan dulu supaya untung-ruginya bisa dicek.`];

  const pesanId = await simpanPesan({
    userId, teks, sumber, pengirimSamar,
    jenis: baca.jenis,
    namaProdukMentah: baca.nama_produk_mentah,
    produkId: cocok.perluDicek ? null : cocok.produkId,
    jumlah: baca.jumlah,
    hargaDiminta: baca.harga_diminta,
    tanggalDibutuhkan: baca.tanggal_dibutuhkan,
    keyakinanCocok: cocok.skor,
    perluDicek: cocok.perluDicek,
    hasilMentah: baca,
  });

  return {
    pesan_id: pesanId,
    jenis: baca.jenis,
    produk: hitung ? { id: hitung.produk_id, nama: hitung.nama } : null,
    nama_produk_mentah: baca.nama_produk_mentah,
    jumlah: baca.jumlah,
    harga_diminta: baca.harga_diminta,
    tanggal_dibutuhkan: baca.tanggal_dibutuhkan,
    perlu_dicek: cocok.perluDicek,
    kandidat: cocok.kandidat,
    nilai_pesanan: hitung?.nilai_pesanan ?? null,
    untung_pesanan: hitung?.untung_pesanan ?? null,
    merugi: hitung?.merugi ?? null,
    stok_cukup_untuk: hitung?.stok_cukup_untuk ?? null,
    stok_kurang: hitung && hitung.stok_cukup_untuk !== null && baca.jumlah !== null
      ? hitung.stok_cukup_untuk < baca.jumlah
      : null,
    peringatan,
  };
}
