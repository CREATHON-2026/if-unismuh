import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Store } from 'lucide-react';
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
      <h1 className="tracking-[-0.02em] text-judul font-bold text-tinta">Mulai Kenalan Yuk!</h1>
      <p className="text-utama leading-relaxed text-sedang">
        Satu langkah lagi untuk pembukuan warung yang lebih gampang dan rapi.
      </p>

      <div className="kartu mt-6 p-6">
        <label className="text-2xl font-bold text-tinta" htmlFor="nama-usaha">
          Apa nama usaha Anda?
        </label>
        <div className="mt-4 flex h-16 items-center gap-3 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4">
          <Store size={24} strokeWidth={1.8} className="shrink-0 text-redup" aria-hidden="true" />
          <input
            id="nama-usaha"
            autoFocus
            placeholder="Contoh: Warung Bu Sri"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-lg text-tinta outline-none placeholder:text-redup"
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-isi text-sedang">
          <Info size={17} strokeWidth={1.9} className="shrink-0 text-redup" aria-hidden="true" />
          Nama ini akan muncul di laporan keuangan Anda.
        </p>
      </div>
    </Layar>
  );
}
