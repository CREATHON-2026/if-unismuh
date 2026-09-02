import { GalatTampil } from '../../lib/http.ts';
import { rupiah } from '../../lib/rupiah.ts';
import { llmSiap } from '../../lib/llm.ts';
import { KODE_GALAT, MAKSUD, type TanyaRes } from '../../../../shared/types.ts';
import { ringkasanPenjualan } from '../beranda/beranda.queries.ts';
import { cocokkanNamaProduk } from '../pesanan/pesanan.service.ts';
import { bacaMaksud } from './tanya.llm.ts';
import {
  kapasitasProduk, modalProduk, produkMerugi, produkTerlaris, saranHarga,
} from './tanya.queries.ts';
import type { HasilBacaMaksud } from './tanya.types.ts';

/**
 * Perangkaian chatbot: LLM membaca maksud, SQL menghitung, template berbicara.
 *
 * Satu aturan yang mengikat seluruh berkas ini:
 *
 *   SETIAP ANGKA YANG MUNCUL DI `jawaban` HARUS DIBACA DARI `acuan`.
 *
 * Bukan dari variabel lain, bukan dari hasil perkalian, bukan dari angka yang
 * diketik langsung ke dalam kalimat. `acuan` diisi lebih dulu dari hasil SQL,
 * lalu kalimatnya disusun dengan membaca kembali isi `acuan` itu.
 *
 * Kelihatannya berputar-putar. Memang, dan itu gunanya: kalau kalimatnya
 * menyebut angka yang tidak ada di `acuan`, ada yang salah — dan
 * scripts/uji-tanya.mjs akan menemukannya.
 *
 * Modul ini TIDAK PERNAH menulis ke database. Permintaan mencatat dialihkan ke
 * layar Catat yang sudah punya konfirmasi manusia (aturan #2).
 */

type Acuan = Record<string, number | string>;

/** Bentuk jawaban baku, supaya tidak ada cabang yang lupa mengisi satu field. */
function jawab(
  maksud: TanyaRes['maksud'], jawaban: string,
  acuan: Acuan | null = null, peringatan: string[] = [],
): TanyaRes {
  return { maksud, jawaban, acuan, peringatan, alihkan_ke: null };
}

/**
 * Pertanyaan menyebut produk, tapi produknya tidak ketemu — atau tidak cukup
 * meyakinkan.
 *
 * Bertanya, bukan menebak (aturan #8). Menebak produk yang salah di sini
 * berarti menjawab dengan angka yang benar tentang barang yang salah, dan
 * pedagang tidak punya cara tahu.
 */
function produkTidakJelas(nama: string | null, kandidat: string[]): TanyaRes {
  if (!nama) {
    return jawab(MAKSUD.TIDAK_PAHAM,
      'Produk mana yang Bapak/Ibu maksud? Sebutkan namanya, misalnya "modal kripik pisang berapa?".');
  }
  const saran = kandidat.length > 0
    ? ` Maksudnya ${kandidat.map((k) => `"${k}"`).join(' atau ')}?`
    : ' Produk itu belum ada di daftar.';
  return jawab(MAKSUD.TIDAK_PAHAM, `Saya belum yakin produk "${nama}" yang mana.${saran}`);
}

/** Cari produk yang dimaksud, lewat SATU pintu yang sama dengan Pesanan Masuk. */
type PilihanProduk =
  | { ketemu: true; produkId: number }
  | { ketemu: false; jawaban: TanyaRes };

async function pilihProduk(userId: number, nama: string | null): Promise<PilihanProduk> {
  if (!nama) return { ketemu: false, jawaban: produkTidakJelas(null, []) };
  const cocok = await cocokkanNamaProduk(userId, nama);
  if (cocok.produkId === null || cocok.perluDicek) {
    return { ketemu: false, jawaban: produkTidakJelas(nama, cocok.kandidat.map((k) => k.nama)) };
  }
  return { ketemu: true, produkId: cocok.produkId };
}

// ---------------------------------------------------------------------------
// Satu penjawab per maksud. Semuanya berpola sama: SQL -> acuan -> kalimat.
// ---------------------------------------------------------------------------

async function jawabUntungPeriode(userId: number, m: HasilBacaMaksud): Promise<TanyaRes> {
  const r = await ringkasanPenjualan(userId, m.dari, m.sampai);
  if (!r || r.jumlah_baris === 0) {
    return jawab(MAKSUD.UNTUNG_PERIODE,
      'Belum ada penjualan yang tercatat di periode ini, jadi untungnya belum bisa dihitung.',
      { jumlah_baris: 0 });
  }

  const acuan: Acuan = {
    omzet: r.omzet,
    untung_bersih: r.untung_bersih,
    jumlah_baris: r.jumlah_baris,
    baris_tanpa_modal: r.baris_tanpa_modal,
  };

  const jawaban = `Uang masuk ${rupiah(acuan.omzet as number)}, `
    + `untung bersihnya ${rupiah(acuan.untung_bersih as number)}.`;

  const peringatan = r.baris_tanpa_modal > 0
    ? [`${r.baris_tanpa_modal} penjualan belum ikut dihitung untungnya karena resep produknya belum diisi.`]
    : [];

  return { ...jawab(MAKSUD.UNTUNG_PERIODE, jawaban, acuan, peringatan) };
}

