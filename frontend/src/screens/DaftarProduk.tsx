import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { RingkasanProduk } from '@shared/types';
import { ambilDaftarProduk } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';

/**
 * Daftar produk — fitur 6.
 *
 * Urutannya datang dari API: margin TERENDAH lebih dulu. Itu bagian dari
 * fiturnya, bukan selera — pedagang tidak tahu produk mana yang merugikan,
 * jadi yang merugi harus terlihat tanpa perlu dicari.
 *
 * Frontend tidak mengurutkan ulang dan tidak menghitung apa pun.
 */
export function DaftarProduk() {
  const nav = useNavigate();
  const [daftar, setDaftar] = useState<RingkasanProduk[] | null>(null);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    void ambilDaftarProduk().then((j) => (j.ok ? setDaftar(j.data) : setGalat(j.error.pesan)));
  }, []);

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-8 font-logo text-[26px] font-bold text-[#1A1714]">Produk Anda</h1>

      {galat && (
        <p className="mt-4 rounded-2xl bg-[#FDEDEE] p-4 text-[17px] text-[#7A2A2F]">{galat}</p>
      )}
      {!daftar && !galat && <p className="mt-6 text-[17px] text-[#6B635A]">Memuat…</p>}

      {daftar?.length === 0 && (
        <p className="mt-6 text-[17px] leading-relaxed text-[#4A443D]">
          Belum ada produk. Tambahkan lewat wawancara resep supaya modalnya bisa dihitung.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {daftar?.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => nav(`/produk/${p.id}`)}
            className="w-full rounded-[24px] bg-white p-5 text-left transition active:scale-[0.99]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[19px] font-bold text-[#1A1714]">{p.nama}</p>
              {p.terlaris && (
                <span className="rounded-lg bg-[#FBF3E2] px-2.5 py-1 text-[13px] font-bold text-[#4A443D]">
                  TERLARIS
                </span>
              )}
              {p.merugi && (
                <span className="rounded-lg bg-[#FDEDEE] px-2.5 py-1 text-[13px] font-bold text-[#B0111F]">
                  MERUGI
                </span>
              )}
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-[15px] leading-relaxed text-[#6B635A]">
                Modal{' '}
                <span className="font-bold text-[#1A1714]">
                  {p.modal_per_unit == null ? 'belum diisi' : formatRupiah(p.modal_per_unit)}
                </span>
                <br />
                Jual <span className="font-bold text-[#1A1714]">{formatRupiah(p.harga_jual)}</span>
              </p>

              {/* null = belum diketahui. Bukan nol, dan bukan untung penuh. */}
              {p.margin_per_unit == null ? (
                <span className="text-[17px] font-medium text-[#6B635A]">—</span>
              ) : (
                <span
                  className={`font-logo text-[24px] font-extrabold leading-none ${
                    p.merugi ? 'text-[#B0111F]' : 'text-[#1E6F4C]'
                  }`}
                >
                  {p.merugi ? '−' : '+'} {formatRupiah(Math.abs(p.margin_per_unit))}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <NavBawah />
    </Layar>
  );
}
