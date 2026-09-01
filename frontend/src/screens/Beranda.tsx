import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { Beranda as DataBeranda } from '@shared/types';
import { ambilBeranda } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';
import { Tombol } from '../components/Tombol';
import { bacaOnboarding } from '../state/onboarding';

/**
 * Beranda — fitur 7, dan tamparan pertama demo.
 *
 * Untung jadi angka utama, uang masuk jadi pembandingnya tepat di bawah. Ini
 * inti seluruh layar: pedagang datang mengira omzet adalah untung. Menaruh
 * keduanya sama besar justru membuatnya terasa setara — padahal yang satu uang
 * lewat, yang satu uang tinggal.
 *
 * Tidak ada satu pun angka di berkas ini yang dihitung. Semuanya datang jadi
 * dari GET /beranda — aturan #7.
 */
export function Beranda() {
  const nav = useNavigate();
  const [data, setData] = useState<DataBeranda | null>(null);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    void ambilBeranda().then((j) => (j.ok ? setData(j.data) : setGalat(j.error.pesan)));
  }, []);

  if (galat || !data) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi />
        {galat ? (
          <p className="mt-10 rounded-[14px] bg-[#FDEDEE] px-4 py-3.5 text-[15px] text-[#7A2A2F]">
            {galat}
          </p>
        ) : (
          <p className="mt-10 text-center text-[15px] text-[#6B635A]">Memuat…</p>
        )}
        <NavBawah />
      </Layar>
    );
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <div className="mt-6">
        <p className="text-[14px] text-[#6B635A]">Bulan ini</p>
        <p className="text-[22px] font-bold tracking-[-0.02em] text-[#1A1714]">
          {bacaOnboarding().nama_usaha ?? 'Warung Anda'}
        </p>
      </div>

      <div className="mt-3 rounded-[22px] bg-white p-6">
        <p className="text-[14px] text-[#6B635A]">Untung bersih</p>
        <p className="angka mt-1 text-[40px] font-extrabold leading-none text-[#1E6F4C]">
          {formatRupiah(data.untung_bersih)}
        </p>
        <div className="mt-4 flex gap-7 border-t border-[#E8E3DA] pt-4">
          <div>
            <p className="text-[13px] text-[#6B635A]">Uang masuk</p>
            <p className="angka mt-0.5 text-[18px] font-semibold text-[#1A1714]">
              {formatRupiah(data.omzet)}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-[#6B635A]">Produk merugi</p>
            <p className="angka mt-0.5 text-[18px] font-semibold text-[#1A1714]">
              {data.jumlah_produk_merugi}
            </p>
          </div>
        </div>
      </div>

      {/* Angka yang tidak lengkap harus mengaku tidak lengkap. */}
      {data.baris_tanpa_modal > 0 && (
        <p className="mt-3 rounded-[14px] bg-[#FBF3E2] px-4 py-3.5 text-[14px] leading-relaxed text-[#4A443D]">
          {data.baris_tanpa_modal} penjualan belum ikut dihitung untungnya — modal produknya belum
          lengkap. Sudah masuk uang masuk, belum masuk untung bersih.
        </p>
      )}

      {!data.ada_transaksi && (
        <div className="mt-3 rounded-[22px] bg-white p-6">
          <p className="text-[16px] leading-relaxed text-[#4A443D]">
            Belum ada penjualan yang dicatat bulan ini. Catat yang hari ini dulu — cukup diucapkan,
            tidak perlu diketik satu-satu.
          </p>
        </div>
      )}

      {/* Terisi meski belum ada transaksi — dihitung dari resep, bukan penjualan. */}
      {data.produk_paling_merugi && (
        <>
          <p className="label-bagian mt-6">PALING MERUGI</p>
          <button
            type="button"
            onClick={() => nav('/produk')}
            className="mt-2 w-full rounded-[22px] bg-white p-5 text-left transition active:scale-[0.99]"
          >
            <div className="flex w-full items-baseline justify-between gap-3">
              <span className="text-[18px] font-bold text-[#1A1714]">
                {data.produk_paling_merugi.nama}
              </span>
              <span className="angka text-[16px] font-bold text-[#B0111F]">
                &minus; {formatRupiah(Math.abs(data.produk_paling_merugi.margin_per_unit))}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B635A]">
              Rugi sebanyak itu setiap kali terjual. Ketuk untuk melihat harga yang sebaiknya
              dipakai.
            </p>
          </button>
        </>
      )}

      <div className="mt-4 flex gap-2.5">
        <Tombol className="flex-1" onClick={() => nav('/catat')}>
          Catat penjualan
        </Tombol>
        <Tombol varian="garis" className="flex-1" onClick={() => nav('/pesanan')}>
          Pesanan
        </Tombol>
      </div>

      <NavBawah />
    </Layar>
  );
}
