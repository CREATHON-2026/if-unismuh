import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { Beranda as DataBeranda } from '@shared/types';
import { ambilBeranda } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';
import { Tombol } from '../components/Tombol';

/**
 * Beranda — fitur 7, dan tamparan pertama demo.
 *
 * Omzet dan untung bersih BERSEBELAHAN, ukuran sama, tanpa penjelasan di
 * antaranya. Selisihnya yang harus berbicara, bukan kalimat kita. Inilah satu
 * hal yang paling sering keliru dipahami pedagang: omzet dikira untung.
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

  if (galat) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi />
        <p className="mt-10 rounded-2xl bg-[#FBD5D5] p-4 text-[17px] text-[#B91C1C]">{galat}</p>
        <NavBawah />
      </Layar>
    );
  }
  if (!data) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi />
        <p className="mt-10 text-center text-[17px] text-[#8A7C70]">Memuat…</p>
        <NavBawah />
      </Layar>
    );
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <h1 className="mt-8 font-logo text-[26px] font-bold text-[#1C1917]">Bulan ini</h1>

      {/* ★ Bersebelahan, ukuran sama. Diam sebentar di sini saat demo.
          Ukuran angkanya 21px, bukan 27px: pada layar 430px, "Rp 4.200.000"
          turun ke baris kedua sementara "Rp 268.000" tetap satu baris — dan dua
          angka yang seharusnya dibandingkan jadi tidak sejajar. Justru
          perbandingan itu yang menjadi inti layar ini. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-[24px] bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <p className="text-[15px] font-medium text-[#8A7C70]">Omzet</p>
          <p className="mt-1 whitespace-nowrap font-logo text-[21px] font-extrabold leading-tight text-[#1C1917] tabular-nums">
            {formatRupiah(data.omzet)}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-[#A8A29E]">uang yang masuk</p>
        </div>
        <div className="min-w-0 rounded-[24px] bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)] [background-image:radial-gradient(60%_45%_at_92%_6%,rgba(21,128,61,0.09),transparent_65%)]">
          <p className="text-[15px] font-medium text-[#8A7C70]">Untung bersih</p>
          <p className="mt-1 whitespace-nowrap font-logo text-[21px] font-extrabold leading-tight text-[#15803D] tabular-nums">
            {formatRupiah(data.untung_bersih)}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-[#A8A29E]">
            yang benar-benar dibawa pulang
          </p>
        </div>
      </div>

      {/* Angka yang tidak lengkap harus mengaku tidak lengkap. */}
      {data.baris_tanpa_modal > 0 && (
        <p className="mt-3 rounded-2xl bg-[#FDF3D8] p-4 text-[15px] leading-relaxed text-[#8A6100]">
          {data.baris_tanpa_modal} penjualan belum terhitung untungnya karena modal produknya
          belum diisi. Sudah masuk omzet, belum masuk untung bersih.
        </p>
      )}

      {!data.ada_transaksi && (
        <div className="mt-3 rounded-2xl bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <p className="text-[17px] leading-relaxed text-[#44403C]">
            Belum ada penjualan yang dicatat bulan ini. Catat yang hari ini dulu — cukup
            diucapkan, tidak perlu diketik satu-satu.
          </p>
          <div className="mt-4">
            <Tombol varian="gelap" onClick={() => nav('/catat')}>
              Catat penjualan
            </Tombol>
          </div>
        </div>
      )}

      {/* Terisi meski belum ada transaksi — dihitung dari resep, bukan penjualan. */}
      {data.jumlah_produk_merugi > 0 && (
        <button
          type="button"
          onClick={() => nav('/produk')}
          className="mt-3 w-full rounded-[24px] bg-white p-5 text-left shadow-[0_10px_40px_rgba(0,0,0,0.06)] [background-image:radial-gradient(45%_35%_at_95%_5%,rgba(239,68,68,0.09),transparent_60%)] transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[17px] font-bold text-[#1C1917]">
              {data.jumlah_produk_merugi} produk Anda merugi
            </p>
            <span aria-hidden className="text-2xl leading-none text-[#A8500B]">
              →
            </span>
          </div>
          {data.produk_paling_merugi && (
            <p className="mt-2 text-[17px] leading-relaxed text-[#44403C]">
              Paling parah{' '}
              <span className="font-bold text-[#1C1917]">{data.produk_paling_merugi.nama}</span> —
              rugi{' '}
              <span className="font-bold text-[#DC2626]">
                {formatRupiah(Math.abs(data.produk_paling_merugi.margin_per_unit))}
              </span>{' '}
              setiap kali terjual.
            </p>
          )}
        </button>
      )}

      <NavBawah />
    </Layar>
  );
}
