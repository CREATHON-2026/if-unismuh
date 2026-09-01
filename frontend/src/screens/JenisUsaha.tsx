import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JenisUsaha as JenisUsahaTipe } from '@shared/types';
import { simpanUsaha } from '../api/client';
import { Layar } from '../components/Layar';
import { TitikLangkah } from '../components/TitikLangkah';
import { bacaOnboarding, tulisOnboarding } from '../state/onboarding';

const COKELAT = '#1A1714';

function Ikon({ anak }: { anak: ReactNode }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke={COKELAT}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {anak}
    </svg>
  );
}

const PILIHAN = [
  {
    id: 'makanan',
    judul: 'Makanan',
    deskripsi: 'Warung makan, katering, camilan',
    ikon: (
      <Ikon
        anak={
          <>
            <path d="M8 3v18" />
            <path d="M5.5 3v5a2.5 2.5 0 0 0 5 0V3" />
            <path d="M17 3v18" />
            <path d="M17 3c2.8 2.2 2.8 7 0 9" />
          </>
        }
      />
    ),
  },
  {
    id: 'minuman',
    judul: 'Minuman',
    deskripsi: 'Warkop, kedai kopi, jus, minuman kemasan',
    ikon: (
      <Ikon
        anak={
          <>
            <path d="M5 6h10v6a5 5 0 0 1-10 0V6Z" />
            <path d="M15 7h2a2.5 2.5 0 0 1 0 5h-2" />
            <path d="M4 20h14" />
          </>
        }
      />
    ),
  },
  {
    id: 'sembako',
    judul: 'Sembako',
    deskripsi: 'Warung kelontong, bahan pokok harian',
    ikon: (
      <Ikon
        anak={
          <>
            <path d="M4 4h16l1 5H3l1-5Z" />
            <path d="M5 9v11h14V9" />
            <path d="M10 20v-6h4v6" />
          </>
        }
      />
    ),
  },
  {
    id: 'jasa',
    judul: 'Jasa',
    deskripsi: 'Bengkel, laundry, salon, servis',
    ikon: (
      <Ikon
        anak={
          <>
            <path d="M7.5 7.5l9 9" />
            <path d="M16.5 7.5l-9 9" />
            <circle cx="7" cy="7" r="2" />
            <circle cx="17" cy="17" r="2" />
          </>
        }
      />
    ),
  },
  {
    id: 'lainnya',
    judul: 'Lainnya',
    deskripsi: 'Pakaian, aksesoris, elektronik, dll.',
    ikon: (
      <Ikon
        anak={
          <>
            <path d="M8 4l2.5 4.5h-5L8 4Z" />
            <rect x="5" y="14" width="5" height="5" rx="1" />
            <circle cx="16.5" cy="16.5" r="2.8" />
          </>
        }
      />
    ),
  },
];

export function JenisUsaha() {
  const nav = useNavigate();
  const [pilihan, setPilihan] = useState<JenisUsahaTipe | ''>('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  async function lanjut() {
    if (!pilihan) return;
    setSibuk(true);
    setGalat('');
    tulisOnboarding({ jenis_usaha: pilihan });
    const jawaban = await simpanUsaha({
      nama_usaha: bacaOnboarding().nama_usaha ?? '',
      jenis_usaha: pilihan,
    });
    if (jawaban.ok) {
      nav('/onboarding/produk');
      return;
    }
    setGalat(jawaban.error.pesan);
    setSibuk(false);
  }

  return (
    <Layar
      tanpaLogo
      atas
      aksi={
        <button
          type="button"
          disabled={!pilihan || sibuk}
          onClick={lanjut}
          className={`h-16 w-full rounded-full text-lg font-bold transition ${
            pilihan && !sibuk
              ? 'bg-[#1A1714] text-white active:scale-[0.98]'
              : 'bg-[#E8E3DA] text-[#6B635A]'
          }`}
        >
          <span className="flex items-center justify-center gap-3">
            Lanjutkan
            <span aria-hidden className="text-2xl leading-none">
              →
            </span>
          </span>
        </button>
      }
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Kembali"
          onClick={() => nav(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8E3DA] text-2xl text-[#1A1714] active:scale-95"
        >
          ←
        </button>
        <TitikLangkah aktif={1} />
      </div>

      <h1 className="pt-6 font-logo text-[28px] font-bold text-[#1A1714]">Apa jenis usahamu?</h1>
      <p className="text-[17px] leading-relaxed text-[#6B635A]">
        Pilih satu yang paling menggambarkan bisnismu agar LapakAi bisa beradaptasi.
      </p>
      {galat && <p className="font-semibold text-red-600">{galat}</p>}

      <div className="flex flex-col gap-4 pt-2">
        {PILIHAN.map((p) => {
          const dipilih = pilihan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPilihan(p.id as JenisUsahaTipe)}
              className={`flex items-center gap-4 rounded-[22px] border p-4 text-left transition active:scale-[0.99] ${
                dipilih
                  ? 'border-[#1A1714] bg-[#F5F1EA] ring-1 ring-[#1A1714]'
                  : 'border-[#D6CFC4] bg-white/80'
              }`}
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#E8E3DA]">
                {p.ikon}
              </span>
              <span>
                <span className="block text-xl font-bold text-[#1A1714]">{p.judul}</span>
                <span className="text-[15px] leading-snug text-[#6B635A]">{p.deskripsi}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Layar>
  );
}
