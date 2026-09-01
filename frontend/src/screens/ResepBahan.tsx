import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { bacaOnboarding, tulisOnboarding } from '../state/onboarding';

export function ResepBahan() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  const [catatan, setCatatan] = useState('');
  const namaProduk = bacaOnboarding().nama_produk ?? 'Produk Anda';

  return (
    <Layar
      pertanyaan={`${namaProduk}, sekali bikin habis bahan apa saja?`}
      aksi={
        <Tombol
          disabled={!teks.trim()}
          onClick={() => {
            tulisOnboarding({ bahan_teks: teks.trim() });
            nav('/resep/hasil');
          }}
        >
          Lanjut
        </Tombol>
      }
    >
      <div className="flex items-start gap-2">
        <textarea
          autoFocus
          rows={4}
          placeholder="Contoh: pisang 5 kg 60 ribu, minyak 2 liter 36 ribu"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          className="w-full flex-1 rounded-2xl border-2 border-slate-300 p-4 text-lg outline-none focus:border-slate-900"
        />
        <button
          type="button"
          aria-label="Rekam suara"
          onClick={() => setCatatan('Fitur suara segera aktif — sementara ketik dulu ya')}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-300 text-2xl active:scale-95"
        >
          🎤
        </button>
      </div>
      {catatan && <p className="text-sm text-slate-500">{catatan}</p>}
    </Layar>
  );
}