async function jawabProdukMerugi(userId: number): Promise<TanyaRes> {
  const baris = await produkMerugi(userId);
  if (baris.length === 0) {
    return jawab(MAKSUD.PRODUK_MERUGI,
      'Kabar baik — tidak ada produk yang dijual di bawah modal.', { jumlah_merugi: 0 });
  }

  const acuan: Acuan = { jumlah_merugi: baris.length };
  baris.forEach((b, i) => {
    acuan[`produk_${i + 1}`] = b.nama;
    acuan[`rugi_per_unit_${i + 1}`] = Math.abs(b.margin_per_unit);
    acuan[`harga_jual_${i + 1}`] = b.harga_jual;
    acuan[`modal_${i + 1}`] = b.modal_per_unit;
  });

  const rincian = baris.map((_, i) =>
    `${acuan[`produk_${i + 1}`]} rugi ${rupiah(acuan[`rugi_per_unit_${i + 1}`] as number)} tiap terjual satu`,
  ).join(', ');

  return jawab(MAKSUD.PRODUK_MERUGI,
    `Ada ${acuan.jumlah_merugi} produk yang dijual di bawah modal: ${rincian}.`, acuan);
}

async function jawabModalProduk(userId: number, produkId: number): Promise<TanyaRes> {
  const b = await modalProduk(userId, produkId);
  if (!b) return produkTidakJelas(null, []);

  if (b.modal_per_unit === null || b.margin_per_unit === null) {
    return jawab(MAKSUD.MODAL_PRODUK,
      `Modal "${b.nama}" belum bisa dihitung karena resepnya belum diisi.`,
      { produk: b.nama },
      [`Isi bahan dan takaran "${b.nama}" dulu supaya untung-ruginya bisa dihitung.`]);
  }

  const acuan: Acuan = {
    produk: b.nama,
    modal_per_unit: b.modal_per_unit,
    harga_jual: b.harga_jual,
    margin_per_unit: b.margin_per_unit,
  };

  const untungRugi = b.margin_per_unit < 0
    ? `rugi ${rupiah(Math.abs(acuan.margin_per_unit as number))}`
    : `untung ${rupiah(acuan.margin_per_unit as number)}`;

  return jawab(MAKSUD.MODAL_PRODUK,
    `Modal ${acuan.produk} ${rupiah(acuan.modal_per_unit as number)} per buah, `
    + `dijual ${rupiah(acuan.harga_jual as number)}, jadi ${untungRugi} tiap terjual satu.`,
    acuan);
}

async function jawabSaranHarga(userId: number, produkId: number): Promise<TanyaRes> {
  const s = await saranHarga(userId, produkId);
  if (!s) {
    // v_saran_harga menyaring produk yang harganya sudah cukup. Tidak ada baris
    // berarti tidak ada yang perlu dinaikkan — atau modalnya belum diketahui.
    const b = await modalProduk(userId, produkId);
    if (!b) return produkTidakJelas(null, []);
    if (b.modal_per_unit === null) {
      return jawab(MAKSUD.SARAN_HARGA,
        `Harga "${b.nama}" belum bisa disarankan karena resepnya belum diisi.`,
        { produk: b.nama },
        [`Isi bahan dan takaran "${b.nama}" dulu.`]);
    }
    const acuan: Acuan = { produk: b.nama, harga_jual: b.harga_jual };
    return jawab(MAKSUD.SARAN_HARGA,
      `Harga ${acuan.produk} sekarang ${rupiah(acuan.harga_jual as number)} dan itu sudah cukup — tidak perlu dinaikkan.`,
      acuan);
  }

  const acuan: Acuan = {
    produk: s.nama,
    harga_jual: s.harga_jual,
    harga_impas: s.harga_impas,
    harga_disarankan: s.harga_disarankan,
    kenaikan: s.kenaikan,
    untung_per_unit: s.untung_per_unit,
  };

  return jawab(MAKSUD.SARAN_HARGA,
    `${acuan.produk} sebaiknya dijual ${rupiah(acuan.harga_disarankan as number)}. `
    + `Sekarang ${rupiah(acuan.harga_jual as number)}, sedangkan modalnya ${rupiah(acuan.harga_impas as number)}. `
    + `Dengan harga itu untungnya ${rupiah(acuan.untung_per_unit as number)} tiap buah.`,
    acuan);
}

