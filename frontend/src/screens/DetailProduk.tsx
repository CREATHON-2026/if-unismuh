import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { DetailProduk as Detail } from '@shared/types';
import { ambilDetailProduk } from '../api/client';
import { Layar } from '../components/Layar';
import { NavBawah } from '../components/NavBawah';

/**
 * Detail produk — fitur 6, dan langkah 3 skrip demo.
 *
 * Dua hal yang harus terlihat bersamaan: kabar buruk (rugi per unit) dan jalan
 * keluarnya (saran harga, fitur 8). Berhenti di kabar buruk saja membuat
 * pedagang merasa dihakimi, bukan dibantu.
 *
 * Rincian bahan menjumlah PERSIS ke modal per unit — itu dijaga uji di backend.
 * Frontend hanya menampilkan; tidak ada satu penjumlahan pun di sini.
 */
export function DetailProduk() {
  const nav = useNavigate();
  const { id } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    const nomor = Number(id);
    if (!Number.isInteger(nomor)) {
      setGalat('Produknya tidak dikenali.');
      return;
    }
    void ambilDetailProduk(nomor).then((j) => (j.ok ? setD(j.data) : setGalat(j.error.pesan)));
  }, [id]);

  if (galat) {
    return (
      <Layar kembali={() => nav('/produk')}>
        <p className="rounded-2xl bg-[#FDEDEE] p-4 text-[17px] text-[#7A2A2F]">{galat}</p>
        <NavBawah />
      </Layar>
    );
  }
  if (!d) {
    return (
      <Layar kembali={() => nav('/produk')}>
        <p className="text-[17px] text-[#6B635A]">Memuat…</p>
      </Layar>
    );
  }

  return (
    <Layar kembali={() => nav('/produk')} atas>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#1A1714]">{d.nama}</h1>
        {d.terlaris && (
          <span className="rounded-lg bg-[#FBF3E2] px-2.5 py-1 text-[13px] font-bold text-[#4A443D]">
            TERLARIS
          </span>
        )}
        {d.merugi && (
          <span className="rounded-lg bg-[#FDEDEE] px-2.5 py-1 text-[13px] font-bold text-[#B0111F]">
            MERUGI
          </span>
        )}
      </div>

      <div className="mt-4 rounded-[28px] bg-white p-6">
        <div className="flex items-center justify-between text-[17px]">
          <span className="text-[#6B635A]">Modal per unit</span>
          <span className="font-bold text-[#1A1714]">
            {d.modal_per_unit == null ? 'belum diisi' : formatRupiah(d.modal_per_unit)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[17px]">
          <span className="text-[#6B635A]">Harga jual</span>
          <span className="font-bold text-[#1A1714]">{formatRupiah(d.harga_jual)}</span>
        </div>

        <div className="my-5 h-px bg-[#E8E3DA]" aria-hidden />

        {d.margin_per_unit == null ? (
          <p className="text-center text-[17px] leading-relaxed text-[#4A443D]">
            Resepnya belum diisi, jadi untungnya belum bisa dihitung.
          </p>
        ) : (
          <div className="text-center">
            <p
              className={`text-[17px] font-medium ${d.merugi ? 'text-[#B0111F]' : 'text-[#1E6F4C]'}`}
            >
              {d.merugi ? 'Rugi setiap kali terjual' : 'Untung setiap kali terjual'}
            </p>
            <p
              className={`angka text-[38px] font-extrabold leading-none ${
                d.merugi ? 'text-[#B0111F]' : 'text-[#1E6F4C]'
              }`}
            >
              {d.merugi ? '−' : '+'} {formatRupiah(Math.abs(d.margin_per_unit))}
            </p>
            <p className="text-[15px] text-[#6B635A]">sudah terjual {d.total_terjual} kali</p>
          </div>
        )}
      </div>

      {/* Fitur 8. null = tidak ada yang perlu disarankan; sembunyikan, jangan
          tampilkan angka karangan. */}
      {d.saran_harga && (
        <div className="mt-3 rounded-[22px] bg-[#1E6F4C] p-6 text-[#F2F7F4]">
          <p className="label-bagian !text-[#F2F7F4]/75">SARAN HARGA</p>
          <p className="angka mt-2 text-[34px] font-extrabold leading-none">
            {formatRupiah(d.saran_harga.harga_disarankan)}
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-[#F2F7F4]/90">
            {d.saran_harga.alasan}
          </p>

          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-2xl bg-[#145037] px-4 py-3">
              <p className="text-[12.5px] text-[#F2F7F4]/70">Batas tidak rugi</p>
              <p className="angka mt-0.5 text-[16px] font-bold">
                {formatRupiah(d.saran_harga.harga_impas)}
              </p>
            </div>
            <div className="flex-1 rounded-2xl bg-[#145037] px-4 py-3">
              <p className="text-[12.5px] text-[#F2F7F4]/70">Untung jadi</p>
              <p className="angka mt-0.5 text-[16px] font-bold">
                {formatRupiah(d.saran_harga.untung_per_unit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {d.bahan.length > 0 && (
        <div className="mt-3 rounded-[28px] bg-white p-6">
          <p className="label-bagian">MODAL DATANG DARI SINI</p>
          <p className="mt-1 text-[13px] text-[#6B635A]">
            Sekali bikin jadi {d.hasil_per_batch ?? '—'} unit
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {d.bahan.map((b) => (
              <div key={b.nama} className="flex items-center justify-between gap-3 text-[17px]">
                <span className="text-[#4A443D]">
                  {b.nama}{' '}
                  <span className="text-[15px] text-[#6B635A]">
                    {b.jumlah_pakai} {b.satuan}
                  </span>
                </span>
                <span className="angka font-mono font-semibold text-[#1A1714]">{formatRupiah(b.biaya_per_unit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
