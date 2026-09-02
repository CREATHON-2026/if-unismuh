import { GalatTampil } from '../../lib/http.ts';
import { rupiah } from '../../lib/rupiah.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import type {
  CaraBayar, Pesanan, PilihanPesanan, RiwayatPesanan, StatusPesanan, Struk,
} from '../../../../shared/types.ts';
import {
  ambilPesanan, ambilStruk, batalkanPesanan, buatPesanan, daftarPesanan,
  perbaruiStatusQris, ringkasanPesanan, selesaikanPesanan, simpanTagihanQris,
  tandaiBayar,
} from './proses.queries.ts';
import { buatTagihanQris, cekStatusQris, midtransSiap } from '../../lib/midtrans.ts';
import { cariKandidatProduk } from '../pesanan/pesanan.queries.ts';
import { daftarProduk } from '../produk/produk.queries.ts';
import { satu } from '../../db/index.ts';

/**
 * Logika alur pesanan: dibuat -> dibayar -> diserahkan -> jadi untung.
 *
 * Batas yang dijaga berkas ini:
 *   - Tidak menghitung uang. Semua angka datang dari `v_pesanan`.
 *   - Tidak menulis SQL. Itu tugas proses.queries.ts.
 *   - Tidak pernah mengirim apa pun ke nomor pembeli (aturan #4).
 */

const TIDAK_ADA = () => new GalatTampil(
  KODE_GALAT.PESANAN_TIDAK_DITEMUKAN, 'Pesanan tidak ditemukan.', 404,
);

/**
 * Milik pedagang lain dijawab 404, bukan 403.
 *
 * 403 mengakui bahwa pesanan itu ada. Itu memberi tahu orang asing bahwa
 * pedagang lain punya pesanan bernomor sekian — kebocoran kecil yang tidak ada
 * gunanya bagi siapa pun kecuali yang sedang mengintip.
 */
const SUDAH_DIPROSES = (pesan: string) => new GalatTampil(
  KODE_GALAT.PESANAN_SUDAH_DIPROSES, pesan, 409,
);

/**
 * Rangkai kalimat peringatan dari ANGKA YANG SUDAH DIHITUNG SQL.
 * Tidak menghitung apa pun — hanya membandingkan dan merangkai, sama seperti
 * `susunPeringatan` di pesanan.service.ts.
 */
function susunPeringatan(p: any): string[] {
  const pesan: string[] = [];

  if (p.modal_per_unit === null) {
    pesan.push(`Resep "${p.nama_produk}" belum diisi, jadi untung-ruginya belum bisa dihitung.`);
  } else if (p.merugi) {
    pesan.push(
      `Harga ${rupiah(p.harga_satuan)} di bawah modal ${rupiah(p.modal_per_unit)}` +
      ` — rugi ${rupiah(Math.abs(p.untung_pesanan))} untuk pesanan ini.`,
    );
  }

  if (p.stok_cukup_untuk === null) {
    pesan.push('Stok bahan belum dicatat, jadi kecukupannya belum bisa dicek.');
  } else if (p.stok_cukup_untuk < p.jumlah && p.status !== 'selesai') {
    pesan.push(`Bahan hanya cukup untuk ${p.stok_cukup_untuk} dari ${p.jumlah} yang dipesan.`);
  }

  if (p.status === 'selesai' && p.dibayar_pada === null) {
    pesan.push('Barang sudah diserahkan tapi uangnya belum diterima — ini piutang.');
  }
  return pesan;
}

/** Bentuk baris `v_pesanan` jadi jawaban API, lengkap dengan peringatannya. */
function bentuk(p: any): Pesanan {
  const { user_id, midtrans_order_id, ...sisa } = p;
  return { ...sisa, peringatan: susunPeringatan(p) } as Pesanan;
}

async function wajibAda(userId: number, id: number) {
  const p = await ambilPesanan(userId, id);
  if (!p) throw TIDAK_ADA();
  return p;
}

// ---------------------------------------------------------------------------
// Membuat pesanan
// ---------------------------------------------------------------------------

/**
 * Ubah kesepakatan jadi pesanan bernomor.
 *
 * Inilah satu-satunya titik di mana bacaan AI berubah jadi komitmen. Yang
 * disimpan adalah pilihan PEDAGANG — produk, jumlah, dan harga yang ia setujui
 * di bottom sheet — bukan tebakan model. Bacaan AI tetap utuh di `pesan_masuk`
 * supaya kalau angkanya janggal besok, masih ada yang bisa ditelusuri.
 */
