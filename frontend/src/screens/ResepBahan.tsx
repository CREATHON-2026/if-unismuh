import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BahanMasukan } from '@shared/types';
import { formatRupiah } from '@shared/format/rupiah';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KepalaResep } from '../components/KepalaResep';
import { tulisOnboarding } from '../state/onboarding';

const FORM_KOSONG = { nama: '', jumlah: '', satuan: '', harga_beli: '', jumlah_beli: '' };

export function ResepBahan() {
  const nav = useNavigate();
  const [daftar, setDaftar] = useState<BahanMasukan[]>([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [catatan, setCatatan] = useState('');

  const formValid =
    form.nama.trim() !== '' && Number(form.jumlah) > 0 && Number(form.harga_beli) >= 0;

  function tambah() {
    if (!formValid) return;
    const jumlah = Number(form.jumlah);
    setDaftar((lama) => [
      ...lama,
      {
        nama: form.nama.trim(),
        satuan: form.satuan.trim() || 'pcs',
        jumlah,
        harga_beli: Number(form.harga_beli),
        // Kalau tidak diisi, dianggap beli sebanyak yang dipakai.
        jumlah_beli: Number(form.jumlah_beli) > 0 ? Number(form.jumlah_beli) : jumlah,
      },
    ]);
    setForm(FORM_KOSONG);
  }

  function lanjut() {
    if (daftar.length === 0) return;
    tulisOnboarding({ bahan: daftar });
    nav('/resep/hasil');
  }

  const kelasInput =
    'h-14 rounded-2xl border border-[#D5DCEA] bg-[#F1F4FB] px-4 text-lg outline-none focus:border-[#F5831F] placeholder:text-[#8C93A3]';

  return (
    <Layar tanpaLogo atas>
      <KepalaResep langkah={1} label="Bahan" />

      <div className="mt-6 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-logo text-[26px] font-bold text-[#16233B]">
              Apa saja bahan yang dipakai?
            </h1>
            <p className="mt-2 text-[17px] text-[#44403C]">
              Isi satu per satu bahan untuk sekali bikin.
            </p>
          </div>
          <button
            type="button"
            aria-label="Rekam suara"
            onClick={() => setCatatan('Fitur suara segera aktif — sementara ketik dulu ya')}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F5831F] shadow-md active:scale-95"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3A2410"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="9.25" y="3" width="5.5" height="10" rx="2.75" />
              <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
              <path d="M12 17v3.5" />
            </svg>
          </button>
        </div>
        {catatan && <p className="mt-2 text-sm text-[#78716C]">{catatan}</p>}

        {daftar.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {daftar.map((b, i) => (
              <div
                key={`${b.nama}-${i}`}
                className="flex items-center justify-between rounded-xl bg-[#F6F7FB] px-4 py-3"
              >
                <p className="text-[16px] text-[#1C1917]">
                  <span className="font-bold">{b.nama}</span> — {b.jumlah} {b.satuan}, beli{' '}
                  {b.jumlah_beli} {b.satuan} {formatRupiah(b.harga_beli)}
                </p>
                <button
                  type="button"
                  aria-label={`Hapus ${b.nama}`}
                  onClick={() => setDaftar((lama) => lama.filter((_, j) => j !== i))}
                  className="pl-3 font-bold text-red-700 active:scale-95"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <input
            placeholder="Nama bahan — contoh: Tepung"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            className={kelasInput}
          />
          <div className="flex gap-3">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Dipakai (mis. 5)"
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: e.target.value.replace(/\D/g, '') })}
              className={`${kelasInput} w-1/2`}
            />
            <input
              placeholder="Satuan (kg, liter…)"
              value={form.satuan}
              onChange={(e) => setForm({ ...form, satuan: e.target.value })}
              className={`${kelasInput} w-1/2`}
            />
          </div>
          <div className="flex gap-3">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Harga beli (Rp)"
              value={form.harga_beli}
              onChange={(e) => setForm({ ...form, harga_beli: e.target.value.replace(/\D/g, '') })}
              className={`${kelasInput} w-1/2`}
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Jumlah beli (opsional)"
              value={form.jumlah_beli}
              onChange={(e) => setForm({ ...form, jumlah_beli: e.target.value.replace(/\D/g, '') })}
              className={`${kelasInput} w-1/2`}
            />
          </div>
          <button
            type="button"
            disabled={!formValid}
            onClick={tambah}
            className="h-12 rounded-full border-2 border-[#F5831F] font-bold text-[#C2570E] transition active:scale-[0.98] disabled:opacity-40"
          >
            + Tambah Bahan
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Tombol varian="gelap" disabled={daftar.length === 0} onClick={lanjut}>
          <span className="flex items-center justify-center gap-3">
            Selanjutnya
            <span aria-hidden className="text-2xl leading-none">
              →
            </span>
          </span>
        </Tombol>
      </div>
    </Layar>
  );
}
