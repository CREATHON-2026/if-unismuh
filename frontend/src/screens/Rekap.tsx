import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, PiggyBank, Star, Trophy, Wallet } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { Rekap as DataRekap } from '@shared/types';
import { ambilRekap } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { GrafikTren } from '../components/GrafikTren';
import { BarisDaftar, KartuDaftar } from '../components/BarisDaftar';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { KeadaanKosong } from '../components/KeadaanKosong';
import { RangkaKartu } from '../components/Rangka';

/**
 * Rekap — fitur 14, tren omzet vs untung minggu berjalan (7 hari).
 *
 * Rupa mengikuti rancangan tim: kartu grafik dulu, lalu omzet dan untung
 * sebagai dua kartu bertumpuk, lalu produk terlaris. Untung tetap yang
 * ditegaskan warna — jarak dua garis di grafik adalah pelajaran yang sama
 * dengan dua kartu di Beranda, digambar sepanjang minggu.
 *
 * Dari mockup yang sengaja TIDAK dibawa: lonceng notifikasi (tidak ada
 * sistemnya), "+12% dari minggu lalu" dan "Margin 25%" (API tidak mengirim
 * pembanding/persen — mengarangnya melanggar aturan #7; kalau dibutuhkan,
 * minta ke backend lewat docs/06), dropdown periode (hanya ada satu periode —
 * pil yang bisa diketuk tanpa efek adalah afordansi bohong), serta foto dan
 * kategori produk (tidak ada di data).
 *
 * Tidak ada angka yang dihitung di sini (aturan #7). Titik harian dan total
 * periode semuanya dijumlahkan SQL; layar ini hanya menggambar dan memformat.
 */
export function Rekap() {
  const nav = useNavigate();
  const [data, setData] = useState<DataRekap | null>(null);
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);

  async function muat() {
    setMemuat(true);
    setGalat('');
    const j = await ambilRekap();
    if (j.ok) setData(j.data);
    else setGalat(j.error.pesan);
    setMemuat(false);
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (galat) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi />
        <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />
        <NavBawah />
      </Layar>
    );
  }

  if (!data) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi />
        <div className="mt-6 flex flex-col gap-3">
          <RangkaKartu tinggi="h-64" />
          <RangkaKartu tinggi="h-28" />
          <RangkaKartu tinggi="h-28" />
        </div>
        <NavBawah />
      </Layar>
    );
  }

  const rugi = data.untung_bersih < 0;

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <div className="mt-7 flex items-center justify-between gap-3">
        <h1 className="text-judul font-bold tracking-[-0.02em] text-tinta">Rekap Penjualan</h1>
        {/* Label periode statis, bukan dropdown: baru ada satu periode. */}
        <span className="shrink-0 rounded-full bg-kanvas px-3.5 py-1.5 text-isi font-semibold text-sedang">
          Minggu ini
        </span>
      </div>

      {!data.ada_transaksi ? (
        <KeadaanKosong
          ikon={Mic}
          judul="Belum ada data rekap"
          pesan="Catat penjualan pertama dulu — laporan mingguannya muncul di sini."
          labelAksi="Catat penjualan"
          onAksi={() => nav('/catat')}
        />
      ) : (
        <>
          <div className="kartu mt-4 px-4 pb-4 pt-5">
            <p className="text-utama font-bold text-tinta">Grafik tren</p>
            <p className="mt-0.5 text-kecil text-redup">Uang masuk vs untung, 7 hari terakhir</p>
            <div className="mt-4">
              <GrafikTren titik={data.hari} />
            </div>
          </div>
          <p className="mt-2 px-1 text-kecil leading-relaxed text-redup">
            Kalau dua garisnya berjauhan, banyak uang lewat yang tidak jadi untung.
          </p>

          <div className="kartu mt-3 flex flex-col p-5">
            <span className="flex items-center gap-2.5 text-isi font-medium text-sedang">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-aksen-muda text-aksen-tua"
                aria-hidden="true"
              >
                <Wallet size={18} strokeWidth={1.8} />
              </span>
              Uang masuk minggu ini
            </span>
            <span className="angka mt-3 text-nomor font-extrabold leading-none text-tinta">
              {formatRupiah(data.omzet)}
            </span>
            <span className="mt-2 text-kecil text-redup">Belum dikurangi modal</span>
          </div>

          <div
            className={`mt-3 flex flex-col rounded-kartu p-5 ${rugi ? 'bg-rugi-muda' : 'bg-untung-muda'}`}
          >
            <span
              className={`flex items-center gap-2.5 text-isi font-semibold ${rugi ? 'text-rugi-tua' : 'text-untung-tua'}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${rugi ? 'bg-rugi' : 'bg-untung'}`}
                aria-hidden="true"
              >
                <PiggyBank size={18} strokeWidth={1.8} />
              </span>
              Untung bersih
            </span>
            <span
              className={`angka mt-3 text-nomor font-extrabold leading-none ${rugi ? 'text-rugi' : 'text-untung'}`}
            >
              {formatRupiah(data.untung_bersih)}
            </span>
            <span className={`mt-2 text-kecil ${rugi ? 'text-rugi-tua' : 'text-untung-tua'}`}>
              {rugi ? 'Minggu ini uang keluar lebih besar' : 'Yang benar-benar tinggal minggu ini'}
            </span>
          </div>

          {data.produk_terlaris && (
            <>
              <p className="mt-7 flex items-center gap-2 text-sub font-bold text-tinta">
                <Star size={19} strokeWidth={2} className="text-aksen-tua" aria-hidden="true" />
                Produk terlaris
              </p>
              <div className="mt-2">
                <KartuDaftar>
                  <BarisDaftar
                    ikon={Trophy}
                    nadaIkon="untung"
                    judul={data.produk_terlaris.nama}
                    meta="Paling banyak terjual minggu ini"
                    nilai={String(data.produk_terlaris.jumlah_terjual)}
                    nadaNilai="untung"
                    kanan={<span className="text-kecil text-redup">terjual</span>}
                    onClick={() => nav(`/produk/${data.produk_terlaris?.id}`)}
                  />
                </KartuDaftar>
                <p className="mt-2 px-1 text-kecil leading-relaxed text-redup">
                  Ketuk untuk memastikan yang paling laku juga paling menguntungkan.
                </p>
              </div>
            </>
          )}
        </>
      )}

      <NavBawah />
    </Layar>
  );
}
