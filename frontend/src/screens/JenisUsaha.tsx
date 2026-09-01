import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CupSoda, Shapes, Store, UtensilsCrossed, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JenisUsaha as JenisUsahaTipe } from '@shared/types';
import { simpanUsaha } from '../api/client';
import { Layar } from '../components/Layar';
import { TitikLangkah } from '../components/TitikLangkah';
import { bacaOnboarding, tulisOnboarding } from '../state/onboarding';

const PILIHAN: readonly { id: JenisUsahaTipe; judul: string; deskripsi: string; ikon: LucideIcon }[] =
  [
    {
      id: 'makanan',
      judul: 'Makanan',
      deskripsi: 'Warung makan, katering, camilan',
      ikon: UtensilsCrossed,
    },
    {
      id: 'minuman',
      judul: 'Minuman',
      deskripsi: 'Warkop, kedai kopi, jus, minuman kemasan',
      ikon: CupSoda,
    },
    {
      id: 'sembako',
      judul: 'Sembako',
      deskripsi: 'Warung kelontong, bahan pokok harian',
      ikon: Store,
    },
    { id: 'jasa', judul: 'Jasa', deskripsi: 'Bengkel, laundry, salon, servis', ikon: Wrench },
    {
      id: 'lainnya',
      judul: 'Lainnya',
      deskripsi: 'Pakaian, aksesoris, elektronik, dll.',
      ikon: Shapes,
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
              ? 'bg-hero text-white active:scale-[0.98]'
              : 'bg-garis text-sedang'
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
          className="flex h-12 w-12 items-center justify-center rounded-full bg-garis text-tinta active:scale-95"
        >
          <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        <TitikLangkah aktif={1} />
      </div>

      <h1 className="pt-6 tracking-[-0.02em] text-judul font-bold text-tinta">Apa jenis usahamu?</h1>
      <p className="text-utama leading-relaxed text-sedang">
        Pilih satu yang paling menggambarkan bisnismu agar LapakAi bisa beradaptasi.
      </p>
      {galat && <p className="font-semibold text-rugi">{galat}</p>}

      <div className="flex flex-col gap-3 pt-2">
        {PILIHAN.map((p) => {
          const dipilih = pilihan === p.id;
          const Ikon = p.ikon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPilihan(p.id)}
              className={`flex items-center gap-4 rounded-kartu border p-4 text-left transition active:scale-[0.99] ${
                dipilih ? 'border-hero bg-kartu ring-1 ring-hero' : 'border-garis bg-kartu'
              }`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-kontrol ${
                  dipilih ? 'bg-hero text-white' : 'bg-kanvas text-sedang'
                }`}
              >
                <Ikon size={26} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sub font-bold text-tinta">{p.judul}</span>
                <span className="text-isi leading-snug text-redup">{p.deskripsi}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Layar>
  );
}
