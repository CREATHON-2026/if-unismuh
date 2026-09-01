import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';

export function Sambutan() {
  const nav = useNavigate();
  return (
    <Layar aksi={<Tombol onClick={() => nav('/masuk')}>Mulai</Tombol>}>
      <div className="space-y-3 text-center">
        <p className="text-4xl font-black text-slate-900">lapakAi</p>
        <p className="text-lg text-slate-600">
          Tahu untung sebenarnya, cukup dari foto buku catatan.
        </p>
      </div>
    </Layar>
  );
}
