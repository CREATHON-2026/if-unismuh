import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import { ekstraksiFoto } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { bacaOnboarding } from '../state/onboarding';
import { tulisEkstraksi } from '../state/ekstraksi';

export function TemuanPertama() {
  const nav = useNavigate();
  const dataOnboarding = bacaOnboarding();
  const temuan = dataOnboarding.temuan;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    if (!temuan) nav('/');
  }, [temuan, nav]);
  if (!temuan) return null;

  // Math.abs hanya untuk tampilan; angkanya sendiri datang jadi dari API.
  const selisih = formatRupiah(Math.abs(temuan.margin_per_unit));
  const namaProduk = dataOnboarding.nama_produk ?? 'Produk Anda';

  async function pilihFoto(berkas: File) {
    setSibuk(true);
    setGalat('');
    const jawaban = await ekstraksiFoto(berkas);
    if (jawaban.ok) {
      tulisEkstraksi(jawaban.data);
      nav('/konfirmasi', { state: { fotoUrl: URL.createObjectURL(berkas) } });
      return;
    }
    setGalat(jawaban.error.pesan);
    setSibuk(false);
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <h1 className="mt-10 text-center font-logo text-[28px] font-bold text-[#1A1714]">
        Temuan Pertama!
      </h1>
      <p className="text-center text-[17px] leading-relaxed text-[#4A443D]">
        Kami menemukan ketidaksesuaian pada pencatatan terbaru Anda.
      </p>

      <div className="mt-4 rounded-[28px] bg-white p-6 [background-image:radial-gradient(45%_35%_at_95%_5%,rgba(176,17,31,0.07),transparent_60%)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[22px] font-bold text-[#1A1714]">{namaProduk}</p>
          {temuan.merugi ? (
            <span className="rounded-xl bg-[#FDEDEE] px-4 py-1.5 font-semibold text-[#B0111F]">
              Rugi
            </span>
          ) : (
            <span className="rounded-xl bg-[#EAF1ED] px-4 py-1.5 font-semibold text-[#1E6F4C]">
              Untung
            </span>
          )}
        </div>

        <div className="mt-6 text-center">
          {temuan.merugi ? (
            <>
              <p className="text-[17px] font-medium text-[#B0111F]">Potensi Kerugian</p>
              <p className="font-logo text-[34px] font-extrabold leading-snug text-[#B0111F]">
                - {selisih} / bungkus
              </p>
            </>
          ) : (
            <>
              <p className="text-[17px] font-medium text-[#1E6F4C]">Potensi Keuntungan</p>
              <p className="font-logo text-[34px] font-extrabold leading-snug text-[#1E6F4C]">
                + {selisih} / bungkus
              </p>
            </>
          )}
        </div>

        <div className="my-5 h-px bg-[#E8E3DA]" aria-hidden />

        <div className="flex items-center justify-between text-[17px]">
          <span className="flex items-center gap-3 text-[#6B635A]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="17" cy="20" r="1.4" />
              <path d="M3 4h2l2.5 12h10L20 8H6" />
            </svg>
            Modal Anda
          </span>
          <span className="font-bold text-[#1A1714]">{formatRupiah(temuan.modal_per_unit)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-[17px]">
          <span className="flex items-center gap-3 text-[#6B635A]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 11V4h7l10 10-7 7L3 11Z" />
              <circle cx="7.5" cy="8.5" r="1.3" />
            </svg>
            Dijual
          </span>
          <span className="font-bold text-[#1A1714]">{formatRupiah(temuan.harga_jual)}</span>
        </div>
      </div>

      <p className="mt-8 text-center text-[17px] leading-relaxed text-[#1A1714]">
        Perbaiki data dengan cepat agar pembukuan Anda tetap akurat.
      </p>

      <div className="mt-4">
        <Tombol varian="gelap" disabled={sibuk} onClick={() => inputFoto.current?.click()}>
          <span className="flex items-center justify-center gap-3">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7l1.5-2.5h5L16 7" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {sibuk ? 'Membaca foto…' : 'Foto Buku Catatan'}
          </span>
        </Tombol>
      </div>
      <button
        type="button"
        onClick={() => nav('/beranda')}
        className="py-3 text-center font-logo text-lg font-bold text-[#1A1714] active:scale-95"
      >
        Abaikan Sementara
      </button>
      {galat && <p className="text-center font-semibold text-red-600">{galat}</p>}

      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const berkas = e.target.files?.[0];
          if (berkas) void pilihFoto(berkas);
        }}
      />
    </Layar>
  );
}
