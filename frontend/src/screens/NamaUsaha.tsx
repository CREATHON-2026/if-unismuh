import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layar, LATAR_GRADIEN } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { tulisOnboarding } from '../state/onboarding';

export function NamaUsaha() {
  const nav = useNavigate();
  const [nama, setNama] = useState('');

  return (
    <Layar
      tanpaLogo
      atas
      latar={LATAR_GRADIEN}
      aksi={
        <Tombol
          varian="gelap"
          disabled={!nama.trim()}
          onClick={() => {
            tulisOnboarding({ nama_usaha: nama.trim() });
            nav('/onboarding/jenis');
          }}
        >
          <span className="flex items-center justify-center gap-3">
            Lanjut
            <span aria-hidden className="text-2xl leading-none">
              →
            </span>
          </span>
        </Tombol>
      }
    >
      <h1 className="font-logo text-[28px] font-bold text-[#1A1714]">Mulai Kenalan Yuk!</h1>
      <p className="text-[17px] leading-relaxed text-[#4A443D]">
        Satu langkah lagi untuk pembukuan warung yang lebih gampang dan rapi.
      </p>

      <div className="mt-6 rounded-3xl bg-white/95 p-6">
        <label className="text-2xl font-bold text-[#1A1714]" htmlFor="nama-usaha">
          Apa nama usaha Anda?
        </label>
        <div className="mt-4 flex h-16 items-center gap-3 rounded-2xl border border-[#D6CFC4] bg-white px-4">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F5F1EA"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16l1 5H3l1-5Z" />
            <path d="M5 9v11h14V9" />
            <path d="M10 20v-6h4v6" />
          </svg>
          <input
            id="nama-usaha"
            autoFocus
            placeholder="Contoh: Warung Bu Sri"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="h-full flex-1 bg-transparent text-lg outline-none placeholder:text-[#6B635A]"
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[15px] text-[#6B635A]">
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-full border border-[#6B635A] text-xs"
          >
            i
          </span>
          Nama ini akan muncul di laporan keuangan Anda.
        </p>
      </div>
    </Layar>
  );
}
