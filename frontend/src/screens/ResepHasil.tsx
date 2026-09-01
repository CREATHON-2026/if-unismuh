import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { InputTeks } from '../components/InputTeks';
import { tulisOnboarding } from '../state/onboarding';

export function ResepHasil() {
  const nav = useNavigate();
  const [jumlah, setJumlah] = useState('');
  const valid = Number(jumlah) > 0;

  return (
    <Layar
      pertanyaan="Sekali bikin jadi berapa bungkus?"
      aksi={
        <Tombol
          disabled={!valid}
          onClick={() => {
            tulisOnboarding({ hasil_per_batch: Number(jumlah) });
            nav('/resep/harga');
          }}
        >
          Lanjut
        </Tombol>
      }
    >
      <InputTeks
        type="tel"
        inputMode="numeric"
        autoFocus
        placeholder="Contoh: 40"
        value={jumlah}
        onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
      />
    </Layar>
  );
}
