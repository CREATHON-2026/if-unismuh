import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Phone, Store, Tag } from 'lucide-react';
import type { JenisUsaha, Pengguna } from '@shared/types';
import { ambilSaya, simpanUsaha } from '../api/client';
import { hapusToken } from '../api/sesi';
import { Layar } from '../components/Layar';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { RangkaKartu } from '../components/Rangka';
import { Tombol } from '../components/Tombol';
import { tulisOnboarding } from '../state/onboarding';

/**
 * Profil — rupa mengikuti rancangan tim, isinya hanya yang benar-benar ada.
 *
 * Dari mockup yang sengaja TIDAK dibawa, dan alasannya:
 * - "Ubah Kata Sandi": TIDAK ADA password di aplikasi ini — identitas =
 *   nomor HP + OTP (aturan #3). Menampilkannya berarti membohongi pengguna.
 * - Toggle "Notifikasi Transaksi" & "Pusat Bantuan": sistemnya tidak ada;
 *   kontrol yang tidak melakukan apa-apa adalah afordansi bohong.
 * - Badge "Pedagang Terverifikasi": tidak ada proses verifikasi.
 * - Nama pemilik, alamat rumah, jam operasional, foto: tidak ada di data
 *   `Pengguna`. Kalau nanti dibutuhkan, minta field-nya ke backend lewat
 *   docs/06 — jangan dikarang di frontend.
 *
 * Yang berfungsi sungguhan: ubah nama & jenis usaha (memakai endpoint
 * POST /onboarding/usaha yang sudah ada) dan keluar akun.
 */
const JENIS_LABEL: Record<string, string> = {
  makanan: 'Makanan',
  minuman: 'Minuman',
  sembako: 'Sembako',
  jasa: 'Jasa',
  lainnya: 'Lainnya',
};

const PILIHAN_JENIS: readonly { nilai: JenisUsaha; label: string }[] = [
  { nilai: 'makanan', label: 'Makanan' },
  { nilai: 'minuman', label: 'Minuman' },
  { nilai: 'sembako', label: 'Sembako' },
  { nilai: 'jasa', label: 'Jasa' },
  { nilai: 'lainnya', label: 'Lainnya' },
];

