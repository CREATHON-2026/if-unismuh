import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kirimOtp } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { tulisOnboarding } from '../state/onboarding';

export function NomorHp() {
  const nav = useNavigate();
  const [nomor, setNomor] = useState('');
  const [sibuk, setSibuk] = useState(false);
  // Disimpan dengan awalan 0 mengikuti format kontrak (+62 hanya tampilan).
  const valid = /^8\d{8,11}$/.test(nomor);

  async function kirim() {
    setSibuk(true);
    const jawaban = await kirimOtp(`0${nomor}`);
    if (jawaban.ok) {
      tulisOnboarding({ nomor_hp: `0${nomor}` });
      nav('/masuk/otp');
      return;
    }
    setSibuk(false);
  }

  return (
    <Layar
      atas
      kembali={() => nav('/')}
      aksi={
        <>
          <Tombol varian="gelap" disabled={!valid || sibuk} onClick={kirim}>
            <span className="flex items-center justify-center gap-3 uppercase tracking-wider">
              {sibuk ? 'Mengirim…' : 'Kirim Kode'}
              {!sibuk && (
                <span aria-hidden className="text-2xl leading-none">
                  →
                </span>
              )}
            </span>
          </Tombol>
          <p className="text-center text-sm text-[#57534E]">
            Dengan melanjutkan, kamu setuju dengan{' '}
            <a href="#" className="font-semibold text-[#C2570E] underline">
              Syarat & Ketentuan
            </a>
            .
          </p>
        </>
      }
    >
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#F5831F]">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <rect x="7" y="3" width="10" height="18" rx="2.5" />
          <line x1="11" y1="17.5" x2="13" y2="17.5" />
        </svg>
      </div>

      <h1 className="pt-2 font-logo text-[28px] font-bold text-[#1C1917]">Masuk ke Warungmu</h1>
      <p className="text-[17px] leading-relaxed text-[#57534E]">
        Kami akan mengirimkan kode verifikasi via WhatsApp atau SMS untuk memastikan ini benar
        kamu.
      </p>

      <label className="pt-4 text-lg font-bold text-[#1C1917]" htmlFor="nomor-hp">
        Masukkan Nomor HP
      </label>
      <div className="flex h-16 items-center rounded-2xl border border-[#C9A98F] bg-white px-4">
        <span className="text-lg font-bold text-[#1C1917]">+62</span>
        <span className="mx-3 h-8 w-px bg-[#E7D8C9]" aria-hidden="true" />
        <input
          id="nomor-hp"
          type="tel"
          inputMode="numeric"
          autoFocus
          placeholder="812 3456 7890"
          value={nomor}
          onChange={(e) => setNomor(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
          className="h-full flex-1 bg-transparent text-lg tracking-wider outline-none placeholder:text-[#E7B896]"
        />
      </div>
      <p className="text-[15px] text-[#78716C]">Pastikan nomor aktif dan bisa menerima pesan.</p>
    </Layar>
  );
}
