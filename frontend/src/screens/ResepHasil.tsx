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

      <div className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <h1 className="font-logo text-[26px] font-bold text-[#16233B]">
          Sekali bikin jadi berapa bungkus?
        </h1>
        <p className="mt-2 text-[17px] text-[#44403C]">Hasil sekali produksi dari resep ini.</p>

        <input
          type="tel"
          inputMode="numeric"
          autoFocus
          placeholder="Contoh: 40"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
          className="mt-5 h-[72px] w-full rounded-2xl border border-[#D5DCEA] bg-[#F1F4FB] px-4 text-lg outline-none focus:border-[#F5831F] placeholder:text-[#8C93A3]"
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
