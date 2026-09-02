import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Layar, LATAR_GRADIEN } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { LogoIkon, LogoTeks } from '../components/Logo';

export function Sambutan() {
  const nav = useNavigate();
  return (
    <Layar
      tanpaLogo
      latar={LATAR_GRADIEN}
      aksi={
        <>
          <Tombol onClick={() => nav('/masuk')}>
            <span className="flex items-center justify-center gap-2.5">
              Mulai
              <ArrowRight size={21} strokeWidth={2} aria-hidden="true" />
            </span>
          </Tombol>
          <p className="pt-1 text-center text-isi font-medium text-redup">
            Mudah. Cepat. Otomatis.
          </p>
        </>
      }
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="kartu flex items-center gap-3 px-8 py-6">
          <LogoIkon ukuran={64} />
          <LogoTeks className="text-4xl" />
        </div>
        <p className="text-judul-kecil leading-relaxed text-sedang">
          Tahu untung sebenarnya,
          <br />
          dari buku tulis yang sudah Anda pakai.
        </p>
      </div>
    </Layar>
  );
}
