import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BarisEkstraksi } from '@shared/types/model';
import type { DataKonfirmasi } from '@shared/types/api';
import { formatRupiah } from '@shared/format/rupiah';
import { konfirmasiEkstraksi } from '../api/client';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';
import { bacaEkstraksi, hapusEkstraksi } from '../state/ekstraksi';

export function KonfirmasiEkstraksi() {
  const nav = useNavigate();
  const data = bacaEkstraksi();
  const [baris, setBaris] = useState<BarisEkstraksi[]>(data?.baris ?? []);
  const [dipilih, setDipilih] = useState<Record<number, boolean>>(
    Object.fromEntries((data?.baris ?? []).map((b) => [b.urutan, true])),
  );
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState<DataKonfirmasi | null>(null);

  if (!data) {
    return (
      <Layar pertanyaan="Belum ada hasil foto" aksi={<Tombol onClick={() => nav('/temuan')}>Kembali</Tombol>}>
        <p className="text-slate-600">Foto buku catatan dulu, nanti hasilnya muncul di sini.</p>
      </Layar>
    );
  }

  if (selesai) {
    return (
      <Layar pertanyaan="Tersimpan" aksi={<Tombol onClick={() => nav('/beranda')}>Ke Beranda</Tombol>}>
        <p className="text-lg text-slate-700">
          {selesai.tersimpan} catatan tersimpan.
          {selesai.berkas_dihapus && ' Fotonya sudah dihapus dari server.'}
        </p>
      </Layar>
    );
  }

  const jumlahDipilih = baris.filter((b) => dipilih[b.urutan]).length;

  function ubahBaris(urutan: number, tambahan: Partial<BarisEkstraksi>) {
    setBaris((lama) => lama.map((b) => (b.urutan === urutan ? { ...b, ...tambahan } : b)));
  }

  async function simpan() {
    if (!data) return;
    setSibuk(true);
    const jawaban = await konfirmasiEkstraksi(
      data.ekstraksi_id,
      baris
        .filter((b) => dipilih[b.urutan])
        .map((b) => ({
          urutan: b.urutan,
          produk_id: b.produk_id,
          jumlah: b.jumlah,
          harga_satuan: b.harga_satuan,
          tanggal: b.tanggal,
        })),
    );
    if (jawaban.ok) {
      hapusEkstraksi();
      setSelesai(jawaban.data);
      return;
    }
    setSibuk(false);
  }

  return (
    <Layar
      pertanyaan="Cek dulu hasil bacaannya"
      aksi={
        <Tombol disabled={sibuk || jumlahDipilih === 0} onClick={simpan}>
          {sibuk ? 'Menyimpan…' : `Simpan ${jumlahDipilih} Catatan`}
        </Tombol>
      }
    >
      <div className="flex flex-col gap-3">
        {baris.map((b) => (
          <div
            key={b.urutan}
            className={`rounded-2xl border-2 p-4 ${
              b.perlu_dicek ? 'border-amber-500 bg-amber-50' : 'border-slate-200'
            }`}
          >
            {b.perlu_dicek && (
              <p className="mb-2 inline-block rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white">
                Perlu dicek{b.alasan_ragu ? ` — ${b.alasan_ragu}` : ''}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-lg font-semibold text-slate-900">
                  {b.nama_produk ?? b.nama_mentah}
                </p>
                {b.perlu_dicek ? (
                  <div className="mt-2 flex gap-2">
                    <label className="flex-1 text-sm text-slate-600">
                      Jumlah
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={b.jumlah}
                        onChange={(e) => ubahBaris(b.urutan, { jumlah: Number(e.target.value.replace(/\D/g, '')) })}
                        className="mt-1 h-12 w-full rounded-xl border-2 border-slate-300 px-3 text-lg"
                      />
                    </label>
                    <label className="flex-1 text-sm text-slate-600">
                      Harga satuan
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={b.harga_satuan ?? ''}
                        placeholder="belum terbaca"
                        onChange={(e) => {
                          const angka = e.target.value.replace(/\D/g, '');
                          ubahBaris(b.urutan, { harga_satuan: angka ? Number(angka) : null });
                        }}
                        className="mt-1 h-12 w-full rounded-xl border-2 border-slate-300 px-3 text-lg"
                      />
                    </label>
                  </div>
                ) : (
                  <p className="text-slate-600">
                    {b.jumlah} × {b.harga_satuan !== null ? formatRupiah(b.harga_satuan) : '—'}
                  </p>
                )}
              </div>
              <input
                type="checkbox"
                aria-label={`Ikutkan ${b.nama_produk ?? b.nama_mentah}`}
                checked={dipilih[b.urutan] ?? false}
                onChange={(e) => setDipilih((lama) => ({ ...lama, [b.urutan]: e.target.checked }))}
                className="h-7 w-7 accent-slate-900"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        Belum ada yang tersimpan — periksa dulu, lalu tekan Simpan.
      </p>
    </Layar>
  );
}
