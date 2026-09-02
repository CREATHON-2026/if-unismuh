import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Trash2, Plus, ArrowRight } from 'lucide-react';
import type { BahanMasukan } from '@shared/types';
import { formatRupiah } from '@shared/format/rupiah';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KELAS_INPUT } from '../components/InputTeks';
import { KepalaResep } from '../components/KepalaResep';
import { bacaOnboarding, tulisOnboarding } from '../state/onboarding';
import { alurUsahaAktif } from '../state/alurUsaha';

const FORM_KOSONG = { nama: '', jumlah: '', satuan: '', harga_beli: '', jumlah_beli: '' };

// Label di ATAS kolom, bukan di dalam placeholder. Di lebar setengah layar
// placeholder panjang terpotong di tengah kata dan pertanyaannya jadi hilang.
function Kolom({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
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
  // Kosakata mengikuti jenis usaha: warung masak, kelontong kulakan, jasa bahan habis pakai.
  const alur = alurUsahaAktif();
  // Kulakan tunggal (sembako): barangnya = produk yang barusan disebut,
  // tidak ditanya lagi, dan tidak ada daftar — satu produk satu kulakan.
  const tunggal = alur.form.kulakanTunggal;
  const namaProduk = bacaOnboarding().nama_produk ?? '';

  const formValid =
    (tunggal || form.nama.trim() !== '') &&
    Number(form.jumlah) > 0 &&
    Number(form.harga_beli) >= 0;

  function jadikanBahan(): BahanMasukan {
    const jumlah = Number(form.jumlah);
    return {
      nama: tunggal ? namaProduk : form.nama.trim(),
      satuan: form.satuan.trim() || (tunggal ? alur.form.placeholderSatuan : 'pcs'),
      jumlah,
      harga_beli: Number(form.harga_beli),
      // Kalau tidak diisi, dianggap beli sebanyak yang dipakai.
      jumlah_beli: Number(form.jumlah_beli) > 0 ? Number(form.jumlah_beli) : jumlah,
    };
  }

  function tambah() {
    if (!formValid) return;
    setDaftar((lama) => [...lama, jadikanBahan()]);
    setForm(FORM_KOSONG);
  }

  function lanjut() {
    if (tunggal) {
      if (!formValid) return;
      tulisOnboarding({ bahan: [jadikanBahan()] });
      nav('/resep/hasil');
      return;
    }
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
              {alur.tanyaBahan}
            </h1>
            <p className="mt-2 text-utama leading-relaxed text-sedang">{alur.penjelasBahan}</p>
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
                        {alur.form.labelJumlah} {b.jumlah} {b.satuan}
                      </span>
                      {alur.form.pakaiJumlahBeli && (
                        <span className="whitespace-nowrap">
                          · beli {b.jumlah_beli} {b.satuan}
                        </span>
                      )}
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
          {tunggal ? (
            <p className="rounded-kontrol bg-kanvas px-4 py-3.5 text-utama text-sedang">
              Kulakan untuk <span className="font-bold text-tinta">{namaProduk}</span>
            </p>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-isi font-semibold text-sedang">{alur.form.labelNama}</span>
              <input
                placeholder={alur.form.placeholderNama}
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className={KELAS_INPUT}
              />
            </label>
          )}

          <div className="flex gap-3">
            <Kolom label={alur.form.labelJumlah}>
              <input
                type="tel"
                inputMode="numeric"
                placeholder={alur.form.placeholderJumlah}
                value={form.jumlah}
                onChange={(e) => setForm({ ...form, jumlah: e.target.value.replace(/\D/g, '') })}
                className={KELAS_INPUT}
              />
            </Kolom>
            <Kolom label="Satuan">
              <input
                placeholder={alur.form.placeholderSatuan}
                value={form.satuan}
                onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                className={KELAS_INPUT}
              />
            </Kolom>
          </div>

          <div className="flex gap-3">
            <Kolom label={alur.form.labelHarga}>
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
            {/* Kulakan: sekali beli = yang dipakai, kolom ini tidak relevan. */}
            {alur.form.pakaiJumlahBeli && (
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
            )}
          </div>

          {/* Kulakan tunggal tidak punya daftar — formnya sendiri jawabannya. */}
          {!tunggal && (
            <button
              type="button"
              disabled={!formValid}
              onClick={tambah}
              className="flex h-14 items-center justify-center gap-2 rounded-kontrol border-[1.5px] border-garis-tua text-utama font-bold text-tinta transition active:scale-[0.98] disabled:border-garis disabled:text-redup"
            >
              <Plus size={19} strokeWidth={2.2} aria-hidden="true" />
              {alur.form.labelTambah}
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Tombol
          varian="gelap"
          disabled={tunggal ? !formValid : daftar.length === 0}
          onClick={lanjut}
        >
          <span className="flex items-center justify-center gap-2.5">
            Selanjutnya
            <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
          </span>
        </Tombol>
      </div>
    </Layar>
  );
}
