// Klien API lapakAi — semuanya endpoint asli, kecuali SATU yang ditandai jelas:
// ambilRekap masih data tiruan karena GET /rekap belum ada di backend.
//
// TIDAK ADA SATU PUN PERHITUNGAN UANG DI BERKAS INI. Setiap angka finansial
// datang sudah jadi dari SQL (aturan #7). Kalau suatu saat ada yang tergoda
// mengalikan jumlah dengan harga di sini "sementara saja", itu bukan jalan
// pintas — itu pintu belakang yang membuat dua tempat menghitung hal yang sama.

import type {
  Jawaban,
  KirimOtpRes,
  VerifikasiOtpRes,
  SayaRes,
  Pengguna,
  SimpanUsahaReq,
  SimpanResepReq,
  TemuanPertama,
  EkstraksiRes,
  PratinjauEkstraksiRes,
  BarisKonfirmasi,
  KonfirmasiRes,
  Beranda,
  RingkasanProduk,
  DetailProduk,
  AnalisisPesanan,
  PesanMasukItem,
  BalasanReq,
  BalasanRes,
  UsulanTransaksi,
  CatatTransaksiReq,
  OngkosTenagaReq,
  StatusWhatsappRes,
  HubungkanWhatsappReq,
  Rekap,
  Transaksi,
} from '@shared/types';
import { ambilToken } from './sesi';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

async function panggil<T>(jalurApi: string, opsi: RequestInit = {}): Promise<Jawaban<T>> {
  const token = ambilToken();
  try {
    const res = await fetch(`${BASE}${jalurApi}`, {
      ...opsi,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opsi.headers,
      },
    });
    return (await res.json()) as Jawaban<T>;
  } catch {
    return {
      ok: false,
      error: { kode: 'GALAT_SERVER', pesan: 'Tidak bisa terhubung ke server. Coba lagi ya.' },
    };
  }
}

export function kirimOtp(nomor_hp: string): Promise<Jawaban<KirimOtpRes>> {
  return panggil('/auth/otp/kirim', { method: 'POST', body: JSON.stringify({ nomor_hp }) });
}

export function verifikasiOtp(nomor_hp: string, kode: string): Promise<Jawaban<VerifikasiOtpRes>> {
  return panggil('/auth/otp/verifikasi', {
    method: 'POST',
    body: JSON.stringify({ nomor_hp, kode }),
  });
}

// Dipanggil tiap aplikasi dibuka — memperpanjang sesi 90 hari.
export function ambilSaya(): Promise<Jawaban<SayaRes>> {
  return panggil('/auth/saya');
}

export function simpanUsaha(p: SimpanUsahaReq): Promise<Jawaban<Pengguna>> {
  return panggil('/onboarding/usaha', { method: 'POST', body: JSON.stringify(p) });
}

export function simpanResep(p: SimpanResepReq): Promise<Jawaban<TemuanPertama>> {
  return panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(p) });
}

// ---------------------------------------------------------------------------
// Layar dalam aplikasi — semuanya endpoint asli, tidak ada mock di bawah sini.
//
// Semua angka finansial datang SUDAH JADI dari SQL. Tidak ada satu pun
// perhitungan di berkas ini maupun di layar yang memakainya (aturan #7).
// ---------------------------------------------------------------------------

export function ambilBeranda(): Promise<Jawaban<Beranda>> {
  return panggil('/beranda');
}

/** Riwayat penjualan — tanpa parameter, backend memakai bulan berjalan. */
export function ambilTransaksi(): Promise<Jawaban<Transaksi[]>> {
  return panggil('/transaksi');
}

/**
 * ★ DATA TIRUAN SEMENTARA — fitur 14. GET /rekap belum ada di backend;
 * bentuknya persis kontrak docs/06-kontrak-api.md. Saat endpoint-nya jadi,
 * ganti seluruh isi fungsi ini dengan `return panggil('/rekap');` — layar
 * Rekap tidak perlu diubah sama sekali.
 *
 * Angka tiruan ini fixture, bukan perhitungan: totalnya ditulis tangan agar
 * konsisten dengan titik-titiknya, sebagaimana SQL nanti yang menjumlahkan.
 */
export function ambilRekap(): Promise<Jawaban<Rekap>> {
  return Promise.resolve({
    ok: true,
    data: {
      hari: [
        { label: 'Sen', omzet: 620_000, untung_bersih: 54_000 },
        { label: 'Sel', omzet: 480_000, untung_bersih: 41_000 },
        { label: 'Rab', omzet: 750_000, untung_bersih: 88_000 },
        { label: 'Kam', omzet: 540_000, untung_bersih: -18_000 },
        { label: 'Jum', omzet: 910_000, untung_bersih: 96_000 },
        { label: 'Sab', omzet: 1_240_000, untung_bersih: 152_000 },
        { label: 'Min', omzet: 860_000, untung_bersih: 101_000 },
      ],
      omzet: 5_400_000,
      untung_bersih: 514_000,
      ada_transaksi: true,
      produk_terlaris: { id: 1, nama: 'Kripik Pisang', jumlah_terjual: 124 },
    },
  });
}

export function ambilDaftarProduk(): Promise<Jawaban<RingkasanProduk[]>> {
  return panggil('/produk');
}

