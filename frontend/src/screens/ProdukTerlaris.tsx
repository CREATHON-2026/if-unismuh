import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Package } from 'lucide-react';
import { Layar, TombolKembali } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { TitikLangkah } from '../components/TitikLangkah';
import { tulisOnboarding } from '../state/onboarding';
import { alurUsahaAktif } from '../state/alurUsaha';

export function ProdukTerlaris() {
  const nav = useNavigate();
  const [produk, setProduk] = useState('');
  // Pertanyaan mengikuti jenis usaha yang dipilih di layar sebelumnya.
  const alur = alurUsahaAktif();
  const Ikon = alur.ikon;

  function lanjut() {
    if (!produk.trim()) return;
    // `mode` dicap eksplisit, bukan dibiarkan kosong: sessionStorage bisa
    // masih menyimpan 'tambah' dari kunjungan sebelumnya ke layar Tambah
    // Produk, dan wizard yang sama akan berakhir di tempat yang salah.
    tulisOnboarding({ nama_produk: produk.trim(), mode: 'onboarding' });
    nav('/resep/bahan');
  }

  return (
    <Layar tanpaLogo atas>
      <div className="flex items-center justify-between">
        <TombolKembali onClick={() => nav(-1)} />
        <TitikLangkah aktif={2} />
      </div>

      <div className="kartu mt-14 p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-kanvas text-sedang">
            <Ikon size={46} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h1 className="tracking-[-0.02em] text-judul font-bold leading-snug text-tinta">
            {alur.tanyaProduk}
          </h1>
          <p className="text-utama leading-relaxed text-sedang">{alur.penjelasProduk}</p>
        </div>

        <label className="mt-5 block text-utama font-bold text-tinta" htmlFor="nama-produk">
          {alur.labelProduk}
        </label>
        <div className="mt-2 flex h-16 items-center gap-3 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4">
          <Package size={24} strokeWidth={1.8} className="shrink-0 text-redup" aria-hidden="true" />
          <input
            id="nama-produk"
            autoFocus
            placeholder={alur.placeholderProduk}
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
          <Tombol varian="gelap" panah disabled={!produk.trim()} onClick={lanjut}>
            Lanjut
          </Tombol>
        </div>

        <div className="my-6 h-px bg-garis" />

        <p className="text-center text-utama font-bold text-tinta">Saran populer:</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3 pb-2">
          {alur.saranProduk.map((s) => (
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
