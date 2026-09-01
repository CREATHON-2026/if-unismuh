import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kirimOtp, verifikasiOtp } from '../api/client';
import { simpanToken } from '../api/sesi';
import { Layar } from '../components/Layar';
import { bacaOnboarding } from '../state/onboarding';

const JUMLAH_DIGIT = 6;

export function KodeOtp() {
  const nav = useNavigate();
  const [digit, setDigit] = useState<string[]>(Array(JUMLAH_DIGIT).fill(''));
  const [galat, setGalat] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [detik, setDetik] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const id = setInterval(() => setDetik((d) => (d > 0 ? d - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  function ubah(i: number, nilai: string) {
    const d = nilai.replace(/\D/g, '').slice(-1);
    setDigit((lama) => {
      const baru = [...lama];
      baru[i] = d;
      return baru;
    });
    if (d && i < JUMLAH_DIGIT - 1) refs.current[i + 1]?.focus();
  }

  function tekan(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digit[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function tempel(e: React.ClipboardEvent) {
    const teks = e.clipboardData.getData('text').replace(/\D/g, '');
    if (teks.length === JUMLAH_DIGIT) {
      e.preventDefault();
      setDigit(teks.split(''));
    }
  }

  async function kirimUlang() {
    if (detik > 0 || sibuk) return;
    await kirimOtp(bacaOnboarding().nomor_hp ?? '');
    setDetik(30);
  }

  useEffect(() => {
    const kode = digit.join('');
    if (kode.length !== JUMLAH_DIGIT || sibuk) return;
    setSibuk(true);
    setGalat('');
    verifikasiOtp(bacaOnboarding().nomor_hp ?? '', kode).then((jawaban) => {
      if (jawaban.ok) {
        simpanToken(jawaban.data.token);
        nav(jawaban.data.pengguna_baru ? '/wa-info' : '/beranda');
        return;
      }
      setGalat(jawaban.error.pesan);
      setDigit(Array(JUMLAH_DIGIT).fill(''));
      refs.current[0]?.focus();
      setSibuk(false);
    });
  }, [digit, sibuk, nav]);

  return (
    <Layar tanpaLogo>
      <div className="rounded-3xl bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#F5831F]">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7C2D12"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="5" y="10" width="14" height="10" rx="2.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              <circle cx="12" cy="15" r="1.3" fill="#7C2D12" stroke="none" />
            </svg>
          </div>
          <h1 className="font-logo text-[26px] font-bold text-[#C2570E]">Verifikasi Kode OTP</h1>
          <div>
            <p className="text-[17px] text-[#44403C]">Masukkan 6 digit kode yang kami kirim.</p>
            <p className="text-[15px] text-[#78716C]">(Mode demo: ketik 123456)</p>
          </div>
          <div className="flex justify-center gap-2 pt-2" onPaste={tempel}>
            {digit.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => ubah(i, e.target.value)}
                onKeyDown={(e) => tekan(i, e)}
                inputMode="numeric"
                maxLength={2}
                autoFocus={i === 0}
                disabled={sibuk}
                className="h-[72px] w-12 rounded-2xl border-2 border-[#E5DED6] bg-[#F6F7FB] text-center text-2xl font-bold text-[#1C1917] outline-none focus:border-[#F5831F] disabled:opacity-40"
              />
            ))}
          </div>
          {sibuk && <p className="text-[#78716C]">Memeriksa…</p>}
          {galat && <p className="font-semibold text-red-600">{galat}</p>}
          <p className="pt-2 text-[17px] text-[#1C1917]">Belum menerima kode?</p>
          <button
            type="button"
            onClick={kirimUlang}
            disabled={detik > 0 || sibuk}
            className="font-logo text-lg font-bold text-[#C2570E]"
          >
            Kirim Ulang{detik > 0 ? ` (00:${String(detik).padStart(2, '0')})` : ''}
          </button>
        </div>
      </div>
    </Layar>
  );
}
