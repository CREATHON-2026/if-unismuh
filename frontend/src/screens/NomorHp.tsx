import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kirimOtp } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { InputTeks } from '../components/InputTeks';
import { tulisOnboarding } from '../state/onboarding';

export function NomorHp() {
  const nav = useNavigate();
  const [nomor, setNomor] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const valid = /^08\d{8,11}$/.test(nomor);

  async function kirim() {
    setSibuk(true);
    const jawaban = await kirimOtp(nomor);
    if (jawaban.ok) {
      tulisOnboarding({ nomor_hp: nomor });
      nav('/masuk/otp');
      return;
    }
    setSibuk(false);
  }

  return (
    <Layar
      pertanyaan="Masukkan nomor HP"
      aksi={
        <Tombol disabled={!valid || sibuk} onClick={kirim}>
          {sibuk ? 'Mengirim…' : 'Kirim Kode'}
        </Tombol>
      }
    >
      <InputTeks
        type="tel"
        inputMode="numeric"
        autoFocus
        placeholder="08xxxxxxxxxx"
        value={nomor}
        onChange={(e) => setNomor(e.target.value.replace(/\D/g, ''))}
      />
    </Layar>
  );
}
