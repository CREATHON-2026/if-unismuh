import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { InputTeks } from '../components/InputTeks';
import { tulisOnboarding } from '../state/onboarding';

export function ProdukTerlaris() {
  const nav = useNavigate();
  const [produk, setProduk] = useState('');

  return (
    <Layar
      pertanyaan="Produk apa yang paling laku?"
      aksi={
        <Tombol
          disabled={!produk.trim()}
          onClick={() => {
            tulisOnboarding({ nama_produk: produk.trim() });
            nav('/resep/bahan');
          }}
        >
          Lanjut
        </Tombol>
      }
    >
      <InputTeks
        autoFocus
        placeholder="Contoh: kripik pisang"
        value={produk}
        onChange={(e) => setProduk(e.target.value)}
      />
    </Layar>
  );
}
