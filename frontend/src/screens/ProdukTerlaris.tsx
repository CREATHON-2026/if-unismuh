import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Package, Store } from 'lucide-react';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { tulisOnboarding } from '../state/onboarding';

const SARAN = ['Beras 5kg', 'Gula Pasir', 'Minyak Goreng'];

// Bar progres bergaya segmen. Warna kuning tidak dipakai di sini: dalam bahasa
// rupa aplikasi ini kuning berarti "perlu diperhatikan", bukan "sudah lewat".
function BarLangkah() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-2 w-16 rounded-full bg-redup" />
      <span className="h-2 w-16 rounded-full bg-redup" />
      <span className="h-2.5 w-20 rounded-full bg-merek" />
      <span className="h-2 w-16 rounded-full bg-garis" />
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

      <div className="kartu mt-14 p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-kanvas text-sedang">
            <Store size={46} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h1 className="tracking-[-0.02em] text-judul font-bold leading-snug text-tinta">
            Apa produk yang paling laku?
          </h1>
          <p className="text-utama leading-relaxed text-sedang">
            Beritahu kami barang andalan warung Anda untuk menyesuaikan prediksi stok.
          </p>
        </div>

        <label className="mt-5 block text-utama font-bold text-tinta" htmlFor="nama-produk">
          Nama Produk
        </label>
        <div className="mt-2 flex h-16 items-center gap-3 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4">
          <Package size={24} strokeWidth={1.8} className="shrink-0 text-redup" aria-hidden="true" />
          <input
            id="nama-produk"
            autoFocus
            placeholder="Misal: Indomie Goreng, Kopi Kapal"
            value={produk}
            onChange={(e) => setProduk(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-lg text-tinta outline-none placeholder:text-redup"
          />
        </div>
        <p className="mt-3 flex items-center gap-2 text-isi text-sedang">
          <Info size={17} strokeWidth={1.9} className="shrink-0 text-redup" aria-hidden="true" />
          Anda bisa mengubahnya nanti di pengaturan.
        </p>

        <div className="mt-6">
          <Tombol varian="utama" disabled={!produk.trim()} onClick={lanjut}>
            <span className="flex items-center justify-center gap-3">
              Lanjut
              <span aria-hidden className="text-2xl leading-none">
                →
              </span>
            </span>
          </Tombol>
        </div>

        <div className="my-6 h-px bg-garis" />

        <p className="text-center text-utama font-bold text-tinta">Saran populer:</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3 pb-2">
          {SARAN.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setProduk(s)}
              className="rounded-full border-[1.5px] border-garis-tua bg-kartu px-6 py-3 text-utama font-medium text-tinta transition active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </Layar>
  );
}
