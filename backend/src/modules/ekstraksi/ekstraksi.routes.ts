import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import {
  KODE_GALAT,
  type BarisEkstraksi, type BarisKonfirmasi,
  type EkstraksiRes, type PratinjauEkstraksiRes,
} from '../../../../shared/types.ts';
import { ekstrakBarisPenjualan } from '../transaksi/transaksi.ekstraksi.ts';
import { cariKandidatProduk, putuskanCocok } from '../pesanan/pesanan.queries.ts';
import { ProdukTidakSah } from '../transaksi/transaksi.queries.ts';
import {
  hitungBaris, simpanEkstraksi, konfirmasi, EkstraksiTidakSah,
} from './ekstraksi.queries.ts';

export const rutEkstraksi = Router();
rutEkstraksi.use(wajibLogin);

/**
 * Bentuk yang dipakai layar konfirmasi frontend — satu bentuk untuk foto,
 * suara, dan ketikan bebas. Komponen barisnya sama untuk ketiganya, jadi
 * menambah jalan masuk baru tidak berarti menambah layar baru.
 */

function bacaBarisKonfirmasi(mentah: unknown): BarisKonfirmasi[] {
  if (!Array.isArray(mentah) || mentah.length === 0) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada baris yang dikirim.');
  }
  return mentah.map((b, i) => {
    const jumlah = Number(b?.jumlah);
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Jumlahnya harus lebih dari 0.');
    }
    return {
      urutan: Number.isInteger(Number(b?.urutan)) ? Number(b.urutan) : i + 1,
      produk_id: b?.produk_id == null ? null : Number(b.produk_id),
      jumlah,
      harga_satuan: b?.harga_satuan == null ? null : Number(b.harga_satuan),
      tanggal: b?.tanggal ? String(b.tanggal) : null,
    };
  });
}

/**
 * POST /ekstraksi/dari-teks
 *
 * ★ TIDAK MENYIMPAN KE `transaksi`. Hasilnya mendarat di tabel `ekstraksi`
 * berstatus `menunggu`, dan baru pindah setelah /ekstraksi/konfirmasi dipanggil.
 * Aturan #2, ditegakkan struktur tabelnya sendiri.
 */
rutEkstraksi.post('/dari-teks', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Belum ada yang diucapkan atau diketik.');
  }

  let mentah;
  try {
    mentah = await ekstrakBarisPenjualan(teks);
  } catch (err) {
    console.error('[ekstraksi dari teks gagal]', err);
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Belum bisa dibaca. Coba ucapkan lagi lebih pelan, atau catat manual.', 502,
    );
  }

  // Cocokkan nama ke produk tersimpan, memakai ambang yang sama dengan chat
  // dan suara — supaya satu nama tidak diperlakukan berbeda di tiap jalur.
  const dicocokkan = await Promise.all(
    mentah.map(async (b, i) => {
      const kandidat = await cariKandidatProduk(userId, b.nama_mentah!);
      const cocok = putuskanCocok(kandidat);
      return {
        urutan: i + 1,
        mentah: b,
        cocok,
        nama_produk: kandidat.find((k) => k.id === cocok.produkId)?.nama ?? null,
      };
    }),
  );

  // Jumlah yang tidak disebut diisi 1 DAN ditandai perlu dicek. Ini memang
  // dugaan, dan karena itu tidak boleh lolos diam-diam — layar konfirmasi
  // menampilkannya untuk dibetulkan sebelum apa pun tersimpan (aturan #8).
  const untukHitung: BarisKonfirmasi[] = dicocokkan.map((d) => ({
    urutan: d.urutan,
    produk_id: d.cocok.produkId,
    jumlah: d.mentah.jumlah ?? 1,
    harga_satuan: d.mentah.harga_satuan,
    tanggal: null,
  }));

  const dihitung = untukHitung.length > 0 ? await hitungBaris(userId, untukHitung) : [];
  const perUrutan = new Map(dihitung.map((h) => [h.urutan, h]));

  const baris: BarisEkstraksi[] = dicocokkan.map((d) => {
    const h = perUrutan.get(d.urutan);
    return {
      urutan: d.urutan,
      nama_mentah: d.mentah.nama_mentah!,
      produk_id: d.cocok.produkId,
      nama_produk: d.nama_produk,
      jumlah: d.mentah.jumlah ?? 1,
      harga_satuan: h?.harga_satuan ?? d.mentah.harga_satuan,
      subtotal: h?.subtotal ?? 0,
      tanggal: null,
      // Skor pencocokan pg_trgm yang benar-benar diukur, bukan angka karangan.
      // Nama yang tidak cocok sama sekali berskor 0, dan itu jujur.
      keyakinan: d.cocok.skor ?? 0,
      perlu_dicek: d.cocok.perluDicek || d.mentah.jumlah == null,
      ...(d.mentah.jumlah == null ? { alasan_ragu: 'jumlahnya tidak disebut' } : {}),
    };
  });

  const ekstraksiId = await simpanEkstraksi(userId, 'suara', { teks, mentah });

  const jawaban: EkstraksiRes = {
    ekstraksi_id: ekstraksiId,
    baris,
    total_item: dihitung[0]?.total_item ?? 0,
    total_belanja: dihitung[0]?.total_belanja ?? 0,
  };
  kirim(res, jawaban);
}));

/**
 * POST /ekstraksi/pratinjau
 *
 * Dipanggil setiap kali pengguna menyunting satu baris di layar konfirmasi.
 * Ada supaya frontend TIDAK PERNAH perlu mengalikan jumlah dengan harga
 * sendiri — aturan #7. Tidak menyimpan apa pun.
 */
rutEkstraksi.post('/pratinjau', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const baris = bacaBarisKonfirmasi(req.body?.baris);
  const dihitung = await hitungBaris(userId, baris);

  const jawaban: PratinjauEkstraksiRes = {
    baris: dihitung.map((h) => ({ urutan: h.urutan, subtotal: h.subtotal })),
    total_item: dihitung[0]?.total_item ?? 0,
    total_belanja: dihitung[0]?.total_belanja ?? 0,
  };
  kirim(res, jawaban);
}));

/**
 * POST /ekstraksi/konfirmasi — satu-satunya jalan hasil AI masuk ke `transaksi`.
 *
 * Foto mentahnya dihapus di sini: buku catatan berisi data usaha yang sensitif,
 * dan setelah hasilnya terstruktur, gambarnya tidak punya alasan untuk disimpan.
 */
rutEkstraksi.post('/konfirmasi', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const ekstraksiId = Number(req.body?.ekstraksi_id);
  const baris = bacaBarisKonfirmasi(req.body?.baris);

  if (!Number.isInteger(ekstraksiId)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Ekstraksinya tidak dikenali.');
  }

  try {
    const tersimpan = await konfirmasi(userId, ekstraksiId, baris, 'suara');
    kirim(res, { tersimpan, berkas_dihapus: true }, 201);
  } catch (err) {
    if (err instanceof EkstraksiTidakSah) {
      throw new GalatTampil(
        KODE_GALAT.PERMINTAAN_TIDAK_VALID,
        'Catatan ini sudah tersimpan sebelumnya. Tidak ada yang dicatat dua kali.',
      );
    }
    if (err instanceof ProdukTidakSah) {
      throw new GalatTampil(
        KODE_GALAT.PRODUK_TIDAK_DITEMUKAN,
        'Ada produk yang tidak dikenali. Tidak ada penjualan yang tersimpan.',
      );
    }
    throw err;
  }
}));
