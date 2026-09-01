import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Trash2, Plus, ArrowRight } from 'lucide-react';
import type { BahanMasukan } from '@shared/types';
import { formatRupiah } from '@shared/format/rupiah';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KELAS_INPUT } from '../components/InputTeks';
import { KepalaResep } from '../components/KepalaResep';
import { tulisOnboarding } from '../state/onboarding';

const FORM_KOSONG = { nama: '', jumlah: '', satuan: '', harga_beli: '', jumlah_beli: '' };

// Label di ATAS kolom, bukan di dalam placeholder. Di lebar setengah layar
// placeholder panjang terpotong di tengah kata dan pertanyaannya jadi hilang.
function Kolom({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex w-1/2 flex-col gap-1.5">
      <span className="text-isi font-semibold text-sedang">{label}</span>
      {children}
    </label>
  );
}

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

  return (
    <Layar tanpaLogo atas>
      <KepalaResep langkah={1} label="Bahan" />

      <div className="kartu mt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-judul font-bold leading-snug tracking-[-0.02em] text-tinta">
              Apa saja bahan yang dipakai?
            </h1>
            <p className="mt-2 text-utama leading-relaxed text-sedang">
              Isi satu per satu bahan untuk sekali bikin.
            </p>
          </div>
          <button
            type="button"
            aria-label="Rekam suara"
            onClick={() => setCatatan('Fitur suara segera aktif — sementara ketik dulu ya')}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-hero text-white transition active:scale-95"
          >
            <Mic size={24} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        {catatan && <p className="mt-3 text-isi text-sedang">{catatan}</p>}

        {daftar.length > 0 && (
          <div className="mt-5">
            <p className="label-bagian">Sudah dicatat ({daftar.length})</p>
            <div className="mt-2 flex flex-col gap-2">
              {daftar.map((b, i) => (
                <div
                  key={`${b.nama}-${i}`}
                  className="flex items-center gap-3 rounded-kontrol bg-kanvas px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-utama font-bold text-tinta">{b.nama}</p>
                    {/* Tiap potongan tidak boleh patah di tengah — "beli 25 / kg"
                        membuat angkanya kehilangan satuan sesaat saat dibaca. */}
                    <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-isi text-sedang">
                      <span className="whitespace-nowrap">
                        Dipakai {b.jumlah} {b.satuan}
                      </span>
                      <span className="whitespace-nowrap">
                        · beli {b.jumlah_beli} {b.satuan}
                      </span>
                    </p>
                  </div>
                  <p className="angka shrink-0 whitespace-nowrap text-isi font-semibold text-tinta">
                    {formatRupiah(b.harga_beli)}
                  </p>
                  <button
                    type="button"
                    aria-label={`Hapus ${b.nama}`}
                    onClick={() => setDaftar((lama) => lama.filter((_, j) => j !== i))}
                    className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-rugi transition active:scale-90"
                  >
                    <Trash2 size={19} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-isi font-semibold text-sedang">Nama bahan</span>
            <input
              placeholder="Contoh: Tepung"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className={KELAS_INPUT}
            />
          </label>

          <div className="flex gap-3">
            <Kolom label="Dipakai">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="5"
                value={form.jumlah}
                onChange={(e) => setForm({ ...form, jumlah: e.target.value.replace(/\D/g, '') })}
                className={KELAS_INPUT}
              />
            </Kolom>
            <Kolom label="Satuan">
              <input
                placeholder="kg"
                value={form.satuan}
                onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                className={KELAS_INPUT}
              />
            </Kolom>
          </div>

          <div className="flex gap-3">
            <Kolom label="Harga beli">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Rp"
                value={form.harga_beli}
                onChange={(e) =>
                  setForm({ ...form, harga_beli: e.target.value.replace(/\D/g, '') })
                }
                className={KELAS_INPUT}
              />
            </Kolom>
            <Kolom label="Jumlah beli">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Opsional"
                value={form.jumlah_beli}
                onChange={(e) =>
                  setForm({ ...form, jumlah_beli: e.target.value.replace(/\D/g, '') })
                }
                className={KELAS_INPUT}
              />
            </Kolom>
          </div>

          <button
            type="button"
            disabled={!formValid}
            onClick={tambah}
            className="flex h-14 items-center justify-center gap-2 rounded-kontrol border-[1.5px] border-garis-tua text-utama font-bold text-tinta transition active:scale-[0.98] disabled:border-garis disabled:text-redup"
          >
            <Plus size={19} strokeWidth={2.2} aria-hidden="true" />
            Tambah bahan
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Tombol varian="gelap" disabled={daftar.length === 0} onClick={lanjut}>
          <span className="flex items-center justify-center gap-2.5">
            Selanjutnya
            <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </Tombol>
      </div>
    </Layar>
  );
}
