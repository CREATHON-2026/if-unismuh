// Mock API — bentuk jawaban persis docs/06-kontrak-api.md.
// Angka finansial di sini HARDCODED dari contoh kontrak, bukan dihitung
// (aturan #7: frontend tidak pernah menghitung; SQL di backend yang menghitung).
// Saat endpoint asli siap, ganti isi fungsi-fungsi ini dengan fetch.

// Klien API lapakAi — endpoint asli backend (port 3000, CORS terbuka).
// Ekstraksi foto BELUM ada di backend (baru spike), jadi bagian itu masih mock
// dan angka finansialnya hardcoded dari contoh kontrak (aturan #7).

import type {
  Jawaban,
  KirimOtpRes,
  VerifikasiOtpRes,
  SayaRes,
  SimpanUsahaReq,
  SimpanResepReq,
  TemuanPertama,
  EkstraksiRes,
  PratinjauEkstraksiRes,
  BarisKonfirmasi,
  KonfirmasiRes,
} from '@shared/types';
import { ambilToken } from './sesi';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export function simpanUsaha(p: SimpanUsahaReq): Promise<Jawaban<Record<string, never>>> {
  return panggil('/onboarding/usaha', { method: 'POST', body: JSON.stringify(p) });
}

export function simpanResep(p: SimpanResepReq): Promise<Jawaban<TemuanPertama>> {
  return panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(p) });
}

const jeda = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function ekstraksiFoto(berkas: File): Promise<Jawaban<EkstraksiRes>> {
  void berkas;
  await jeda(1200);
  // MOCK — backend belum punya endpoint ekstraksi (baru spike). Contoh baris
  // + subtotal/total dari kontrak; semua angka dihitung backend nantinya.
  return {
    ok: true,
    data: {
      ekstraksi_id: 12,
      total_item: 8,
      total_belanja: 372500,
      baris: [
        {
          urutan: 1,
          nama_mentah: 'indomie grg 2 krtn',
          produk_id: 11,
          nama_produk: 'Indomie Goreng (Karton)',
          jumlah: 2,
          harga_satuan: 105000,
          subtotal: 210000,
          tanggal: '2026-09-01',
          keyakinan: 0.95,
          perlu_dicek: false,
        },
        {
          urutan: 2,
          nama_mentah: 'gula psr',
          produk_id: null,
          nama_produk: 'Gula Pasir 1kg',
          jumlah: 5,
          harga_satuan: 17500,
          subtotal: 87500,
          tanggal: '2026-09-01',
          keyakinan: 0.42,
          perlu_dicek: true,
          alasan_ragu: 'harga tidak terbaca jelas',
        },
        {
          urutan: 3,
          nama_mentah: 'beras prem 5kg',
          produk_id: 12,
          nama_produk: 'Beras Premium 5kg',
          jumlah: 1,
          harga_satuan: 75000,
          subtotal: 75000,
          tanggal: '2026-09-01',
          keyakinan: 0.91,
          perlu_dicek: false,
        },
      ],
    },
  };
}

// Usulan POST /ekstraksi/pratinjau — di backend asli ini query SQL.
// Perhitungan di bawah hanya pengganti sementara di mock, bukan tugas frontend.
export async function pratinjauEkstraksi(
  baris: BarisKonfirmasi[],
): Promise<Jawaban<PratinjauEkstraksiRes>> {
  await jeda(150);
  const rincian = baris.map((b) => ({
    urutan: b.urutan,
    subtotal: (b.jumlah ?? 0) * (b.harga_satuan ?? 0),
  }));
  return {
    ok: true,
    data: {
      baris: rincian,
      total_item: baris.reduce((a, b) => a + (b.jumlah ?? 0), 0),
      total_belanja: rincian.reduce((a, b) => a + b.subtotal, 0),
    },
  };
}

export async function konfirmasiEkstraksi(
  ekstraksiId: number,
  baris: BarisKonfirmasi[],
): Promise<Jawaban<KonfirmasiRes>> {
  void ekstraksiId;
  await jeda();
  return { ok: true, data: { tersimpan: baris.length, berkas_dihapus: true } };
}
