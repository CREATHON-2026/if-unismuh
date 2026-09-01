import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifikasiOtp } from '../api/client';
import { simpanToken } from '../api/sesi';
import { Layar } from '../components/Layar';
import { bacaOnboarding } from '../state/onboarding';

const JUMLAH_DIGIT = 6;

export function KodeOtp() {
  const nav = useNavigate();
  const [digit, setDigit] = useState<string[]>(Array(JUMLAH_DIGIT).fill(''));
  const [galat, setGalat] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

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

  useEffect(() => {
    const kode = digit.join('');
    if (kode.length !== JUMLAH_DIGIT || sibuk) return;
    setSibuk(true);
    setGalat('');
    verifikasiOtp(bacaOnboarding().nomor_hp ?? '', kode).then((jawaban) => {
      if (jawaban.ok) {
        simpanToken(jawaban.data.token);
        nav(jawaban.data.pengguna_baru ? '/onboarding/usaha' : '/beranda');
        return;
      }
      setGalat(jawaban.error.pesan);
      setDigit(Array(JUMLAH_DIGIT).fill(''));
      refs.current[0]?.focus();
      setSibuk(false);
    });
  }, [digit, sibuk, nav]);

  return (
    <Layar pertanyaan="Masukkan kode dari SMS">
      <div className="flex justify-center gap-2" onPaste={tempel}>
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
            className="h-14 w-12 rounded-xl border-2 border-slate-300 text-center text-2xl font-bold outline-none focus:border-slate-900 disabled:opacity-40"
          />
        ))}
      </div>
      {sibuk && <p className="text-center text-slate-500">Memeriksa…</p>}
      {galat && <p className="text-center font-semibold text-red-600">{galat}</p>}
      <p className="text-center text-sm text-slate-400">Mode demo: kode 123456</p>
    </Layar>
  );
}
