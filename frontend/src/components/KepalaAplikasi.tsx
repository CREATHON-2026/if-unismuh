import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { keluarAkun } from '../api/sesi';
import { bacaOnboarding } from '../state/onboarding';
import { MorphingModal } from './motion/morphing-modal';
import { Tombol } from './Tombol';

/**
 * Header aplikasi: avatar inisial usaha + wordmark.
 *
 * Ikon lonceng dihapus. Ia digambar sebagai lingkaran seukuran tombol di pojok
 * kanan — terlihat persis seperti sesuatu yang bisa ditekan — padahal berupa
 * <span> tanpa perilaku apa pun. Tidak ada sistem notifikasi di aplikasi ini,
 * jadi menekannya tidak akan pernah melakukan apa-apa.
 *
 * Afordansi yang berbohong lebih buruk daripada ruang kosong, terutama untuk
 * pengguna yang baru pertama memakai aplikasi seperti ini: satu ketukan tanpa
 * hasil membuat mereka ragu apakah aplikasinya rusak atau mereka yang salah.
 *
 * Alasan yang sama berlaku terbalik untuk avatarnya. Ia SELALU terlihat seperti
 * tombol — lingkaran berwarna seukuran target sentuh — dan selama ini tidak
 * melakukan apa-apa. Sekarang ia benar-benar melakukan sesuatu: membuka pintu
 * keluar akun.
 *
 * `nama` boleh dikirim layar yang sudah memuat nama usahanya sendiri, supaya
 * inisialnya ikut benar walau sessionStorage masih kosong.
 */
export function KepalaAplikasi({ nama }: { nama?: string | null }) {
  const nav = useNavigate();
  const [terbuka, setTerbuka] = useState(false);

  const namaUsaha = (nama ?? bacaOnboarding().nama_usaha ?? '').trim();
  const inisial = ((namaUsaha || 'W').charAt(0) || 'W').toUpperCase();

  function keluar() {
    keluarAkun();
    setTerbuka(false);
    // `replace`, bukan push: tombol kembali tidak boleh membawa orang yang baru
    // keluar balik ke layar berisi datanya.
    nav('/', { replace: true });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        aria-label={namaUsaha ? `Akun ${namaUsaha}` : 'Akun'}
        aria-haspopup="dialog"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-merek text-lg font-bold text-white transition active:scale-95"
      >
        {inisial}
      </button>
      <span className="text-sub font-extrabold tracking-[-0.02em] text-tinta">lapakAi</span>

      {/*
        `viewId` dipakai sebagai identitas tampilan, bukan sekadar boolean:
        itulah yang membuat modalnya bisa MEMBENTUK ULANG dirinya kalau suatu
        saat ada tampilan kedua (mis. "ubah nama usaha") — panelnya beranimasi
        dari satu isi ke isi lain alih-alih ditutup lalu dibuka lagi. Untuk
        sekarang hanya ada satu, dan itu tidak apa-apa.

        `placement="bottom"` karena ini aplikasi yang dipakai satu tangan:
        keputusan diambil di bagian bawah layar, tempat ibu jari berada.
      */}
      <MorphingModal
        viewId={terbuka ? 'akun' : null}
        onClose={() => setTerbuka(false)}
        placement="bottom"
      >
        <div className="p-6">
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-merek-muda text-merek-tua"
              aria-hidden="true"
            >
              <UserRound size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sub font-bold text-tinta">
                {namaUsaha || 'Warung Anda'}
              </p>
              <p className="mt-0.5 text-isi text-sedang">Sedang masuk</p>
            </div>
          </div>

          {/*
            Kalimat ini yang membuat tombol keluar tidak menakutkan. Pengguna
            kita tidak punya email dan sering lupa password — dan justru karena
            itu mereka takut menekan "Keluar", mengira akunnya hilang. Yang
            perlu mereka tahu: masuk lagi cukup nomor HP dan kode.
          */}
          <p className="mt-5 text-utama leading-relaxed text-sedang">
            Kalau keluar, catatan usaha Anda tetap tersimpan. Masuk lagi cukup pakai nomor HP
            dan kode yang dikirim ke WhatsApp.
          </p>

          <div className="mt-6">
            <Tombol varian="utama" onClick={keluar}>
              <span className="flex items-center justify-center gap-2.5">
                <LogOut size={21} strokeWidth={1.9} aria-hidden="true" />
                Keluar dari akun
              </span>
            </Tombol>
          </div>
          <button
            type="button"
            onClick={() => setTerbuka(false)}
            className="mt-2 min-h-12 w-full py-3 text-center text-utama font-semibold text-sedang transition active:scale-95"
          >
            Batal
          </button>
        </div>
      </MorphingModal>
    </div>
  );
}
