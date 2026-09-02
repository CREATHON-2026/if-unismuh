import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ShoppingCart, Tag } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import { ekstraksiFoto } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { KartuHero } from '../components/KartuHero';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { bacaOnboarding } from '../state/onboarding';
import { alurUsahaAktif } from '../state/alurUsaha';
import { tulisEkstraksi } from '../state/ekstraksi';

export function TemuanPertama() {
  const nav = useNavigate();
  const dataOnboarding = bacaOnboarding();
  const temuan = dataOnboarding.temuan;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    if (!temuan) nav('/');
  }, [temuan, nav]);
  if (!temuan) return null;

  // Math.abs hanya untuk tampilan; angkanya sendiri datang jadi dari API.
  const selisih = formatRupiah(Math.abs(temuan.margin_per_unit));
  const namaProduk = dataOnboarding.nama_produk ?? 'Produk Anda';

  async function pilihFoto(berkas: File) {
    setSibuk(true);
    setGalat('');
    const jawaban = await ekstraksiFoto(berkas);
    if (jawaban.ok) {
      tulisEkstraksi(jawaban.data);
      nav('/konfirmasi', { state: { fotoUrl: URL.createObjectURL(berkas) } });
      return;
    }
    setGalat(jawaban.error.pesan);
    setSibuk(false);
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <h1 className="mt-9 text-center text-judul font-bold tracking-[-0.02em] text-tinta">
        Temuan pertama
      </h1>
      {/* Kalimat ini mengikuti temuannya. Sebelumnya selalu berbunyi "kami
          menemukan ketidaksesuaian" — padahal separuh kasus justru kabar baik,
          dan menuduh pengguna salah di layar pertama bukan cara membuka. */}
      <p className="mt-1 text-center text-utama leading-relaxed text-sedang">
        {temuan.merugi
          ? 'Setiap bungkus yang laku justru mengurangi uang Anda.'
          : 'Sekarang untung Anda per bungkus sudah terbaca, bukan tebakan.'}
      </p>

      {/* Momen inti onboarding: satu angka, dan asal-usulnya tepat di bawahnya.
          Modal dan harga jual sengaja disandingkan supaya selisihnya terbaca
          sebagai kesimpulan, bukan sebagai tuduhan. */}
      <div className="mt-4">
        <KartuHero
          label={temuan.merugi ? 'Potensi kerugian' : 'Potensi keuntungan'}
          nilai={`${temuan.merugi ? '\u2212' : '+'} ${selisih}`}
          nada={temuan.merugi ? 'rugi' : 'untung'}
          catatan={`${namaProduk} — ${alurUsahaAktif().kalimatTemuan}.`}
          bawah={
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-isi">
                <span className="flex items-center gap-2.5 text-white/70">
                  <ShoppingCart size={17} strokeWidth={1.8} aria-hidden="true" />
                  Modal Anda
                </span>
                <span className="angka font-semibold text-white">
                  {formatRupiah(temuan.modal_per_unit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-isi">
                <span className="flex items-center gap-2.5 text-white/70">
                  <Tag size={17} strokeWidth={1.8} aria-hidden="true" />
                  Dijual
                </span>
                <span className="angka font-semibold text-white">
                  {formatRupiah(temuan.harga_jual)}
                </span>
              </div>
            </div>
          }
        />
      </div>

      <p className="mt-7 text-center text-utama leading-relaxed text-sedang">
        Foto buku catatan Anda supaya penjualan hariannya ikut terhitung.
      </p>

      <div className="mt-4">
        <Tombol varian="gelap" disabled={sibuk} onClick={() => inputFoto.current?.click()}>
          <span className="flex items-center justify-center gap-2.5">
            <Camera size={21} strokeWidth={1.9} aria-hidden="true" />
            {sibuk ? 'Membaca foto…' : 'Foto buku catatan'}
          </span>
        </Tombol>
      </div>
      <button
        type="button"
        onClick={() => nav('/beranda')}
        className="min-h-12 py-3 text-center text-utama font-semibold text-sedang active:scale-95"
      >
        Nanti saja
      </button>
      {galat && (
        <p className="mt-1 text-center text-isi font-semibold text-rugi">{galat}</p>
      )}

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
