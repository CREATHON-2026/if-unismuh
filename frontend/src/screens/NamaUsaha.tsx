import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { InputTeks } from '../components/InputTeks';
import { tulisOnboarding } from '../state/onboarding';

export function NamaUsaha() {
  const nav = useNavigate();
  const [nama, setNama] = useState('');

  return (
    <Layar
      pertanyaan="Usaha Ibu/Bapak namanya apa?"
      aksi={
        <Tombol
          disabled={!nama.trim()}
          onClick={() => {
            tulisOnboarding({ nama_usaha: nama.trim() });
            nav('/onboarding/jenis');
          }}
        >
          Lanjut
        </Tombol>
      }
    >
      <InputTeks
        autoFocus
        placeholder="Contoh: Warung Bu Sari"
        value={nama}
        onChange={(e) => setNama(e.target.value)}
      />
    </Layar>
  );
}
