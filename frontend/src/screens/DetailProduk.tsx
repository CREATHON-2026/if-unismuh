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
        <p className="rounded-2xl bg-[#FBD5D5] p-4 text-[17px] text-[#B91C1C]">{galat}</p>
        <NavBawah />
      </Layar>
    );
  }
  if (!d) {
    return (
      <Layar kembali={() => nav('/produk')}>
        <p className="text-[17px] text-[#8A7C70]">Memuat…</p>
      </Layar>
    );
  }

  return (
    <Layar kembali={() => nav('/produk')} atas>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-logo text-[26px] font-bold text-[#1C1917]">{d.nama}</h1>
        {d.terlaris && (
          <span className="rounded-lg bg-[#FAD9C0] px-2.5 py-1 text-[13px] font-bold text-[#7C2D12]">
            TERLARIS
          </span>
        )}
        {d.merugi && (
          <span className="rounded-lg bg-[#FBD5D5] px-2.5 py-1 text-[13px] font-bold text-[#DC2626]">
            MERUGI
          </span>
        )}
      </div>

      <div className="mt-4 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between text-[17px]">
          <span className="text-[#57534E]">Modal per unit</span>
          <span className="font-bold text-[#1C1917]">
            {d.modal_per_unit == null ? 'belum diisi' : formatRupiah(d.modal_per_unit)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[17px]">
          <span className="text-[#57534E]">Harga jual</span>
          <span className="font-bold text-[#1C1917]">{formatRupiah(d.harga_jual)}</span>
        </div>

        <div className="my-5 h-px bg-[#E7E5E4]" aria-hidden />

        {d.margin_per_unit == null ? (
          <p className="text-center text-[17px] leading-relaxed text-[#8A6100]">
            Resepnya belum diisi, jadi untungnya belum bisa dihitung.
          </p>
        ) : (
          <div className="text-center">
            <p
              className={`text-[17px] font-medium ${d.merugi ? 'text-[#DC2626]' : 'text-[#15803D]'}`}
            >
              {d.merugi ? 'Rugi setiap kali terjual' : 'Untung setiap kali terjual'}
            </p>
            <p
              className={`font-logo text-[34px] font-extrabold leading-snug ${
                d.merugi ? 'text-[#DC2626]' : 'text-[#15803D]'
              }`}
            >
              {d.merugi ? '−' : '+'} {formatRupiah(Math.abs(d.margin_per_unit))}
            </p>
            <p className="text-[15px] text-[#A8A29E]">sudah terjual {d.total_terjual} kali</p>
          </div>
        )}
      </div>

      {/* Fitur 8. null = tidak ada yang perlu disarankan; sembunyikan, jangan
          tampilkan angka karangan. */}
      {d.saran_harga && (
        <div className="mt-3 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] [background-image:radial-gradient(50%_40%_at_93%_6%,rgba(21,128,61,0.10),transparent_62%)]">
          <p className="text-[17px] font-bold text-[#15803D]">Sebaiknya dijual segini</p>
          <p className="mt-1 font-logo text-[34px] font-extrabold leading-snug text-[#15803D]">
            {formatRupiah(d.saran_harga.harga_disarankan)}
          </p>
          <p className="mt-2 text-[17px] leading-relaxed text-[#44403C]">{d.saran_harga.alasan}</p>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#F7F4F1] px-4 py-3 text-[15px]">
            <span className="text-[#57534E]">Batas tidak rugi</span>
            <span className="font-bold text-[#1C1917]">
              {formatRupiah(d.saran_harga.harga_impas)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#F7F4F1] px-4 py-3 text-[15px]">
            <span className="text-[#57534E]">Untung jadi</span>
            <span className="font-bold text-[#15803D]">
              {formatRupiah(d.saran_harga.untung_per_unit)} per unit
            </span>
          </div>
        </div>
      )}

      {d.bahan.length > 0 && (
        <div className="mt-3 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <p className="text-[17px] font-bold text-[#1C1917]">Modal ini dari mana</p>
          <p className="mt-1 text-[15px] text-[#8A7C70]">
            Sekali bikin jadi {d.hasil_per_batch ?? '—'} unit
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {d.bahan.map((b) => (
              <div key={b.nama} className="flex items-center justify-between gap-3 text-[17px]">
                <span className="text-[#44403C]">
                  {b.nama}{' '}
                  <span className="text-[15px] text-[#A8A29E]">
                    {b.jumlah_pakai} {b.satuan}
                  </span>
                </span>
                <span className="font-bold text-[#1C1917]">{formatRupiah(b.biaya_per_unit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
