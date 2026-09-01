import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { LogoIkon } from '../components/Logo';

export function Sambutan() {
  const nav = useNavigate();
  return (
    <Layar tanpaLogo aksi={<Tombol onClick={() => nav('/masuk')}>Mulai</Tombol>}>
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoIkon ukuran={120} />
        <p className="font-logo text-5xl font-bold tracking-tight text-[#2B4C9B]">LapakAI</p>
        <p className="text-lg text-slate-600">
          Tahu untung sebenarnya, cukup dari foto buku catatan.
        </p>
      </div>
    </Layar>
  );
}
