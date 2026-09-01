// Mock API — bentuk jawaban persis docs/06-kontrak-api.md.
// Angka finansial di sini HARDCODED dari contoh kontrak, bukan dihitung
// (aturan #7: frontend tidak pernah menghitung; SQL di backend yang menghitung).
// Saat endpoint asli siap, ganti isi fungsi-fungsi ini dengan fetch.

import type {
  JawabanApi,
  DataKirimOtp,
  DataVerifikasiOtp,
  PermintaanUsaha,
  PermintaanResep,
  DataResep,
  DataEkstraksi,
  BarisKonfirmasi,
  DataKonfirmasi,
} from '@shared/types/api';

const jeda = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function kirimOtp(nomor_hp: string): Promise<JawabanApi<DataKirimOtp>> {
  void nomor_hp;
  await jeda();
  return { ok: true, data: { terkirim: true } };
}

export async function verifikasiOtp(
  nomor_hp: string,
  kode: string,
): Promise<JawabanApi<DataVerifikasiOtp>> {
  void nomor_hp;
  await jeda();
  if (kode !== '123456') {
    return { ok: false, error: { kode: 'OTP_SALAH', pesan: 'Kodenya belum cocok, coba lagi ya' } };
  }
  return {
    ok: true,
    data: { token: 'token-demo', pengguna_baru: true, pengguna: { id: 1, nama_usaha: null } },
  };
}

export async function simpanUsaha(p: PermintaanUsaha): Promise<JawabanApi<Record<string, never>>> {
  void p;
  await jeda();
  return { ok: true, data: {} };
}

export async function simpanResep(p: PermintaanResep): Promise<JawabanApi<DataResep>> {
  void p;
  await jeda(700);
  // Angka contoh dari kontrak. Backend asli menghitungnya lewat SQL dari resep.
  return {
    ok: true,
    data: {
      produk_id: 1,
      modal_per_unit: 21200,
      harga_jual: 20000,
      margin_per_unit: -1200,
      merugi: true,
    },
  };
}

export async function ekstraksiFoto(berkas: File): Promise<JawabanApi<DataEkstraksi>> {
  void berkas;
  await jeda(1200);
  // Contoh baris dari kontrak: satu yakin, satu perlu dicek.
  return {
    ok: true,
    data: {
      ekstraksi_id: 12,
      baris: [
        {
          urutan: 1,
          nama_mentah: 'kripik psg',
          produk_id: 1,
          nama_produk: 'Kripik Pisang',
          jumlah: 10,
          harga_satuan: 20000,
          tanggal: '2026-09-01',
          keyakinan: 0.94,
          perlu_dicek: false,
        },
        {
          urutan: 2,
          nama_mentah: 'kacang',
          produk_id: null,
          nama_produk: null,
          jumlah: 5,
          harga_satuan: null,
          tanggal: '2026-09-01',
          keyakinan: 0.41,
          perlu_dicek: true,
          alasan_ragu: 'harga tidak terbaca',
        },
      ],
    },
  };
}

export async function konfirmasiEkstraksi(
  ekstraksiId: number,
  baris: BarisKonfirmasi[],
): Promise<JawabanApi<DataKonfirmasi>> {
  void ekstraksiId;
  await jeda();
  return { ok: true, data: { tersimpan: baris.length, berkas_dihapus: true } };
}
