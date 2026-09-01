import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import {
  KODE_GALAT,
  type BahanMasukan, type BahanUsulan, type DetailProduk,
  type SaranHarga, type UsulanProduk,
} from '../../../../shared/types.ts';
import { rupiah } from '../../lib/rupiah.ts';
import { daftarProduk, detailProduk, bahanProduk, saranHarga } from './produk.queries.ts';
import { ekstrakProdukBaru } from './produk.ekstraksi.ts';
// Penyimpanan produk hidup di modul onboarding karena di sanalah ia lahir.
// Dipakai ulang, BUKAN disalin: dua jalur INSERT untuk produk yang sama akan
// berbeda diam-diam saat salah satunya diubah — lihat backend/CLAUDE.md.
import { simpanResep, ambilTemuanPertama } from '../onboarding/onboarding.queries.ts';
// Pencocokan nama yang sama dengan yang dipakai suara dan chat, supaya
// "kacang telor" mengenali "Kacang Telur" yang sudah ada di semua jalur.
import { cariKandidatProduk } from '../pesanan/pesanan.queries.ts';

/**
 * Rangkai kalimat saran dari ANGKA YANG SUDAH DIHITUNG SQL.
 *
 * Tidak memakai LLM, dan itu disengaja: kalimat ini muncul di setiap layar
 * detail produk, jadi menggantungkannya pada server LLM berarti layar detail
 * ikut lambat setiap kali server itu sedang sibuk.
 */
function alasanSaran(s: { harga_impas: number; harga_disarankan: number; kenaikan: number }): string {
  return `Modal Anda ${rupiah(s.harga_impas)} per unit. Supaya untung sekitar 20%, `
    + `jual ${rupiah(s.harga_disarankan)} — naik ${rupiah(s.kenaikan)} dari harga sekarang.`;
}

export const rutProduk = Router();
rutProduk.use(wajibLogin);

/**
 * GET /produk — fitur 6.
 *
 * Diurutkan dari margin terendah, jadi produk merugi muncul lebih dulu tanpa
 * perlu dicari. Ini inti fiturnya: pedagang tidak tahu produk mana yang
 * merugikan, jadi aplikasi yang harus menunjukkannya.
 */
rutProduk.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await daftarProduk(userId));
}));

/** GET /produk/:id — rincian bahan dan riwayat penjualan. */
rutProduk.get('/:id', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Produknya tidak dikenali.');
  }

  // Query menyertakan user_id, jadi produk pedagang lain tidak akan ketemu —
  // isolasi terjadi di database, bukan dengan menyaring hasil di sini.
  const dasar = await detailProduk(id, userId);
  if (!dasar) {
    throw new GalatTampil(KODE_GALAT.PRODUK_TIDAK_DITEMUKAN, 'Produk tidak ditemukan.', 404);
  }

  const [bahan, saran] = await Promise.all([
    bahanProduk(id, userId),
    saranHarga(id, userId),
  ]);

  // null kalau tidak ada yang perlu disarankan — resep belum diisi, atau
  // harganya sudah mencapai target. Frontend menyembunyikan bagiannya.
  const saranLengkap: SaranHarga | null = saran
    ? { ...saran, alasan: alasanSaran(saran) }
    : null;

  const jawaban: DetailProduk = {
    ...dasar,
    bahan,
    saran_harga: saranLengkap,
  };

  kirim(res, jawaban);
}));

/**
 * POST /produk/dari-teks — fitur 10, tambah produk tanpa form.
 *
 * ★ TIDAK MENYIMPAN APA PUN. Ini hasil ekstraksi AI, jadi aturan #2 berlaku:
 * semuanya lewat layar konfirmasi manusia dulu. Frontend menampilkan usulannya,
 * pengguna melengkapi yang ditandai, lalu mengirim hasilnya ke POST /produk.
 *
 * Yang tidak disebut pedagang TIDAK ditebak. Ia dikembalikan kosong dan
 * ditanyakan lewat `yang_kurang` — aturan #8.
 */
rutProduk.post('/dari-teks', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada yang diucapkan atau diketik.');
  }

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

  const usulan: UsulanProduk = {
    nama_produk: mentah.nama_produk,
    hasil_per_batch: mentah.hasil_per_batch,
    harga_jual: mentah.harga_jual,
    bahan,
    produk_mirip: mentah.nama_produk
      ? await cariKandidatProduk(userId, mentah.nama_produk)
      : [],
    perlu_dicek: yangKurang.length > 0,
    yang_kurang: yangKurang,
    catatan,
  };

  kirim(res, usulan);
}));

/**
 * POST /produk — simpan produk, jalan masuk kedua selain onboarding.
 *
 * Menerima bentuk yang sama dengan yang dikeluarkan /produk/dari-teks setelah
 * dibetulkan pengguna, dan juga dipakai untuk menambah produk secara manual.
 *
 * Modal TIDAK dihitung di sini. Yang dikembalikan dibaca dari v_margin_produk
 * setelah barisnya masuk — aturan #1.
 */
rutProduk.post('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const namaProduk = String(req.body?.nama_produk ?? '').trim();
  const hargaJual = Number(req.body?.harga_jual);
  const bahan = (req.body?.bahan ?? []) as BahanMasukan[];

  if (!namaProduk) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Nama produknya belum diisi.');
  }
  if (!Number.isFinite(hargaJual) || hargaJual < 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Harga jualnya belum benar.');
  }
  if (!Array.isArray(bahan)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Daftar bahannya tidak terbaca.');
  }

  // Tanpa bahan, hasil_per_batch tidak punya arti apa-apa — dipaksa null supaya
  // tidak ada angka menggantung yang membuat modal seolah bisa dihitung.
  let hasilPerBatch: number | null = null;

  if (bahan.length > 0) {
    hasilPerBatch = Number(req.body?.hasil_per_batch);
    if (!Number.isFinite(hasilPerBatch) || hasilPerBatch <= 0) {
      throw new GalatTampil(
        KODE_GALAT.RESEP_BELUM_LENGKAP,
        'Sekali bikin jadi berapa? Isinya harus lebih dari 0.',
      );
    }
    for (const b of bahan) {
      if (!b?.nama?.trim()) {
        throw new GalatTampil(KODE_GALAT.RESEP_BELUM_LENGKAP, 'Ada bahan yang belum ada namanya.');
      }
      if (!(Number(b.jumlah) > 0) || !(Number(b.jumlah_beli) > 0) || !(Number(b.harga_beli) >= 0)) {
        throw new GalatTampil(
          KODE_GALAT.RESEP_BELUM_LENGKAP,
          `Data bahan "${b.nama}" belum lengkap: perlu jumlah dipakai, jumlah beli, dan harga beli.`,
        );
      }
    }
  }

  const produkId = await simpanResep(userId, namaProduk, hargaJual, hasilPerBatch, bahan);
  kirim(res, await ambilTemuanPertama(produkId, userId), 201);
}));
