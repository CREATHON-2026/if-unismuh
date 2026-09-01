import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simpanResep } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { InputTeks } from '../components/InputTeks';
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
    // Mock memakai contoh bahan dari kontrak; backend asli akan mengekstrak
    // bahan_teks/suara menjadi bahan terstruktur lalu SQL menghitung modalnya.
    const jawaban = await simpanResep({
      nama_produk: data.nama_produk ?? '',
      bahan: [
        { nama: 'pisang', jumlah: 5, satuan: 'kg', harga_beli: 60000, jumlah_beli: 5 },
        { nama: 'minyak', jumlah: 2, satuan: 'liter', harga_beli: 36000, jumlah_beli: 2 },
      ],
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
    <Layar
      pertanyaan="Dijual berapa per bungkus?"
      aksi={
        <Tombol disabled={!valid || sibuk} onClick={kirim}>
          {sibuk ? 'Menghitung…' : 'Lihat Hasilnya'}
        </Tombol>
      }
    >
      <InputTeks
        type="tel"
        inputMode="numeric"
        autoFocus
        placeholder="Contoh: 20000"
        value={harga}
        onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))}
      />
      {galat && <p className="font-semibold text-red-600">{galat}</p>}
    </Layar>
  );
}
