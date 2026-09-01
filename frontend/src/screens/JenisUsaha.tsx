import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simpanUsaha } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { bacaOnboarding, tulisOnboarding } from '../state/onboarding';

const PILIHAN = ['Makanan', 'Minuman', 'Sembako', 'Jasa', 'Lainnya'];

export function JenisUsaha() {
  const nav = useNavigate();
  const [sibuk, setSibuk] = useState(false);

  async function pilih(jenis: string) {
    setSibuk(true);
    tulisOnboarding({ jenis_usaha: jenis.toLowerCase() });
    await simpanUsaha({
      nama_usaha: bacaOnboarding().nama_usaha ?? '',
      jenis_usaha: jenis.toLowerCase(),
    });
    nav('/onboarding/produk');
  }

  return (
    <Layar pertanyaan="Jualan apa?">
      <div className="flex flex-col gap-3">
        {PILIHAN.map((jenis) => (
          <Tombol key={jenis} varian="garis" disabled={sibuk} onClick={() => pilih(jenis)}>
            {jenis}
          </Tombol>
        ))}
      </div>
    </Layar>
  );
}