export function Profil() {
  const nav = useNavigate();
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);

  // Form ubah nama & jenis usaha — memakai endpoint onboarding yang sudah ada.
  const [ubah, setUbah] = useState(false);
  const [namaBaru, setNamaBaru] = useState('');
  const [jenisBaru, setJenisBaru] = useState<JenisUsaha | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galatUbah, setGalatUbah] = useState('');

  async function muat() {
    setMemuat(true);
    setGalat('');
    const j = await ambilSaya();
    if (j.ok) setPengguna(j.data.pengguna);
    else setGalat(j.error.pesan);
    setMemuat(false);
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bukaUbah() {
    if (!pengguna) return;
    setNamaBaru(pengguna.nama_usaha ?? '');
    setJenisBaru(pengguna.jenis_usaha);
    setGalatUbah('');
    setUbah(true);
  }

  async function simpanUbah() {
    if (!namaBaru.trim() || !jenisBaru) return;
    setSibuk(true);
    setGalatUbah('');
    const j = await simpanUsaha({ nama_usaha: namaBaru.trim(), jenis_usaha: jenisBaru });
    if (j.ok) {
      setPengguna(j.data);
      // Nama di header layar lain dibaca dari sessionStorage — ikut diperbarui.
      tulisOnboarding({ nama_usaha: j.data.nama_usaha ?? undefined });
      setUbah(false);
    } else {
      setGalatUbah(j.error.pesan);
    }
    setSibuk(false);
  }

  function keluar() {
    const yakin = window.confirm(
      'Keluar dari akun? Nanti masuk lagi cukup pakai nomor HP dan kode OTP.',
    );
    if (!yakin) return;
    hapusToken();
    sessionStorage.clear();
    nav('/', { replace: true });
  }

  const kepala = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Kembali"
        onClick={() => nav(-1)}
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-tinta transition active:scale-95"
      >
        <ArrowLeft size={24} strokeWidth={2} aria-hidden="true" />
      </button>
      <h1 className="text-judul-kecil font-bold tracking-[-0.02em] text-tinta">Profil Saya</h1>
    </div>
  );

  if (galat) {
    return (
      <Layar tanpaLogo atas>
        {kepala}
        <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />
        <NavBawah />
      </Layar>
    );
  }

  if (!pengguna) {
    return (
      <Layar tanpaLogo atas>
        {kepala}
        <div className="mt-5 flex flex-col gap-3">
          <RangkaKartu tinggi="h-28" />
          <RangkaKartu tinggi="h-48" />
        </div>
        <NavBawah />
      </Layar>
    );
  }

  const inisial = (pengguna.nama_usaha ?? 'W').trim().charAt(0).toUpperCase() || 'W';

  return (
    <Layar tanpaLogo atas>
      {kepala}

      <div className="kartu mt-4 flex items-center gap-4 p-5">
        {/* Cincin oranye = sentuhan merek dari mockup; avatarnya tetap inisial,
            tidak ada penyimpanan foto. */}
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-hero text-judul-kecil font-bold text-white ring-2 ring-aksen ring-offset-2 ring-offset-kartu">
          {inisial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sub font-bold text-tinta">
            {pengguna.nama_usaha ?? 'Warung Anda'}
          </span>
          {pengguna.jenis_usaha && (
            <span className="mt-1 flex items-center gap-1.5 text-isi text-sedang">
              <Store size={15} strokeWidth={1.8} aria-hidden="true" />
              {JENIS_LABEL[pengguna.jenis_usaha]}
            </span>
          )}
        </span>
      </div>

      <p className="label-bagian mt-7">INFORMASI USAHA</p>

      {ubah ? (
        <div className="kartu mt-2 p-4">
          <label className="block">
            <span className="text-isi font-semibold text-sedang">Nama usaha</span>
            <input
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              placeholder="Warung Bu Sari"
              className="mt-2 w-full rounded-kontrol border-[1.5px] border-garis bg-kanvas p-4 text-utama text-tinta outline-none transition placeholder:text-redup focus:border-hero"
            />
          </label>

          <p className="mt-4 text-isi font-semibold text-sedang">Jenis usaha</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PILIHAN_JENIS.map((p) => {
              const aktif = jenisBaru === p.nilai;
              return (
                <button
                  key={p.nilai}
                  type="button"
                  onClick={() => setJenisBaru(p.nilai)}
                  className={`min-h-11 rounded-full px-4 text-isi font-semibold transition active:scale-95 ${
                    aktif ? 'bg-hero text-white' : 'bg-kanvas text-sedang'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {galatUbah && <p className="mt-3 text-isi font-semibold text-rugi">{galatUbah}</p>}

          <div className="mt-4 flex gap-2.5">
            <Tombol
              className="flex-1"
              disabled={!namaBaru.trim() || !jenisBaru || sibuk}
              onClick={() => void simpanUbah()}
            >
              {sibuk ? 'Menyimpan…' : 'Simpan'}
            </Tombol>
            <Tombol varian="garis" className="flex-1" disabled={sibuk} onClick={() => setUbah(false)}>
              Batal
            </Tombol>
          </div>
        </div>
      ) : (
        <div className="kartu mt-2 divide-y divide-garis">
          <div className="flex items-center gap-3.5 px-4 py-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-sedang"
              aria-hidden="true"
            >
              <Store size={20} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-kecil text-redup">Nama usaha</span>
              <span className="block truncate text-utama font-semibold text-tinta">
                {pengguna.nama_usaha ?? '—'}
              </span>
            </span>
            <button
              type="button"
              onClick={bukaUbah}
              className="shrink-0 rounded-full bg-aksen-muda px-3.5 py-1.5 text-isi font-semibold text-tinta transition active:scale-95"
            >
              Ubah
            </button>
          </div>
          <div className="flex items-center gap-3.5 px-4 py-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-sedang"
              aria-hidden="true"
            >
              <Tag size={20} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-kecil text-redup">Jenis usaha</span>
              <span className="block text-utama font-semibold text-tinta">
                {pengguna.jenis_usaha ? JENIS_LABEL[pengguna.jenis_usaha] : '—'}
              </span>
            </span>
            <button
              type="button"
              onClick={bukaUbah}
              className="shrink-0 rounded-full bg-aksen-muda px-3.5 py-1.5 text-isi font-semibold text-tinta transition active:scale-95"
            >
              Ubah
            </button>
          </div>
          <div className="flex items-center gap-3.5 px-4 py-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-sedang"
              aria-hidden="true"
            >
              <Phone size={20} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-kecil text-redup">Nomor HP</span>
              <span className="angka block text-utama font-semibold text-tinta">
                {pengguna.nomor_hp}
              </span>
            </span>
            {/* Tanpa "Ubah": nomor HP adalah identitas akun (aturan #3). */}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={keluar}
        className="mt-7 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-rugi text-utama font-semibold text-rugi transition active:scale-[0.98]"
      >
        <LogOut size={20} strokeWidth={2} aria-hidden="true" />
        Keluar akun
      </button>
      <p className="mt-2 text-center text-kecil leading-relaxed text-redup">
        Masuk lagi cukup pakai nomor HP — tidak ada kata sandi di aplikasi ini.
      </p>

      <NavBawah />
    </Layar>
  );
}
