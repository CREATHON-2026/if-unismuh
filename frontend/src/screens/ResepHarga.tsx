import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simpanResep } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KepalaResep } from '../components/KepalaResep';
import { bacaOnboarding, tulisOnboarding } from '../state/onboarding';

export function ResepHarga() {
  const nav = useNavigate();
  const [harga, setHarga] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const valid = Number(harga) > 0;

  async function kirim() {
    setSibuk(true);
    setGalat('');
    const data = bacaOnboarding();
    if (!data.bahan || data.bahan.length === 0) {
      setGalat('Bahannya belum diisi — kembali ke langkah 1 dulu ya');
      setSibuk(false);
      return;
    }
    const jawaban = await simpanResep({
      nama_produk: data.nama_produk ?? '',
      bahan: data.bahan,
      hasil_per_batch: data.hasil_per_batch ?? 0,
      harga_jual: Number(harga),
    });
    if (jawaban.ok) {
      tulisOnboarding({ harga_jual: Number(harga), temuan: jawaban.data });
      nav('/temuan');
      return;
    }
    setGalat(jawaban.error.pesan);
    setSibuk(false);
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaResep langkah={3} label="Harga" />

      <div className="mt-6 rounded-[28px] bg-white p-6">
        <h1 className="font-logo text-[26px] font-bold text-[#1A1714]">
          Dijual berapa per bungkus?
        </h1>
        <p className="mt-2 text-[17px] text-[#4A443D]">Harga jual saat ini ke pembeli.</p>

        <div className="mt-5 flex h-[72px] items-center rounded-2xl border border-[#E8E3DA] bg-[#F5F1EA] px-4 focus-within:border-[#1A1714]">
          <span className="text-lg font-bold text-[#1A1714]">Rp</span>
          <span className="mx-3 h-8 w-px bg-[#E8E3DA]" aria-hidden="true" />
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            placeholder="Contoh: 20000"
            value={harga}
            onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))}
            className="h-full flex-1 bg-transparent text-lg outline-none placeholder:text-[#6B635A]"
          />
        </div>
        {galat && <p className="mt-3 font-semibold text-red-600">{galat}</p>}
      </div>

      <div className="mt-8">
        <Tombol varian="gelap" disabled={!valid || sibuk} onClick={kirim}>
          <span className="flex items-center justify-center gap-3">
            {sibuk ? 'Menghitung…' : 'Lihat Hasilnya'}
            {!sibuk && (
              <span aria-hidden className="text-2xl leading-none">
                →
              </span>
            )}
          </span>
        </Tombol>
      </div>
    </Layar>
  );
}