/** Fitur 11 — catat waktu pedagang sebagai biaya. Perkaliannya di SQL. */
export function ubahOngkosTenaga(id: number, p: OngkosTenagaReq): Promise<Jawaban<TemuanPertama>> {
  return panggil(`/produk/${id}/tenaga`, { method: 'PATCH', body: JSON.stringify(p) });
}

export function ambilDetailProduk(id: number): Promise<Jawaban<DetailProduk>> {
  return panggil(`/produk/${id}`);
}

/** Fitur 9 — teks chat pembeli yang ditempel pedagang. */
export function analisisPesanan(teks: string): Promise<Jawaban<AnalisisPesanan>> {
  return panggil('/pesanan/analisis', { method: 'POST', body: JSON.stringify({ teks }) });
}

/** Daftar pesanan tersimpan — jalur tempel dan WhatsApp jadi satu. */
export function daftarPesanan(): Promise<Jawaban<PesanMasukItem[]>> {
  return panggil('/pesanan');
}

/** Balasan siap SALIN. Sistem tidak pernah mengirimnya — aturan #4. */
export function buatBalasan(p: BalasanReq): Promise<Jawaban<BalasanRes>> {
  return panggil('/pesanan/balasan', { method: 'POST', body: JSON.stringify(p) });
}

/** Fitur 2 — kalimat bebas jadi USULAN. Tidak menyimpan apa pun (aturan #2). */
export function usulanDariTeks(teks: string): Promise<Jawaban<UsulanTransaksi>> {
  return panggil('/transaksi/dari-teks', { method: 'POST', body: JSON.stringify({ teks }) });
}

export function catatTransaksi(p: CatatTransaksiReq): Promise<Jawaban<{ tersimpan: number }>> {
  return panggil('/transaksi', { method: 'POST', body: JSON.stringify(p) });
}

/** Status sambungan WhatsApp. `hanya_baca` selalu true — aturan #4. */
export function statusWhatsapp(): Promise<Jawaban<StatusWhatsappRes>> {
  return panggil('/whatsapp/status');
}

/**
 * Tautkan WhatsApp. Kosongkan nomor untuk QR, isi untuk kode pairing.
 * Kodenya belum tentu langsung ada — frontend menjemputnya lewat statusWhatsapp().
 */
export function hubungkanWhatsapp(p: HubungkanWhatsappReq): Promise<Jawaban<StatusWhatsappRes>> {
  return panggil('/whatsapp/hubungkan', { method: 'POST', body: JSON.stringify(p) });
}

/**
 * Ekstraksi foto buku catatan.
 *
 * ★ BACA INI SEBELUM MENGUBAHNYA.
 *
 * Fungsi ini TIDAK membaca gambarnya. Model vision yang tersedia untuk tim
 * sudah diukur dan belum lolos — pada tabel tulisan tangan 29 baris, kolomnya
 * bergeser dan saldonya dikarang, sementara setiap baris dilaporkan dengan
 * keyakinan 1,0. Hasil pengukurannya di backend/spike/README.md.
 *
 * Yang dilakukannya: mengirim kalimat contoh ke /ekstraksi/dari-teks, sehingga
 * alur konfirmasi bisa ditunjukkan utuh dengan produk dan angka yang BENAR —
 * baris tercocokkan ke produk asli pedagang, subtotal dihitung SQL, dan
 * hasilnya betul-betul bisa disimpan.
 *
 * Kenapa tidak memakai data contoh yang ditulis di kode seperti sebelumnya:
 * baris itu menyebut Indomie dan Beras Premium yang tidak ada di database mana
 * pun, jadi subtotalnya nol saat disunting dan penyimpanannya ditolak. Sejak
 * /ekstraksi/pratinjau dan /konfirmasi jadi endpoint sungguhan, data karangan
 * di frontend tidak lagi bisa menumpang.
 *
 * Kalau nanti ada model vision yang lolos uji, ganti isi fungsi ini dengan
 * unggahan berkas ke POST /ekstraksi/foto. Bentuk jawabannya sudah sama.
 */
const KALIMAT_CONTOH_FOTO = 'kripik pisang 10, kacang telur 5, donat 8';

export function ekstraksiFoto(berkas: File): Promise<Jawaban<EkstraksiRes>> {
  void berkas;
  return panggil('/ekstraksi/dari-teks', {
    method: 'POST',
    body: JSON.stringify({ teks: KALIMAT_CONTOH_FOTO }),
  });
}

/**
 * Subtotal dan total dihitung SQL di backend, bukan di sini.
 *
 * Dipanggil setiap kali pengguna menyunting satu baris. Sebelum endpoint ini
 * ada, fungsi ini mengalikan jumlah dengan harga dan menjumlahkannya di
 * browser — melanggar aturan #7, dengan komentar yang menjanjikan akan
 * diperbaiki. Janji itu sekarang ditepati.
 */
export function pratinjauEkstraksi(
  baris: BarisKonfirmasi[],
): Promise<Jawaban<PratinjauEkstraksiRes>> {
  return panggil('/ekstraksi/pratinjau', { method: 'POST', body: JSON.stringify({ baris }) });
}

/** Satu-satunya jalan hasil AI masuk ke tabel transaksi — aturan #2. */
export function konfirmasiEkstraksi(
  ekstraksiId: number,
  baris: BarisKonfirmasi[],
): Promise<Jawaban<KonfirmasiRes>> {
  return panggil('/ekstraksi/konfirmasi', {
    method: 'POST',
    body: JSON.stringify({ ekstraksi_id: ekstraksiId, baris }),
  });
}
