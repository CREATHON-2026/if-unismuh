// Mock API — bentuk jawaban persis docs/06-kontrak-api.md.
// Angka finansial di sini HARDCODED dari contoh kontrak, bukan dihitung
// (aturan #7: frontend tidak pernah menghitung; SQL di backend yang menghitung).
// Saat endpoint asli siap, ganti isi fungsi-fungsi ini dengan fetch.

import type {
  Jawaban,
  KirimOtpRes,
  VerifikasiOtpRes,
  SimpanUsahaReq,
  SimpanResepReq,
  TemuanPertama,
  EkstraksiRes,
  PratinjauEkstraksiRes,
  BarisKonfirmasi,
  KonfirmasiRes,
} from '@shared/types';

const jeda = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function kirimOtp(nomor_hp: string): Promise<Jawaban<KirimOtpRes>> {
  void nomor_hp;
  await jeda();
  return { ok: true, data: { terkirim: true, mode_demo: true } };
}

export async function verifikasiOtp(
  nomor_hp: string,
  kode: string,
): Promise<Jawaban<VerifikasiOtpRes>> {
  await jeda();
  if (kode !== '123456') {
    return { ok: false, error: { kode: 'OTP_SALAH', pesan: 'Kodenya belum cocok, coba lagi ya' } };
  }
  return {
    ok: true,
    data: {
      token: 'token-demo',
      pengguna_baru: true,
      pengguna: { id: 1, nomor_hp, nama_usaha: null, jenis_usaha: null },
    },
  };
}

export async function simpanUsaha(p: SimpanUsahaReq): Promise<Jawaban<Record<string, never>>> {
  void p;
  await jeda();
  return { ok: true, data: {} };
}

export async function simpanResep(p: SimpanResepReq): Promise<Jawaban<TemuanPertama>> {
  await jeda(700);
  // Angka contoh dari kontrak. Backend asli menghitungnya lewat SQL dari resep.
  return {
    ok: true,
    data: {
      produk_id: 1,
      nama: p.nama_produk,
      modal_per_unit: 21200,
      harga_jual: 20000,
      margin_per_unit: -1200,
      merugi: true,
    },
  };
}

export async function ekstraksiFoto(berkas: File): Promise<Jawaban<EkstraksiRes>> {
  void berkas;
  await jeda(1200);
  // Contoh baris + subtotal/total dari kontrak — semua angka dihitung backend.
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
