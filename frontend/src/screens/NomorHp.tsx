import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Smartphone } from 'lucide-react';
import { kirimOtp } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { tulisOnboarding } from '../state/onboarding';

export function NomorHp() {
  const nav = useNavigate();
  const [nomor, setNomor] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  // Disimpan dengan awalan 0 mengikuti format kontrak (+62 hanya tampilan).
  const valid = /^8\d{8,11}$/.test(nomor);

  async function kirim() {
    setSibuk(true);
    setGalat('');
    const jawaban = await kirimOtp(`0${nomor}`);
    if (jawaban.ok) {
      tulisOnboarding({ nomor_hp: `0${nomor}` });
      nav('/masuk/otp');
      return;
    }
    setGalat(jawaban.error.pesan);
    setSibuk(false);
  }

  return (
    <Layar
      atas
      kembali={() => nav('/')}
      aksi={
        <>
          <Tombol varian="gelap" disabled={!valid || sibuk} onClick={kirim}>
            <span className="flex items-center justify-center gap-2.5">
              {sibuk ? 'Mengirim…' : 'Kirim Kode'}
              {!sibuk && <ArrowRight size={21} strokeWidth={2} aria-hidden="true" />}
            </span>
          </Tombol>
          <p className="text-center text-isi leading-relaxed text-redup">
            Dengan melanjutkan, kamu setuju dengan{' '}
            <a href="#" className="font-semibold text-tinta underline">
              Syarat &amp; Ketentuan
            </a>
            .
          </p>
        </>
      }
    >
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-hero text-white">
        <Smartphone size={34} strokeWidth={1.9} aria-hidden="true" />
      </div>

      <h1 className="pt-2 text-judul font-bold tracking-[-0.02em] text-tinta">
        Masuk ke Warungmu
      </h1>
      <p className="text-utama leading-relaxed text-sedang">
        Kami akan mengirimkan kode verifikasi via WhatsApp atau SMS untuk memastikan ini benar
        kamu.
      </p>

      <label className="pt-4 text-lg font-bold text-tinta" htmlFor="nomor-hp">
        Masukkan Nomor HP
      </label>
      <div className="flex h-16 items-center rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4">
        <span className="angka text-lg font-bold text-tinta">+62</span>
        <span className="mx-3 h-8 w-px bg-garis" aria-hidden="true" />
        <input
          id="nomor-hp"
          type="tel"
          inputMode="numeric"
          autoFocus
          placeholder="812 3456 7890"
          value={nomor}
          onChange={(e) => setNomor(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
          className="angka h-full min-w-0 flex-1 bg-transparent text-lg tracking-wider text-tinta outline-none placeholder:text-redup"
        />
      </div>
      <p className="text-isi text-redup">Pastikan nomor aktif dan bisa menerima pesan.</p>
      {galat && <p className="font-semibold text-rugi">{galat}</p>}
    </Layar>
  );
}
