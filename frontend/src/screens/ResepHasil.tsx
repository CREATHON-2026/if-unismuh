import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

      <div className="mt-6 rounded-[28px] bg-white p-6">
        <h1 className="font-logo text-[26px] font-bold text-[#1A1714]">
          Sekali bikin jadi berapa bungkus?
        </h1>
        <p className="mt-2 text-[17px] text-[#4A443D]">Hasil sekali produksi dari resep ini.</p>

        <input
          type="tel"
          inputMode="numeric"
          autoFocus
          placeholder="Contoh: 40"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
          className="mt-5 h-[72px] w-full rounded-2xl border border-[#E8E3DA] bg-[#F5F1EA] px-4 text-lg outline-none focus:border-[#1A1714] placeholder:text-[#6B635A]"
        />
      </div>

      <div className="mt-8">
        <Tombol varian="gelap" disabled={!valid} onClick={lanjut}>
          <span className="flex items-center justify-center gap-3">
            Selanjutnya
            <span aria-hidden className="text-2xl leading-none">
              →
            </span>
          </span>
        </Tombol>
      </div>
    </Layar>
  );
}
