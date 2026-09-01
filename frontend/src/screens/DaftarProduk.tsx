import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { RingkasanProduk } from '@shared/types';
import { ambilDaftarProduk } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { BarisDaftar, KartuDaftar } from '../components/BarisDaftar';
import { Lencana } from '../components/Lencana';
import { Segmented } from '../components/Segmented';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { RangkaDaftar } from '../components/Rangka';

type Saringan = 'semua' | 'merugi' | 'untung';

const SARINGAN: readonly { nilai: Saringan; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'merugi', label: 'Merugi' },
  { nilai: 'untung', label: 'Untung' },
];

/**
 * Daftar produk — fitur 6.
 *
 * Urutannya datang dari API: margin TERENDAH lebih dulu. Itu bagian dari
 * fiturnya, bukan selera — pedagang tidak tahu produk mana yang merugikan,
 * jadi yang merugi harus terlihat tanpa perlu dicari.
 *
 * Frontend tidak mengurutkan ulang dan tidak menghitung apa pun. Penyaring di
 * bawah hanya MENYEMBUNYIKAN baris memakai penanda `merugi` yang sudah dikirim
 * API; ia tidak pernah memutuskan sendiri mana yang merugi.
 */
export function DaftarProduk() {
  const nav = useNavigate();
  const [daftar, setDaftar] = useState<RingkasanProduk[] | null>(null);
  const [saring, setSaring] = useState<Saringan>('semua');
  const [galat, setGalat] = useState('');

  const [memuat, setMemuat] = useState(true);

  async function muat() {
    setMemuat(true);
    setGalat('');
    const j = await ambilDaftarProduk();
    if (j.ok) setDaftar(j.data);
    else setGalat(j.error.pesan);
    setMemuat(false);
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `merugi` bisa null kalau modalnya belum diketahui. Yang belum diketahui
  // tidak masuk "Untung" — belum tahu bukan berarti aman.
  const terlihat = daftar?.filter((p) =>
    saring === 'semua' ? true : saring === 'merugi' ? p.merugi === true : p.merugi === false,
  );

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-7 text-[26px] font-bold tracking-[-0.02em] text-tinta">Produk Anda</h1>

      {galat && <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />}
      {!daftar && !galat && (
        <div className="mt-4">
          <RangkaDaftar baris={3} />
        </div>
      )}

      {daftar && daftar.length > 0 && (
        <div className="mt-4">
          <Segmented
            label="Saring produk"
            pilihan={SARINGAN}
            nilai={saring}
            onPilih={setSaring}
          />
        </div>
      )}

      {daftar?.length === 0 && (
        <p className="mt-6 text-[17px] leading-relaxed text-sedang">
          Belum ada produk. Tambahkan lewat wawancara resep supaya modalnya bisa dihitung.
        </p>
      )}

      {terlihat?.length === 0 && daftar && daftar.length > 0 && (
        <p className="mt-6 text-[16px] leading-relaxed text-sedang">
          {saring === 'merugi'
            ? 'Tidak ada produk yang merugi. Bagus.'
            : 'Belum ada produk yang sudah pasti untung.'}
        </p>
      )}

      {terlihat && terlihat.length > 0 && (
        <div className="mt-3">
          <KartuDaftar>
            {terlihat.map((p) => (
              <BarisDaftar
                key={p.id}
                ikon={Package}
                nadaIkon={p.merugi ? 'rugi' : 'netral'}
                judul={p.nama}
                meta={
                  <span className="flex flex-col gap-0.5">
                    <span className="whitespace-nowrap">
                      Modal{' '}
                      <span className="font-semibold text-sedang">
                        {p.modal_per_unit == null
                          ? 'belum diisi'
                          : formatRupiah(p.modal_per_unit)}
                      </span>
                    </span>
                    <span className="whitespace-nowrap">
                      Jual{' '}
                      <span className="font-semibold text-sedang">
                        {formatRupiah(p.harga_jual)}
                      </span>
                    </span>
                  </span>
                }
                /* null = belum diketahui. Bukan nol, dan bukan untung penuh. */
                nilai={
                  p.margin_per_unit == null
                    ? '—'
                    : `${p.merugi ? '\u2212' : '+'} ${formatRupiah(Math.abs(p.margin_per_unit))}`
                }
                nadaNilai={p.margin_per_unit == null ? 'netral' : p.merugi ? 'rugi' : 'untung'}
                /* Produk bisa TERLARIS sekaligus MERUGI — dan justru itu inti
                   ceritanya. Menampilkan salah satu saja menghapus satu-satunya
                   temuan yang membuat pedagang berhenti dan membaca.

                   TERLARIS kuning HANYA kalau produknya juga merugi: kuning di
                   aplikasi ini berarti "perlu dicek manusia", dan terlaris-tapi-
                   rugi persis itu. Terlaris yang untung bukan peringatan, jadi
                   pilnya netral. */
                kanan={
                  p.merugi || p.terlaris ? (
                    <>
                      {p.merugi && <Lencana nada="rugi">MERUGI</Lencana>}
                      {p.terlaris && (
                        <Lencana nada={p.merugi ? 'tanda' : 'netral'}>TERLARIS</Lencana>
                      )}
                    </>
                  ) : undefined
                }
                onClick={() => nav(`/produk/${p.id}`)}
              />
            ))}
          </KartuDaftar>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
