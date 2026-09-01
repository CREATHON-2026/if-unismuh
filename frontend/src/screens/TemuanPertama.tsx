import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import { ekstraksiFoto } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { bacaOnboarding } from '../state/onboarding';
import { tulisEkstraksi } from '../state/ekstraksi';

export function TemuanPertama() {
  const nav = useNavigate();
  const temuan = bacaOnboarding().temuan;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    if (!temuan) nav('/');
  }, [temuan, nav]);
  if (!temuan) return null;

  // Math.abs hanya untuk tampilan; angkanya sendiri datang jadi dari API.
  const selisih = formatRupiah(Math.abs(temuan.margin_per_unit));

  async function pilihFoto(berkas: File) {
    setSibuk(true);
    setGalat('');
    const jawaban = await ekstraksiFoto(berkas);
    if (jawaban.ok) {
      tulisEkstraksi(jawaban.data);
      nav('/konfirmasi');
      return;
    }
    setGalat(jawaban.error.pesan);
    setSibuk(false);
  }

  return (
    <Layar
      aksi={
        <>
          <Tombol disabled={sibuk} onClick={() => inputFoto.current?.click()}>
            {sibuk ? 'Membaca foto…' : 'Foto Buku Catatan'}
          </Tombol>
          <button className="py-2 text-slate-500" onClick={() => nav('/beranda')}>
            Nanti saja
          </button>
        </>
      }
    >
      <div className="space-y-6 rounded-3xl border-2 border-slate-200 p-6">
        <div>
          <p className="text-slate-500">Modal Anda</p>
          <p className="text-3xl font-bold text-slate-900">
            {formatRupiah(temuan.modal_per_unit)} <span className="text-base font-normal">per bungkus</span>
          </p>
        </div>
        <div>
          <p className="text-slate-500">Dijual</p>
          <p className="text-3xl font-bold text-slate-900">
            {formatRupiah(temuan.harga_jual)} <span className="text-base font-normal">per bungkus</span>
          </p>
        </div>
        <div>
          {temuan.merugi ? (
            <p className="text-4xl font-black leading-tight text-red-600">
              RUGI {selisih}
              <span className="block text-lg font-semibold">per bungkus</span>
            </p>
          ) : (
            <p className="text-4xl font-black leading-tight text-green-600">
              UNTUNG {selisih}
              <span className="block text-lg font-semibold">per bungkus</span>
            </p>
          )}
        </div>
      </div>
      <p className="text-center text-slate-600">
        Sekarang coba foto buku catatan, biar kita tahu untung seluruhnya.
      </p>
      {galat && <p className="text-center font-semibold text-red-600">{galat}</p>}
      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const berkas = e.target.files?.[0];
          if (berkas) void pilihFoto(berkas);
        }}
      />
    </Layar>
  );
}
