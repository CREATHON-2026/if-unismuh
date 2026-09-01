import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import {
  KODE_GALAT,
  type BarisTransaksi, type BarisUsulan, type UsulanTransaksi,
} from '../../../../shared/types.ts';
import { simpanTransaksi, daftarTransaksi, ProdukTidakSah } from './transaksi.queries.ts';
import { ekstrakBarisPenjualan } from './transaksi.ekstraksi.ts';
import { cariKandidatProduk, putuskanCocok } from '../pesanan/pesanan.queries.ts';

export const rutTransaksi = Router();
rutTransaksi.use(wajibLogin);

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /transaksi — fitur 3, ketik manual.
 *
 * Menerima banyak baris sekaligus. TIDAK lewat layar konfirmasi: aturan #2
 * mengatur hasil AI, sedangkan yang diketik manusia sudah dikonfirmasi saat
 * diketik.
 *
 * Ini juga lantai dasar yang menahan semuanya — kalau foto dan suara gagal,
 * jalur ini yang membuat aplikasi tetap berguna.
 */
rutTransaksi.post('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const tanggal = req.body?.tanggal ? String(req.body.tanggal) : null;
  const baris = req.body?.baris as BarisTransaksi[] | undefined;

  if (tanggal !== null && !TANGGAL.test(tanggal)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Tanggalnya belum benar.');
  }
  if (!Array.isArray(baris) || baris.length === 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada penjualan yang dicatat.');
  }

  for (const b of baris) {
    if (!Number.isInteger(Number(b?.produk_id))) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Ada baris yang produknya belum dipilih.');
    }
    if (!(Number(b.jumlah) > 0)) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Jumlahnya harus lebih dari 0.');
    }
    if (b.harga_satuan !== undefined && !(Number(b.harga_satuan) >= 0)) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Harganya belum benar.');
    }
  }

  try {
    const tersimpan = await simpanTransaksi(userId, tanggal, baris);
    kirim(res, { tersimpan }, 201);
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
}));

/** GET /transaksi?dari=&sampai= — bawaan: bulan berjalan. */
rutTransaksi.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const dari = req.query.dari ? String(req.query.dari) : null;
  const sampai = req.query.sampai ? String(req.query.sampai) : null;
  kirim(res, await daftarTransaksi(userId, dari, sampai));
}));

/**
 * POST /transaksi/dari-teks — fitur 2, dan ketikan bebas.
 *
 * Menerima kalimat apa adanya — hasil transkripsi suara di browser, atau
 * ketikan bebas — lalu MENGUSULKAN baris penjualan.
 *
 * ★ TIDAK MENYIMPAN APA PUN. Ini hasil ekstraksi AI, jadi aturan #2 berlaku:
 * semuanya harus lewat layar konfirmasi manusia dulu. Frontend menampilkan
 * usulannya, pengguna membetulkan baris yang ditandai, lalu mengirim hasilnya
 * ke POST /transaksi — yang bentuknya memang sengaja dibuat cocok, sehingga
 * komponen baris yang sama bisa dipakai untuk suara, foto, dan ketik manual.
 */
rutTransaksi.post('/dari-teks', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();
  const tanggal = req.body?.tanggal ? String(req.body.tanggal) : null;

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada yang diucapkan atau diketik.');
  }
  if (tanggal !== null && !TANGGAL.test(tanggal)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Tanggalnya belum benar.');
  }

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

  // Pencocokan nama produk memakai pg_trgm yang sudah teruji di modul pesanan —
  // ambang dan aturan selisih kandidatnya sama persis, jadi suara dan chat
  // tidak pernah berperilaku berbeda untuk nama yang sama.
  const baris: BarisUsulan[] = [];
  for (const m of mentah) {
    const kandidat = await cariKandidatProduk(userId, m.nama_mentah!);
    const cocok = putuskanCocok(kandidat);
    baris.push({
      nama_mentah: m.nama_mentah!,
      produk_id: cocok.perluDicek ? null : cocok.produkId,
      nama_produk: cocok.perluDicek
        ? null
        : (kandidat.find((k) => k.id === cocok.produkId)?.nama ?? null),
      jumlah: m.jumlah,
      harga_satuan: m.harga_satuan,
      perlu_dicek: cocok.perluDicek,
      kandidat: cocok.kandidat,
    });
  }

  const jawaban: UsulanTransaksi = {
    tanggal: tanggal ?? new Date().toISOString().slice(0, 10),
    baris,
  };
  kirim(res, jawaban);
}));
