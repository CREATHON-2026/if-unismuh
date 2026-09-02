import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Save, Trash2, TriangleAlert } from 'lucide-react';
import type { BarisEkstraksi, BarisKonfirmasi, KonfirmasiRes } from '@shared/types';
import { formatRupiah } from '@shared/format/rupiah';
import { konfirmasiEkstraksi, pratinjauEkstraksi } from '../api/client';
import { Layar } from '../components/Layar';
import { KartuHero } from '../components/KartuHero';
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
        <p className="text-sedang">Foto buku catatan dulu, nanti hasilnya muncul di sini.</p>
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
        <p className="text-lg leading-relaxed text-sedang">
          {selesai.tersimpan} catatan tersimpan.
          {selesai.berkas_dihapus && ' Fotonya sudah dihapus dari server.'}
        </p>
      </Layar>
    );
  }

  return (
    <Layar tanpaLogo atas>
      <div className="-mx-5 flex items-center gap-3 border-b border-garis px-5 pb-4 md:-mx-8 md:px-8">
        <button
          type="button"
          aria-label="Kembali"
          onClick={() => nav(-1)}
          className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full text-tinta transition active:scale-95"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className="text-judul-kecil font-bold tracking-[-0.02em] text-tinta">
          Konfirmasi Transaksi
        </h1>
      </div>

      {fotoUrl && (
        <img
          src={fotoUrl}
          alt="Foto nota"
          className="mt-5 max-h-72 w-full rounded-kartu border border-garis object-cover"
        />
      )}

      {/* Aturan #2: layar ini adalah gerbangnya. Kalimat ini menjelaskan
          mengapa gerbangnya ada, bukan sekadar basa-basi. */}
      <p className="mt-5 text-utama leading-relaxed text-sedang">
        Kami membaca beberapa item dari foto Anda. Belum ada yang tersimpan — periksa dulu,
        terutama baris yang <span className="font-semibold text-tanda-tinta">Perlu Dicek</span>.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {baris.map((b) => {
          const mengedit = b.perlu_dicek || editUrutan === b.urutan;
          const editor = (
            <>
              <div className="flex items-center gap-2.5">
                <input
                  value={b.nama_produk ?? b.nama_mentah}
                  onChange={(e) => ubah(b.urutan, { nama_produk: e.target.value })}
                  className="h-12 min-w-0 flex-1 rounded-kontrol border border-garis bg-kartu px-3 text-utama font-semibold text-tinta outline-none focus:border-hero"
                />
                <div className="flex h-12 shrink-0 items-center gap-1 rounded-kontrol border border-garis bg-kartu px-3">
                  <span className="text-isi font-semibold text-redup">Rp</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="0"
                    value={b.harga_satuan ?? ''}
                    onChange={(e) => {
                      const angka = e.target.value.replace(/\D/g, '');
                      ubah(b.urutan, { harga_satuan: angka ? Number(angka) : null });
                    }}
                    className="angka w-20 bg-transparent text-right text-utama font-bold text-tinta outline-none"
                  />
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-isi text-sedang">
                <span>Qty</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={b.jumlah}
                  onChange={(e) =>
                    ubah(b.urutan, { jumlah: Number(e.target.value.replace(/\D/g, '')) || 0 })
                  }
                  className="angka h-11 w-16 rounded-kontrol border border-garis bg-kartu text-center text-utama font-semibold text-tinta outline-none focus:border-hero"
                />
                <span className="angka">
                  × {b.harga_satuan !== null ? formatRupiah(b.harga_satuan) : '—'}
                </span>
              </div>
            </>
          );

          const tombolHapus = (
            <button
              type="button"
              onClick={() => hapus(b.urutan)}
              className="flex min-h-11 items-center gap-1.5 px-1 text-isi font-semibold text-rugi active:scale-95"
            >
              <Trash2 size={17} strokeWidth={1.9} /> Hapus
            </button>
          );

          /* ★ Baris yang tidak yakin dibuat MENONJOL, bukan disamarkan.
             Menyembunyikannya akan membuat pengguna menekan Simpan tanpa tahu
             ada yang perlu dilihat — itu pelanggaran aturan #2 dalam bentuk
             yang paling halus dan paling berbahaya. */
          if (b.perlu_dicek) {
            return (
              <div
                key={b.urutan}
                className="relative overflow-hidden rounded-kartu border border-tanda-tinta/20 bg-tanda p-5 pl-6"
              >
                <span
                  className="absolute left-0 top-0 h-full w-1.5 bg-tanda-tinta"
                  aria-hidden="true"
                />
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-tanda-tinta px-2.5 py-1 text-label font-semibold text-white">
                  <TriangleAlert size={13} strokeWidth={2.2} /> PERLU DICEK
                </span>
                {editor}
                <div className="mt-3 flex justify-end border-t border-tanda-tinta/15 pt-1.5">
                  {tombolHapus}
                </div>
              </div>
            );
          }

          return (
            <div key={b.urutan} className="kartu px-5 py-4">
              {mengedit ? (
                editor
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-utama font-semibold text-tinta">
                      {b.nama_produk ?? b.nama_mentah}
                    </p>
                    <p className="angka mt-0.5 text-kecil text-redup">
                      {b.jumlah} × {b.harga_satuan !== null ? formatRupiah(b.harga_satuan) : '—'}
                    </p>
                  </div>
                  <p className="angka shrink-0 text-sub font-bold text-tinta">
                    {formatRupiah(b.subtotal)}
                  </p>
                </div>
              )}
              <div className="mt-2 flex justify-end gap-5 border-t border-garis pt-1.5">
                {mengedit ? (
                  <button
                    type="button"
                    onClick={() => setEditUrutan(null)}
                    className="flex min-h-11 items-center gap-1.5 px-1 text-isi font-semibold text-tinta active:scale-95"
                  >
                    <Check size={17} strokeWidth={2.2} /> Selesai
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditUrutan(b.urutan)}
                    className="flex min-h-11 items-center gap-1.5 px-1 text-isi font-semibold text-sedang active:scale-95"
                  >
                    <Pencil size={17} strokeWidth={1.9} /> Ubah
                  </button>
                )}
                {tombolHapus}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total datang dari pratinjau API setiap kali baris disunting —
          tidak ada satu penjumlahan pun di berkas ini. */}
      <div className="mt-5">
        <KartuHero
          label="Total belanja"
          nilai={formatRupiah(total.belanja)}
          nada="netral"
          bawah={
            <div className="flex items-center justify-between text-isi">
              <span className="text-white/70">Total item</span>
              <span className="angka font-semibold text-white">{total.item}</span>
            </div>
          }
        />
      </div>

      <div className="mt-4">
        <Tombol varian="gelap" disabled={sibuk || baris.length === 0} onClick={simpan}>
          <span className="flex items-center justify-center gap-2.5">
            <Save size={20} strokeWidth={1.9} aria-hidden="true" />
            {sibuk ? 'Menyimpan…' : 'Simpan Transaksi'}
          </span>
        </Tombol>
      </div>
      <p className="pt-2.5 text-center text-isi text-redup">
        Belum ada yang tersimpan — periksa dulu, lalu tekan Simpan.
      </p>
    </Layar>
  );
}