export async function buatPesananBaru(
  userId: number,
  pesanId: number | null,
  produkId: number,
  jumlah: number,
  hargaSatuan: number,
): Promise<Pesanan> {
  // Dua percobaan: `urutan_harian` dihitung dari MAX lalu dijaga UNIQUE, jadi
  // dua permintaan bersamaan bisa bertabrakan. Yang kalah mencoba sekali lagi
  // dengan angka yang sudah bergeser. Membiarkannya jadi galat 500 berarti
  // pedagang melihat "ada gangguan" untuk pesanan yang sebenarnya sah.
  let id: number | null = null;
  for (let percobaan = 0; percobaan < 2 && id === null; percobaan++) {
    try {
      id = await buatPesanan(userId, pesanId, produkId, jumlah, hargaSatuan);
    } catch (err) {
      if (percobaan === 1) throw err;
    }
  }

  // Nol baris berarti produknya — atau pesannya — bukan milik pengguna ini.
  // Diperiksa di dalam SQL, jadi tidak ada jendela waktu antara memeriksa dan
  // menyimpan.
  if (id === null) throw TIDAK_ADA();

  return bentuk(await ambilPesanan(userId, id));
}

export async function ambilSatu(userId: number, id: number): Promise<Pesanan> {
  return bentuk(await wajibAda(userId, id));
}

// ---------------------------------------------------------------------------
// Langkah 1 — pembayaran
// ---------------------------------------------------------------------------

/**
 * Catat cara pembayaran, lalu majukan ke tahap penyerahan.
 *
 * BUKU BESAR BELUM DISENTUH DI SINI. Uang masuk bukan berarti barang keluar;
 * pesanan yang sudah dibayar tapi belum diserahkan adalah titipan, bukan
 * penjualan. Untungnya baru dihitung di langkah berikutnya.
 */
export async function bayar(userId: number, id: number, cara: CaraBayar): Promise<Pesanan> {
  const p = await wajibAda(userId, id);

  if (p.status !== 'menunggu_bayar') {
    throw SUDAH_DIPROSES(
      p.status === 'batal'
        ? 'Pesanan ini sudah dibatalkan.'
        : 'Pembayaran pesanan ini sudah dicatat sebelumnya.',
    );
  }

  if (cara === 'qris') {
    if (!midtransSiap()) {
      throw new GalatTampil(
        KODE_GALAT.PERMINTAAN_TIDAK_VALID,
        'Pembayaran QRIS belum aktif. Pakai tunai atau transfer dulu.', 503,
      );
    }
    // gross DIBACA ULANG dari SQL, tidak diterima dari layar. Angka yang datang
    // dari browser bisa diubah siapa pun sebelum sampai ke sini.
    const tagihan = await buatTagihanQris(id, p.nilai_pesanan, p.nama_produk ?? 'Pesanan', p.jumlah);
    await simpanTagihanQris(userId, id, tagihan.orderId, tagihan.url, tagihan.status);

    // Statusnya SENGAJA tetap 'menunggu_bayar': QR sudah dibuat, uangnya belum
    // masuk. Yang memajukannya adalah hasil pengecekan ke Midtrans, bukan
    // keberhasilan membuat tautannya.
    return bentuk(await ambilPesanan(userId, id));
  }

  if (!await tandaiBayar(userId, id, cara)) {
    throw SUDAH_DIPROSES('Pembayaran pesanan ini sudah dicatat sebelumnya.');
  }
  return bentuk(await ambilPesanan(userId, id));
}

/** Tanya Midtrans apakah QR-nya sudah dibayar. Dipanggil berkala oleh layar. */
export async function cekBayar(userId: number, id: number): Promise<Pesanan> {
  const p = await wajibAda(userId, id);
  if (!p.midtrans_order_id || !midtransSiap()) return bentuk(p);

  try {
    const hasil = await cekStatusQris(p.midtrans_order_id);
    await perbaruiStatusQris(userId, id, hasil.status, hasil.lunas);
  } catch (err) {
    // Midtrans tidak terjangkau bukan alasan menggagalkan layar. Pedagang tetap
    // bisa menandai tunai, dan status terakhir yang diketahui tetap tampil.
    console.error('[cek status midtrans gagal]', err);
  }
  return bentuk(await ambilPesanan(userId, id));
}

