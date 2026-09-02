import { useCallback, useEffect, useRef, useState } from 'react';
import type { StatusWhatsappRes } from '@shared/types';
import { statusWhatsapp } from '../api/client';

/**
 * Status sambungan WhatsApp, dipakai bersama dua layar.
 *
 * Dibuat setelah satu bug yang sama muncul di dua tempat: `muat()` yang menelan
 * kegagalan diam-diam.
 *
 *     const j = await statusWhatsapp();
 *     if (j.ok) setData(j.data);      // gagal -> data tetap null SELAMANYA
 *
 * Akibatnya badge status tersangkut di "Memuat…" tanpa batas, karena satu-
 * satunya penjemputan ulang baru menyala setelah `data` terisi — dan selama
 * `data` masih null, tidak ada yang mencoba lagi. Satu kedipan jaringan saja
 * cukup untuk membuat layar berbohong sampai dimuat ulang manual.
 *
 * Dua aturan yang dipegang hook ini:
 *
 *   1. KEGAGALAN TIDAK PERNAH DITELAN. Ia mengisi `galat`, dan pemanggil wajib
 *      menampilkannya beserta jalan untuk mencoba lagi.
 *   2. SELALU ADA PERCOBAAN BERIKUTNYA. Termasuk saat sedang galat — justru
 *      terutama saat itu.
 */

/** Jeda jemput, ditentukan keadaan. Bukan satu angka untuk semua. */
const JEDA_MS = {
  /** QR kedaluwarsa sekitar 20 detik, jadi ia harus tetap segar di layar. */
  menunggu: 2_000,
  /**
   * Cukup untuk menyadari sesi yang putus tanpa menghajar server. Sebelumnya
   * penjemputan BERHENTI TOTAL begitu tersambung, sehingga sesi yang terputus
   * tetap tertulis "Tersambung" sampai halaman dimuat ulang.
   */
  tenang: 15_000,
} as const;

export interface StatusWaHook {
  data: StatusWhatsappRes | null;
  galat: string;
  /** true hanya pada pemuatan PERTAMA — bukan tiap penjemputan berkala. */
  memuat: boolean;
  /** Untuk tombol "Coba lagi", dan untuk menyegarkan setelah menyambungkan. */
  muat: () => Promise<void>;
  /** Dipakai layar yang menyambungkan, supaya jawabannya langsung terpakai. */
  pasang: (baru: StatusWhatsappRes) => void;
}

/**
 * @param berkala true -> jemput terus dengan irama di atas.
 *   false -> sekali saja. Layar Pesanan Masuk hanya butuh `hanya_baca` untuk
 *   memilih kalimat kartunya; ia tidak sedang memantau sambungan.
 */
export function useStatusWa(berkala: boolean): StatusWaHook {
  const [data, setData] = useState<StatusWhatsappRes | null>(null);
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);
  const pernahBerhasil = useRef(false);

  const muat = useCallback(async () => {
    const j = await statusWhatsapp();
    if (j.ok) {
      setData(j.data);
      setGalat('');
      pernahBerhasil.current = true;
    } else {
      // Data lama TIDAK dibuang. Kalau sebelumnya sempat berhasil, lebih baik
      // menampilkan keadaan terakhir yang diketahui daripada mengosongkan layar
      // karena satu penjemputan gagal.
      setGalat(j.error.pesan);
    }
    setMemuat(false);
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  useEffect(() => {
    if (!berkala) return;
    // Saat galat, tetap dijemput dengan irama tenang — inilah yang membuat
    // gangguan sesaat sembuh sendiri tanpa pengguna menekan apa pun.
    const menunggu = data?.status === 'menyambung' || data?.status === 'menunggu_qr';
    const jeda = window.setInterval(() => void muat(), menunggu ? JEDA_MS.menunggu : JEDA_MS.tenang);
    return () => window.clearInterval(jeda);
  }, [berkala, data?.status, muat]);

  return {
    data,
    // Galat hanya ditampilkan kalau memang belum ada apa-apa untuk ditampilkan.
    // Sekali status pernah terbaca, kedipan jaringan tidak boleh mengubah layar
    // jadi halaman galat.
    galat: pernahBerhasil.current ? '' : galat,
    memuat,
    muat,
    pasang: setData,
  };
}
