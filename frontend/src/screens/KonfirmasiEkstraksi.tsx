import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { BarisEkstraksi, BarisKonfirmasi, KonfirmasiRes } from '@shared/types';
import { formatRupiah } from '@shared/format/rupiah';
import { konfirmasiEkstraksi, pratinjauEkstraksi } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { bacaEkstraksi, hapusEkstraksi } from '../state/ekstraksi';

function keBarisKonfirmasi(b: BarisEkstraksi): BarisKonfirmasi {
  return {
    urutan: b.urutan,
    produk_id: b.produk_id,
    jumlah: b.jumlah,
    harga_satuan: b.harga_satuan,
    tanggal: b.tanggal,
  };
}

function IkonPensil() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20l4-1L19 8l-3-3L5 16l-1 4Z" />
    </svg>
  );
}

function IkonSampah() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <rect x="7" y="7" width="10" height="13" rx="1.5" />
    </svg>
  );
}

export function KonfirmasiEkstraksi() {
  const nav = useNavigate();
  const lokasi = useLocation();
  const fotoUrl = (lokasi.state as { fotoUrl?: string } | null)?.fotoUrl;
  const data = bacaEkstraksi();
  const [baris, setBaris] = useState<BarisEkstraksi[]>(data?.baris ?? []);
  const [total, setTotal] = useState({
    item: data?.total_item ?? 0,
    belanja: data?.total_belanja ?? 0,
  });
  const [editUrutan, setEditUrutan] = useState<number | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState<KonfirmasiRes | null>(null);

  // Setiap suntingan dikirim ke pratinjau — subtotal & total selalu dari API.
  async function perbarui(berikut: BarisEkstraksi[]) {
    setBaris(berikut);
    const jawaban = await pratinjauEkstraksi(berikut.map(keBarisKonfirmasi));
    if (jawaban.ok) {
      setTotal({ item: jawaban.data.total_item, belanja: jawaban.data.total_belanja });
      setBaris((lama) =>
        lama.map((b) => {
          const rinci = jawaban.data.baris.find((x) => x.urutan === b.urutan);
          return rinci ? { ...b, subtotal: rinci.subtotal } : b;
        }),
      );
    }
  }

  function ubah(urutan: number, tambahan: Partial<BarisEkstraksi>) {
    void perbarui(baris.map((b) => (b.urutan === urutan ? { ...b, ...tambahan } : b)));
  }

  function hapus(urutan: number) {
    void perbarui(baris.filter((b) => b.urutan !== urutan));
  }

  async function simpan() {
    if (!data || baris.length === 0) return;
    setSibuk(true);
    const jawaban = await konfirmasiEkstraksi(data.ekstraksi_id, baris.map(keBarisKonfirmasi));
    if (jawaban.ok) {
      hapusEkstraksi();
      setSelesai(jawaban.data);
      return;
    }
    setSibuk(false);
  }

  if (!data) {
    return (
      <Layar
        tanpaLogo
        pertanyaan="Belum ada hasil foto"
        aksi={
          <Tombol varian="gelap" onClick={() => nav('/temuan')}>
            Kembali
          </Tombol>
        }
      >
        <p className="text-[#6B635A]">Foto buku catatan dulu, nanti hasilnya muncul di sini.</p>
      </Layar>
    );
  }

  if (selesai) {
    return (
      <Layar
        tanpaLogo
        pertanyaan="Tersimpan"
        aksi={
          <Tombol varian="gelap" onClick={() => nav('/beranda')}>
            Ke Beranda
          </Tombol>
        }
      >
        <p className="text-lg text-[#4A443D]">
          {selesai.tersimpan} catatan tersimpan.
          {selesai.berkas_dihapus && ' Fotonya sudah dihapus dari server.'}
        </p>
      </Layar>
    );
  }

  return (
    <Layar tanpaLogo atas>
      <div className="-mx-6 flex items-center gap-4 border-b border-[#E8E3DA] px-6 pb-4">
        <button
          type="button"
          aria-label="Kembali"
          onClick={() => nav(-1)}
          className="text-3xl leading-none text-[#1A1714] active:scale-95"
        >
          ←
        </button>
        <h1 className="font-logo text-2xl font-bold text-[#1A1714]">Konfirmasi Transaksi</h1>
      </div>

      {fotoUrl && (
        <img src={fotoUrl} alt="Foto nota" className="mt-5 max-h-72 w-full rounded-2xl object-cover" />
      )}

      <p className="mt-5 text-[17px] leading-relaxed text-[#4A443D]">
        Kami telah mendeteksi beberapa item dari foto nota Anda. Mohon periksa kembali, terutama
        yang ditandai <span className="font-bold text-[#1A1714]">Oranye</span>.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {baris.map((b) => {
          const mengedit = b.perlu_dicek || editUrutan === b.urutan;
          const editor = (
            <>
              <div className="flex items-center gap-3">
                <input
                  value={b.nama_produk ?? b.nama_mentah}
                  onChange={(e) => ubah(b.urutan, { nama_produk: e.target.value })}
                  className="h-12 min-w-0 flex-1 rounded-xl bg-white px-3 text-[17px] font-semibold text-[#1A1714] shadow-sm outline-none focus:ring-2 focus:ring-[#1A1714]"
                />
                <div className="flex h-12 shrink-0 items-center gap-1 rounded-xl bg-white px-3 shadow-sm">
                  <span className="font-bold text-[#1A1714]">Rp</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="0"
                    value={b.harga_satuan ?? ''}
                    onChange={(e) => {
                      const angka = e.target.value.replace(/\D/g, '');
                      ubah(b.urutan, { harga_satuan: angka ? Number(angka) : null });
                    }}
                    className="w-20 bg-transparent text-right text-[17px] font-bold text-[#1A1714] outline-none"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[16px] text-[#4A443D]">
                <span>Qty:</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={b.jumlah}
                  onChange={(e) =>
                    ubah(b.urutan, { jumlah: Number(e.target.value.replace(/\D/g, '')) || 0 })
                  }
                  className="h-11 w-16 rounded-lg bg-white text-center text-[17px] font-semibold text-[#1A1714] shadow-sm outline-none focus:ring-2 focus:ring-[#1A1714]"
                />
                <span>x {b.harga_satuan !== null ? formatRupiah(b.harga_satuan) : '—'}</span>
              </div>
            </>
          );

          if (b.perlu_dicek) {
            return (
              <div
                key={b.urutan}
                className="relative overflow-hidden rounded-2xl bg-[#FBF3E2] p-5 pt-12 shadow-sm"
              >
                <span className="absolute left-0 top-0 h-full w-1.5 bg-[#1A1714]" aria-hidden />
                <span className="absolute right-0 top-0 rounded-bl-2xl bg-[#1A1714] px-4 py-1.5 text-sm font-bold text-white">
                  ⚠ Perlu Dicek
                </span>
                {editor}
                <div className="mt-4 flex justify-end border-t border-[#FBF3E2] pt-3">
                  <button
                    type="button"
                    onClick={() => hapus(b.urutan)}
                    className="flex items-center gap-1.5 font-semibold text-red-700 active:scale-95"
                  >
                    <IkonSampah /> Hapus
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={b.urutan} className="rounded-2xl bg-white p-5 shadow-sm">
              {mengedit ? (
                editor
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-bold text-[#1A1714]">
                      {b.nama_produk ?? b.nama_mentah}
                    </p>
                    <p className="mt-1 text-[15px] text-[#6B635A]">
                      Qty: {b.jumlah} x {b.harga_satuan !== null ? formatRupiah(b.harga_satuan) : '—'}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-[22px] font-bold text-[#1A1714]">
                    {formatRupiah(b.subtotal)}
                  </p>
                </div>
              )}
              <div className="mt-4 flex justify-end gap-6 border-t border-[#E8E3DA] pt-3">
                {mengedit ? (
                  <button
                    type="button"
                    onClick={() => setEditUrutan(null)}
                    className="flex items-center gap-1.5 font-semibold text-emerald-700 active:scale-95"
                  >
                    Selesai
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditUrutan(b.urutan)}
                    className="flex items-center gap-1.5 font-semibold text-emerald-700 active:scale-95"
                  >
                    <IkonPensil /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => hapus(b.urutan)}
                  className="flex items-center gap-1.5 font-semibold text-red-700 active:scale-95"
                >
                  <IkonSampah /> Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-[#E8E3DA] p-5">
        <div className="flex items-center justify-between text-lg text-[#1A1714]">
          <span>Total Item</span>
          <span className="font-semibold">{total.item}</span>
        </div>
        <div className="my-3 h-px bg-[#D6CFC4]" aria-hidden />
        <div className="flex items-center justify-between text-xl font-bold text-[#1A1714]">
          <span>Total Belanja</span>
          <span>{formatRupiah(total.belanja)}</span>
        </div>
      </div>

      <div className="mt-6">
        <Tombol varian="gelap" disabled={sibuk || baris.length === 0} onClick={simpan}>
          <span className="flex items-center justify-center gap-3">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 4v5h7V4" />
              <path d="M8 20v-6h8v6" />
            </svg>
            {sibuk ? 'Menyimpan…' : 'Simpan Transaksi'}
          </span>
        </Tombol>
      </div>
      <p className="pt-2 text-center text-sm text-[#6B635A]">
        Belum ada yang tersimpan — periksa dulu, lalu tekan Simpan.
      </p>
    </Layar>
  );
}
