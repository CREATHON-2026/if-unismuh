import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { tulisOnboarding } from '../state/onboarding';

const SARAN = ['Beras 5kg', 'Gula Pasir', 'Minyak Goreng'];

// Bar progres bergaya segmen: 2 selesai (peach), langkah 3 aktif (cokelat), 1 berikutnya.
function BarLangkah() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-2 w-16 rounded-full bg-[#F8C89E]" />
      <span className="h-2 w-16 rounded-full bg-[#F8C89E]" />
      <span className="h-2.5 w-20 rounded-full bg-[#8B3A0E] shadow-sm" />
      <span className="h-2 w-16 rounded-full bg-[#D9E1F0]" />
    </div>
  );
}

export function ProdukTerlaris() {
  const nav = useNavigate();
  const [produk, setProduk] = useState('');

  function lanjut() {
    if (!produk.trim()) return;
    tulisOnboarding({ nama_produk: produk.trim() });
    nav('/resep/bahan');
  }

  return (
    <Layar tanpaLogo atas>
      <BarLangkah />

      <div className="mt-14 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] [background-image:radial-gradient(45%_30%_at_92%_4%,rgba(45,212,191,0.12),transparent_60%)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#FAD9C0]">
            <svg
              width="46"
              height="46"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7C2D12"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4h16l1 5H3l1-5Z" />
              <path d="M5 9v11h14V9" />
              <path d="M10 20v-6h4v6" />
            </svg>
          </div>
          <h1 className="font-logo text-[27px] font-bold leading-snug text-[#16233B]">
            Apa produk yang paling laku?
          </h1>
          <p className="text-[17px] leading-relaxed text-[#6B5A4E]">
            Beritahu kami barang andalan warung Anda untuk menyesuaikan prediksi stok.
          </p>
        </div>

        <label className="mt-5 block text-[17px] font-bold text-[#1C1917]" htmlFor="nama-produk">
          Nama Produk
        </label>
        <div className="mt-2 flex h-16 items-center gap-3 rounded-2xl border border-[#B07A4E] bg-white px-4">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7C2D12"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4.5" y="5" width="15" height="5" rx="1.2" />
            <path d="M6 10v8.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V10" />
            <path d="M10 13.5h4" />
          </svg>
          <input
            id="nama-produk"
            autoFocus
            placeholder="Misal: Indomie Goreng, Kopi Kapal"
            value={produk}
            onChange={(e) => setProduk(e.target.value)}
            className="h-full flex-1 bg-transparent text-lg outline-none placeholder:text-[#D8B49A]"
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[15px] text-[#6B5A4E]">
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-full border border-[#6B5A4E] text-xs"
          >
            i
          </span>
          Anda bisa mengubahnya nanti di pengaturan.
        </p>

        <div className="mt-6">
          <Tombol varian="gelap" disabled={!produk.trim()} onClick={lanjut}>
            <span className="flex items-center justify-center gap-3">
              Lanjut
              <span aria-hidden className="text-2xl leading-none">
                →
              </span>
            </span>
          </Tombol>
        </div>

        <div className="my-6 h-px bg-[#DCE4F0]" />

        <p className="text-center text-[17px] font-bold text-[#1C1917]">Saran populer:</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3 pb-2">
          {SARAN.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setProduk(s)}
              className="rounded-full border border-[#E4C7AC] bg-white px-6 py-3 text-[17px] font-medium text-[#1C1917] transition active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </Layar>
  );
}
