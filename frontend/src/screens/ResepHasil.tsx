import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KepalaResep } from '../components/KepalaResep';
import { tulisOnboarding } from '../state/onboarding';

export function ResepHasil() {
  const nav = useNavigate();
  const [jumlah, setJumlah] = useState('');
  const valid = Number(jumlah) > 0;

  function lanjut() {
    if (!valid) return;
    tulisOnboarding({ hasil_per_batch: Number(jumlah) });
    nav('/resep/harga');
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaResep langkah={2} label="Hasil" />

      <div className="kartu mt-6 p-6">
        <h1 className="text-judul font-bold leading-snug tracking-[-0.02em] text-tinta">
          Sekali bikin jadi berapa bungkus?
        </h1>
        <p className="mt-2 text-utama leading-relaxed text-sedang">
          Hasil sekali produksi dari resep ini.
        </p>

        <input
          type="tel"
          inputMode="numeric"
          autoFocus
          aria-label="Jumlah hasil sekali bikin"
          placeholder="Contoh: 40"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
          className="angka mt-5 h-[72px] w-full rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 text-judul font-bold text-tinta outline-none transition placeholder:text-sub placeholder:font-normal placeholder:text-redup focus:border-hero"
        />
      </div>

      <div className="mt-8">
        <Tombol varian="gelap" disabled={!valid} onClick={lanjut}>
          <span className="flex items-center justify-center gap-2.5">
            Selanjutnya
            <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </Tombol>
      </div>
    </Layar>
  );
}
