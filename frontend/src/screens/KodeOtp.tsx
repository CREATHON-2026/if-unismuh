import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
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
      <div className="kartu p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="hero-gradien flex h-28 w-28 items-center justify-center rounded-full text-white">
            <Lock size={44} strokeWidth={2} aria-hidden="true" />
          </div>
          <h1 className="tracking-[-0.02em] text-judul font-bold text-tinta">Verifikasi Kode OTP</h1>
          <div>
            <p className="text-utama text-sedang">Masukkan 6 digit kode yang kami kirim.</p>
            <p className="text-isi text-sedang">(Mode demo: ketik 123456)</p>
          </div>
          <div className="flex w-full justify-center gap-1.5 pt-2 sm:gap-2" onPaste={tempel}>
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
                className="h-[72px] w-12 rounded-2xl border-2 border-garis bg-kanvas text-center text-2xl font-bold text-tinta outline-none focus:border-merek disabled:opacity-40"
              />
            ))}
          </div>
          {sibuk && <p className="text-sedang">Memeriksa…</p>}
          {galat && <p className="font-semibold text-rugi">{galat}</p>}
          <p className="pt-2 text-utama text-tinta">Belum menerima kode?</p>
          <button
            type="button"
            onClick={kirimUlang}
            disabled={detik > 0 || sibuk}
            className="min-h-12 text-lg font-bold text-merek disabled:text-redup"
          >
            Kirim Ulang{detik > 0 ? ` (00:${String(detik).padStart(2, '0')})` : ''}
          </button>
        </div>
      </div>
    </Layar>
  );
}