async function jawabKapasitas(userId: number, produkId: number): Promise<TanyaRes> {
  const k = await kapasitasProduk(userId, produkId);
  if (!k) return produkTidakJelas(null, []);

  // null berarti ada bahan yang belum pernah dicatat stoknya. Menjawab "0"
  // adalah mengaku tahu sesuatu yang tidak diketahui.
  if (k.maks_unit === null) {
    return jawab(MAKSUD.KAPASITAS_STOK,
      `Stok bahan "${k.nama}" belum lengkap dicatat, jadi belum bisa dihitung cukup untuk berapa.`,
      { produk: k.nama },
      ['Catat dulu sisa bahan di layar Stok.']);
  }

  const acuan: Acuan = { produk: k.nama, maks_unit: k.maks_unit };
  return jawab(MAKSUD.KAPASITAS_STOK,
    `Bahan yang ada cukup untuk ${acuan.maks_unit} ${acuan.produk}.`, acuan);
}

async function jawabTerlaris(userId: number, m: HasilBacaMaksud): Promise<TanyaRes> {
  const baris = await produkTerlaris(userId, m.dari, m.sampai);
  if (baris.length === 0) {
    return jawab(MAKSUD.PRODUK_TERLARIS,
      'Belum ada penjualan yang tercatat di periode ini.', { jumlah_produk: 0 });
  }

  const acuan: Acuan = { jumlah_produk: baris.length };
  baris.forEach((b, i) => {
    acuan[`produk_${i + 1}`] = b.nama;
    acuan[`terjual_${i + 1}`] = b.jumlah_terjual;
    acuan[`omzet_${i + 1}`] = b.omzet;
  });

  const rincian = baris.map((_, i) =>
    `${acuan[`produk_${i + 1}`]} ${acuan[`terjual_${i + 1}`]} buah`,
  ).join(', ');

  return jawab(MAKSUD.PRODUK_TERLARIS,
    `Yang paling laku: ${rincian}. `
    + `${acuan.produk_1} saja menghasilkan ${rupiah(acuan.omzet_1 as number)}.`,
    acuan);
}

/**
 * Pedagang sedang melaporkan penjualan, bukan bertanya.
 *
 * Tidak disimpan di sini. Layar Catat sudah punya alur yang benar — usulan
 * ditampilkan dulu, pedagang memeriksa, baru tersimpan. Menyalin alur itu ke
 * sini berarti menyediakan tempat kedua bagi aturan #2 untuk bocor.
 */
function alihkanKeCatat(teks: string): TanyaRes {
  return {
    maksud: MAKSUD.CATAT_TRANSAKSI,
    jawaban: 'Saya bukakan layar Catat — tinggal diperiksa dulu, lalu disimpan.',
    acuan: null,
    peringatan: [],
    alihkan_ke: { rute: '/catat', teks },
  };
}

const TIDAK_PAHAM = 'Maaf, saya belum bisa menjawab itu. Yang bisa saya jawab soal '
  + 'untung, modal, harga, stok, dan produk yang paling laku.';

export async function jawabPertanyaan(userId: number, pertanyaan: string): Promise<TanyaRes> {
  const bersih = pertanyaan.trim();
  if (!bersih) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pertanyaannya masih kosong.');
  }
  if (!llmSiap()) {
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Fitur tanya-jawab sedang tidak tersedia. Angka di Beranda tetap bisa dilihat seperti biasa.',
      503,
    );
  }

  const m = await bacaMaksud(bersih);

  // Maksud yang butuh produk tertentu diselesaikan namanya lebih dulu, di satu
  // tempat, supaya tidak ada cabang yang lupa memeriksa `perluDicek`.
  const butuhProduk = m.maksud === MAKSUD.MODAL_PRODUK
    || m.maksud === MAKSUD.SARAN_HARGA
    || m.maksud === MAKSUD.KAPASITAS_STOK;

  if (butuhProduk) {
    const p = await pilihProduk(userId, m.nama_produk_mentah);
    if (!p.ketemu) return p.jawaban;

    if (m.maksud === MAKSUD.MODAL_PRODUK) return jawabModalProduk(userId, p.produkId);
    if (m.maksud === MAKSUD.SARAN_HARGA) return jawabSaranHarga(userId, p.produkId);
    return jawabKapasitas(userId, p.produkId);
  }

  switch (m.maksud) {
    case MAKSUD.UNTUNG_PERIODE:   return jawabUntungPeriode(userId, m);
    case MAKSUD.PRODUK_MERUGI:    return jawabProdukMerugi(userId);
    case MAKSUD.PRODUK_TERLARIS:  return jawabTerlaris(userId, m);
    case MAKSUD.CATAT_TRANSAKSI:  return alihkanKeCatat(bersih);
    default:                      return jawab(MAKSUD.TIDAK_PAHAM, TIDAK_PAHAM);
  }
}
