// Klien API lapakAi — semuanya endpoint asli, tidak ada mock yang tersisa.
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
  BalasanReq,
  BalasanRes,
  UsulanTransaksi,
  CatatTransaksiReq,
  StatusWhatsappRes,
  HubungkanWhatsappReq,
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

export function ambilDaftarProduk(): Promise<Jawaban<RingkasanProduk[]>> {
  return panggil('/produk');
}

export function ambilDetailProduk(id: number): Promise<Jawaban<DetailProduk>> {
  return panggil(`/produk/${id}`);
}

/** Fitur 9 — teks chat pembeli yang ditempel pedagang. */
export function analisisPesanan(teks: string): Promise<Jawaban<AnalisisPesanan>> {
  return panggil('/pesanan/analisis', { method: 'POST', body: JSON.stringify({ teks }) });
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
 * Ekstraksi foto — BELUM tersedia, dan itu dikatakan apa adanya.
 *
 * Sebelumnya fungsi ini mengembalikan tiga baris contoh (indomie, gula pasir,
 * beras) lengkap dengan subtotal. Baris itu tidak pernah ada di buku pedagang
 * mana pun. Menampilkannya di layar konfirmasi seolah hasil membaca foto adalah
 * persis kegagalan yang paling kami takuti sendiri: angka yang salah tapi
 * tampil meyakinkan.
 *
 * Model vision yang tersedia untuk kami sudah diukur dan belum lolos — lihat
 * backend/spike/README.md. Sampai lolos, jalur ini menolak dengan jujur dan
 * menunjuk jalan yang benar-benar jalan.
 */
export function ekstraksiFoto(berkas: File): Promise<Jawaban<EkstraksiRes>> {
  void berkas;
  return Promise.resolve({
    ok: false,
    error: {
      kode: 'EKSTRAKSI_GAGAL',
      pesan: 'Membaca foto buku belum bisa diandalkan, jadi belum kami aktifkan. '
        + 'Sementara ini catat dengan suara — hasilnya masuk ke layar yang sama.',
    },
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
