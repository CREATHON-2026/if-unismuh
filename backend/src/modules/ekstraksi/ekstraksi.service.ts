import { GalatTampil } from '../../lib/http.ts';
import {
  KODE_GALAT,
  type BarisEkstraksi, type BarisKonfirmasi,
  type EkstraksiRes, type PratinjauEkstraksiRes,
} from '../../../../shared/types.ts';
import { ekstrakBarisPenjualan } from '../transaksi/transaksi.llm.ts';
import { cocokkanNamaProduk } from '../pesanan/pesanan.service.ts';
import { ProdukTidakSah } from '../transaksi/transaksi.queries.ts';
import {
  hitungBaris, simpanEkstraksi, konfirmasi, EkstraksiTidakSah,
} from './ekstraksi.queries.ts';

/**
 * Service ekstraksi — logika domain layar konfirmasi, tanpa Express.
 *
 * Satu bentuk untuk foto, suara, dan ketikan bebas. Komponen barisnya sama
 * untuk ketiganya, jadi menambah jalan masuk baru tidak berarti menambah
 * layar baru.
 */

/**
 * Teks bebas -> usulan baris + subtotal, tersimpan berstatus `menunggu`.
 *
 * ★ TIDAK MENYIMPAN KE `transaksi`. Hasilnya mendarat di tabel `ekstraksi`,
 * dan baru pindah setelah `konfirmasiEkstraksi` dipanggil. Aturan #2,
 * ditegakkan struktur tabelnya sendiri.
 */
export async function usulanEkstraksiDariTeks(
  userId: number, teks: string,
): Promise<EkstraksiRes> {
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

  // Cocokkan nama ke produk tersimpan lewat SATU pintu di pesanan.service.ts —
  // supaya satu nama tidak diperlakukan berbeda di tiap jalur.
  const dicocokkan = await Promise.all(
    mentah.map(async (b, i) => ({
      urutan: i + 1,
      mentah: b,
      cocok: await cocokkanNamaProduk(userId, b.nama_mentah!),
    })),
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
      // Nama tetap tampil meski perlu dicek — pengguna membetulkan dari
      // dugaan yang terlihat, bukan dari kolom kosong.
      nama_produk: d.cocok.nama_produk,
      jumlah: d.mentah.jumlah ?? 1,
      harga_satuan: h?.harga_satuan ?? d.mentah.harga_satuan,
      subtotal: h?.subtotal ?? 0,
      tanggal: null,
      // Skor pencocokan pg_trgm yang benar-benar diukur, bukan angka karangan.
      // Nama yang tidak cocok sama sekali berskor 0, dan itu jujur.
      keyakinan: d.cocok.skor ?? 0,
      perlu_dicek: d.cocok.perluDicek || d.mentah.jumlah == null || d.mentah.ragu != null,
      ...(d.mentah.ragu != null
        ? { alasan_ragu: d.mentah.ragu }
        : d.mentah.jumlah == null ? { alasan_ragu: 'jumlahnya tidak disebut' } : {}),
    };
  });

  const ekstraksiId = await simpanEkstraksi(userId, 'suara', { teks, mentah });

  return {
    ekstraksi_id: ekstraksiId,
    baris,
    total_item: dihitung[0]?.total_item ?? 0,
    total_belanja: dihitung[0]?.total_belanja ?? 0,
  };
}

/**
 * Hitung ulang subtotal & total untuk baris yang sedang disunting.
 * Ada supaya frontend TIDAK PERNAH perlu mengalikan jumlah dengan harga
 * sendiri — aturan #7. Tidak menyimpan apa pun.
 */
export async function hitungPratinjau(
  userId: number, baris: BarisKonfirmasi[],
): Promise<PratinjauEkstraksiRes> {
  const dihitung = await hitungBaris(userId, baris);
  return {
    baris: dihitung.map((h) => ({ urutan: h.urutan, subtotal: h.subtotal })),
    total_item: dihitung[0]?.total_item ?? 0,
    total_belanja: dihitung[0]?.total_belanja ?? 0,
  };
}

/**
 * Satu-satunya jalan hasil AI masuk ke `transaksi` — aturan #2.
 * Konfirmasi kedua atas ekstraksi yang sama ditolak di SQL (status menunggu).
 */
export async function konfirmasiEkstraksi(
  userId: number, ekstraksiId: number, baris: BarisKonfirmasi[],
): Promise<number> {
  try {
    return await konfirmasi(userId, ekstraksiId, baris, 'suara');
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
}