// ---------------------------------------------------------------------------
// Langkah 2 — penyerahan barang
// ---------------------------------------------------------------------------

/**
 * Barang diserahkan: tulis buku besar, kurangi stok, untung naik.
 *
 * INI SATU-SATUNYA JALAN dari pesanan ke `transaksi`, dan pedagang harus
 * menekan tombolnya sendiri (aturan #2). Tidak ada penjadwal, tidak ada
 * penyelesaian otomatis saat pembayaran masuk.
 */
export async function selesaikan(userId: number, id: number): Promise<Pesanan> {
  const p = await wajibAda(userId, id);

  const transaksiId = await selesaikanPesanan(userId, id);
  if (transaksiId === null) {
    // Sengaja menjelaskan SEBABNYA, bukan sekadar menolak. Pedagang yang
    // menekan tombol dan melihat "gagal" akan menekannya lagi.
    throw SUDAH_DIPROSES(
      p.status === 'selesai' ? 'Pesanan ini sudah selesai dan sudah tercatat.'
        : p.status === 'batal' ? 'Pesanan ini sudah dibatalkan.'
          : 'Catat pembayarannya dulu sebelum menyerahkan barang.',
    );
  }
  return bentuk(await ambilPesanan(userId, id));
}

export async function batalkan(userId: number, id: number, alasan: string): Promise<Pesanan> {
  const p = await wajibAda(userId, id);

  if (!await batalkanPesanan(userId, id, alasan)) {
    throw SUDAH_DIPROSES(
      p.status === 'selesai'
        // Buku besar tidak diedit. Membatalkan penjualan yang sudah tercatat
        // akan membuat untung bulan ini berubah surut, dan pedagang yang sudah
        // melihat angkanya kemarin tidak akan tahu kenapa ia berubah.
        ? 'Pesanan ini sudah selesai dan sudah masuk pembukuan, jadi tidak bisa dibatalkan.'
        : 'Pesanan ini sudah dibatalkan sebelumnya.',
    );
  }
  return bentuk(await ambilPesanan(userId, id));
}

// ---------------------------------------------------------------------------
// Riwayat, pilihan, struk
// ---------------------------------------------------------------------------

export async function riwayat(
  userId: number, status: StatusPesanan | null,
): Promise<RiwayatPesanan> {
  const [daftar, ringkasan] = await Promise.all([
    daftarPesanan(userId, status),
    // Ringkasan SELALU menghitung seluruh pesanan, tidak ikut disaring: pedagang
    // yang sedang melihat tab "Gagal" tetap perlu tahu untung totalnya.
    ringkasanPesanan(userId),
  ]);
  return { daftar: daftar.map(bentuk), ringkasan: ringkasan as RiwayatPesanan['ringkasan'] };
}

/**
 * Isi bottom sheet: tebakan AI, kandidat mirip, dan seluruh produk pedagang.
 *
 * Kandidat dicari ULANG lewat `cariKandidatProduk` — pintu pencocokan nama yang
 * sama dipakai saat pesan pertama masuk. Kalau disalin ke query lain, dua
 * tempat akan mencocokkan nama dengan cara berbeda begitu salah satunya diubah.
 * Mencari ulang juga berarti produk yang baru ditambahkan pedagang tadi pagi
 * ikut muncul, padahal saat pesannya masuk semalam produk itu belum ada.
 */
export async function pilihanUntukPesan(userId: number, pesanId: number): Promise<PilihanPesanan> {
  const pesan = await satu(
    `SELECT id, nama_produk_mentah, jumlah, harga_diminta, perlu_dicek
     FROM pesan_masuk WHERE id = $1 AND user_id = $2`,
    [pesanId, userId],
  );
  if (!pesan) throw TIDAK_ADA();

  const [kandidat, produk] = await Promise.all([
    pesan.nama_produk_mentah ? cariKandidatProduk(userId, pesan.nama_produk_mentah) : [],
    daftarProduk(userId),
  ]);

  return {
    pesan_id: pesan.id,
    nama_produk_mentah: pesan.nama_produk_mentah,
    jumlah: pesan.jumlah,
    harga_diminta: pesan.harga_diminta,
    perlu_dicek: pesan.perlu_dicek,
    kandidat,
    produk,
  };
}

export async function struk(userId: number, id: number): Promise<Struk> {
  const s = await ambilStruk(userId, id);
  if (!s) throw TIDAK_ADA();
  return s as Struk;
}
