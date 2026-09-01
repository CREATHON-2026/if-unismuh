import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KepalaResep } from '../components/KepalaResep';
import { tulisOnboarding } from '../state/onboarding';

export function ResepBahan() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  const [catatan, setCatatan] = useState('');

  function lanjut() {
    if (!teks.trim()) return;
    tulisOnboarding({ bahan_teks: teks.trim() });
    nav('/resep/hasil');
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaResep langkah={1} label="Bahan" />

      <div className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <h1 className="font-logo text-[26px] font-bold text-[#16233B]">
          Apa saja bahan yang dipakai?
        </h1>
        <p className="mt-2 text-[17px] text-[#44403C]">Sebutkan bahan utama untuk resep ini.</p>

        <div className="mt-5 flex items-center gap-4">
          <input
            autoFocus
            placeholder="Contoh: Tepung 1kg, Telur 2"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            className="h-[72px] w-full flex-1 rounded-2xl border border-[#D5DCEA] bg-[#F1F4FB] px-4 text-lg outline-none focus:border-[#F5831F] placeholder:text-[#8C93A3]"
          />
          <button
            type="button"
            aria-label="Rekam suara"
            onClick={() => setCatatan('Fitur suara segera aktif — sementara ketik dulu ya')}
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#F5831F] shadow-md active:scale-95"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3A2410"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="9.25" y="3" width="5.5" height="10" rx="2.75" />
              <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
              <path d="M12 17v3.5" />
            </svg>
          </button>
        </div>
        {catatan && <p className="mt-3 text-sm text-[#78716C]">{catatan}</p>}
      </div>

      <div className="mt-8">
        <Tombol varian="gelap" disabled={!teks.trim()} onClick={lanjut}>
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
