import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { DetailProduk as Detail } from '@shared/types';
import { ambilDetailProduk } from '../api/client';
import { Layar } from '../components/Layar';
import { KartuHero } from '../components/KartuHero';
import { BarProgres } from '../components/BarProgres';
import { Lencana } from '../components/Lencana';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { RangkaHero, RangkaKartu } from '../components/Rangka';

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

  const [memuat, setMemuat] = useState(true);

  async function muat() {
    const nomor = Number(id);
    if (!Number.isInteger(nomor)) {
      setGalat('Produknya tidak dikenali.');
      setMemuat(false);
      return;
    }
    setMemuat(true);
    setGalat('');
    const j = await ambilDetailProduk(nomor);
    if (j.ok) setD(j.data);
    else setGalat(j.error.pesan);
    setMemuat(false);
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (galat) {
    return (
      <Layar kembali={() => nav('/produk')} atas>
        <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />
        <NavBawah />
      </Layar>
    );
  }
  if (!d) {
    return (
      <Layar kembali={() => nav('/produk')} atas>
        <div className="flex flex-col gap-3">
          <RangkaHero />
          <RangkaKartu tinggi="h-44" />
        </div>
        <NavBawah />
      </Layar>
    );
  }

  return (
    <Layar kembali={() => nav('/produk')} atas>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-tinta">{d.nama}</h1>
        {d.merugi && <Lencana nada="rugi">MERUGI</Lencana>}
        {/* Kuning = perlu dicek. Terlaris baru jadi peringatan kalau produknya
            juga merugi; terlaris yang untung cuma kabar baik, jadi netral. */}
        {d.terlaris && <Lencana nada={d.merugi ? 'tanda' : 'netral'}>TERLARIS</Lencana>}
      </div>

      {/* Angka terpenting di layar ini: untung atau rugi per satu unit.
          Modal dan harga jual ikut di bawah garis supaya keduanya terbaca
          sebagai ASAL angka itu, bukan sebagai dua fakta terpisah. */}
      <div className="mt-4">
        <KartuHero
          label={
            d.margin_per_unit == null
              ? 'Untung per unit'
              : d.merugi
                ? 'Rugi setiap kali terjual'
                : 'Untung setiap kali terjual'
          }
          nilai={
            d.margin_per_unit == null
              ? 'Belum bisa dihitung'
              : `${d.merugi ? '\u2212' : '+'} ${formatRupiah(Math.abs(d.margin_per_unit))}`
          }
          nada={d.margin_per_unit == null ? 'netral' : d.merugi ? 'rugi' : 'untung'}
          catatan={
            d.margin_per_unit == null
              ? 'Resepnya belum diisi, jadi modalnya belum diketahui.'
              : `Sudah terjual ${d.total_terjual} kali.`
          }
          bawah={
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[15px]">
                <span className="text-white/55">Modal per unit</span>
                <span className="angka font-semibold text-white">
                  {d.modal_per_unit == null ? 'belum diisi' : formatRupiah(d.modal_per_unit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[15px]">
                <span className="text-white/55">Harga jual</span>
                <span className="angka font-semibold text-white">
                  {formatRupiah(d.harga_jual)}
                </span>
              </div>
            </div>
          }
        />
      </div>

      {/* Fitur 8. null = tidak ada yang perlu disarankan; sembunyikan, jangan
          tampilkan angka karangan. */}
      {d.saran_harga && (
        <div className="mt-3 rounded-kartu bg-untung p-6 text-white">
          <p className="label-bagian !text-white/70">SARAN HARGA</p>
          <p className="angka mt-2 text-[34px] font-extrabold leading-none">
            {formatRupiah(d.saran_harga.harga_disarankan)}
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/85">
            {d.saran_harga.alasan}
          </p>

          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-kontrol bg-untung-tua px-4 py-3">
              <p className="text-[12.5px] text-white/65">Batas tidak rugi</p>
              <p className="angka mt-0.5 text-[16px] font-bold">
                {formatRupiah(d.saran_harga.harga_impas)}
              </p>
            </div>
            <div className="flex-1 rounded-kontrol bg-untung-tua px-4 py-3">
              <p className="text-[12.5px] text-white/65">Untung jadi</p>
              <p className="angka mt-0.5 text-[16px] font-bold">
                {formatRupiah(d.saran_harga.untung_per_unit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {d.bahan.length > 0 && (
        <div className="kartu mt-3 px-5 py-5">
          <p className="label-bagian">MODAL DATANG DARI SINI</p>
          <p className="mt-1 text-[13.5px] text-redup">
            Sekali bikin jadi {d.hasil_per_batch ?? '—'} unit
          </p>

          <div className="mt-2 divide-y divide-garis">
            {d.bahan.map((b) => (
              <BarProgres
                key={b.nama}
                label={b.nama}
                sub={`${b.jumlah_pakai} ${b.satuan}`}
                persen={b.persen_modal}
                nilai={formatRupiah(b.biaya_per_unit)}
              />
            ))}

            {/* Ongkos tenaga adalah bagian dari modal, bukan tambahan di
                luarnya. Tanpa baris ini, bar bahan berjumlah 100% sementara
                ongkos tenaga hilang dari gambar — dan pedagang menyimpulkan
                modalnya cuma bahan. Disembunyikan hanya kalau memang nol. */}
            {d.biaya_tenaga_per_unit != null && d.biaya_tenaga_per_unit > 0 && (
              <BarProgres
                label="Ongkos tenaga"
                persen={d.persen_tenaga}
                nilai={formatRupiah(d.biaya_tenaga_per_unit)}
                nada="tenaga"
              />
            )}
          </div>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
