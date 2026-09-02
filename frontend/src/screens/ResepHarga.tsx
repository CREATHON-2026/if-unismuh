import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { simpanProduk, simpanResep } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KepalaResep } from '../components/KepalaResep';
import { bacaOnboarding, tulisOnboarding } from '../state/onboarding';
import { alurUsahaAktif } from '../state/alurUsaha';

export function ResepHarga() {
  const nav = useNavigate();
  const [harga, setHarga] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const alur = alurUsahaAktif();
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
    const isi = {
      nama_produk: data.nama_produk ?? '',
      bahan: data.bahan,
      hasil_per_batch: data.hasil_per_batch ?? 0,
      harga_jual: Number(harga),
    };

    /**
     * Wizard yang sama melayani DUA konteks, dan ujungnya berbeda di keduanya.
     *
     * Bukan cuma soal tujuan navigasi. `POST /onboarding/resep` menolak bahan
     * kosong, karena tanpa bahan tidak ada modal dan tanpa modal tidak ada
     * temuan pertama — benar untuk onboarding. `POST /produk` menerimanya, dan
     * itu juga benar: pedagang yang menambah produk kesepuluh berhak
     * mendaftarkannya dulu dan melengkapi resepnya nanti.
     *
     * Dan "Temuan pertama" jelas bukan judul yang jujur untuk produk keenam.
     */
    const menambah = data.mode === 'tambah';
    const jawaban = menambah ? await simpanProduk(isi) : await simpanResep(isi);

    if (jawaban.ok) {
      tulisOnboarding({ harga_jual: Number(harga), temuan: jawaban.data });
      nav(menambah ? '/produk' : '/temuan');
      return;
    }
    setGalat(jawaban.error.pesan);
    setSibuk(false);
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaResep langkah={3} label="Harga" />

      <div className="kartu mt-6 p-6">
        <h1 className="text-judul font-bold leading-snug tracking-[-0.02em] text-tinta">
          {alur.tanyaHarga}
        </h1>
        <p className="mt-2 text-utama leading-relaxed text-sedang">
          Harga jual saat ini ke pembeli.
        </p>

        <div className="mt-5 flex h-[72px] items-center rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 transition focus-within:border-merek">
          <span className="text-sub font-bold text-sedang">Rp</span>
          <span className="mx-3 h-8 w-px bg-garis" aria-hidden="true" />
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            aria-label={`Harga jual per ${alur.satuanJual}`}
            placeholder="20000"
            value={harga}
            onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))}
            className="angka h-full min-w-0 flex-1 bg-transparent text-judul font-bold text-tinta outline-none placeholder:text-sub placeholder:font-normal placeholder:text-redup"
          />
        </div>
        {galat && <p className="mt-3 text-isi font-semibold text-rugi">{galat}</p>}
      </div>

      <div className="mt-8">
        <Tombol varian="utama" disabled={!valid || sibuk} onClick={kirim}>
          <span className="flex items-center justify-center gap-2.5">
            {sibuk ? 'Menghitung…' : 'Lihat hasilnya'}
            {!sibuk && <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />}
          </span>
        </Tombol>
      </div>
    </Layar>
  );
}
