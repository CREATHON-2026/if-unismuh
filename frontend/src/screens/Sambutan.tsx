import { useNavigate } from 'react-router-dom';
import { Layar, LATAR_GRADIEN } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { LogoIkon } from '../components/Logo';

export function Sambutan() {
  const nav = useNavigate();
  return (
    <Layar
      tanpaLogo
      latar={LATAR_GRADIEN}
      aksi={
        <>
          <Tombol onClick={() => nav('/masuk')}>
            <span className="flex items-center justify-center gap-3">
              Mulai
              <span aria-hidden className="text-2xl leading-none">
                →
              </span>
            </span>
          </Tombol>
          <p className="pt-1 text-center text-[15px] font-medium text-[#57534E]">
            Mudah. Cepat. Otomatis.
          </p>
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-3 rounded-3xl bg-white px-8 py-6 shadow-lg ring-1 ring-slate-100">
          <LogoIkon ukuran={64} />
          <span className="font-logo text-4xl font-bold tracking-tight text-[#2B4C9B]">
            LapakAI
          </span>
        </div>
        <p className="mt-4 font-logo text-4xl font-bold text-[#B4530A]">LapakAI</p>
        <p className="text-2xl text-[#484440]">Bantu UMKM Makin Cuan!</p>
      </div>
    </Layar>
  );
}
