import { useState } from 'react';
import { Clock } from 'lucide-react';
import { ubahOngkosTenaga } from '../api/client';
import { Tombol } from './Tombol';

/**
 * Hitung waktu pedagang sebagai biaya — fitur 11.
 *
 * ★ Ini lapisan kedua dari "temuan pertama". Pedagang hampir tidak pernah
 * menghitung waktunya sendiri, jadi angka untung yang mereka rasakan selama ini
 * sudah termasuk MEMBAYAR DIRI SENDIRI NOL RUPIAH. Setelah waktunya masuk
 * hitungan, produk yang tadinya terlihat untung bisa berbalik jadi rugi — dan
 * itu bukan efek samping, itu seluruh gunanya.
 *
 * Dua pertanyaan yang benar-benar bisa dijawab pedagang. Bukan "berapa biaya
 * tenaga per batch" — tidak ada yang bisa menjawab itu langsung.
 *
 * Perkaliannya TIDAK terjadi di sini. Kedua angka dikirim apa adanya ke
 * PATCH /produk/:id/tenaga, dan SQL yang mengalikannya — aturan #7.
 */
export function KartuTenaga({
  produkId,
  sudahDihitung,
  onSelesai,
}: {
  produkId: number;
  /** true kalau ongkos tenaganya sudah pernah diisi */
  sudahDihitung: boolean;
  /** Dipanggil setelah tersimpan, supaya layar memuat ulang angkanya */
  onSelesai: () => void;
}) {
  const [buka, setBuka] = useState(false);
  const [jam, setJam] = useState('');
  const [upah, setUpah] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  async function simpan() {
    setSibuk(true);
    setGalat('');
    const j = await ubahOngkosTenaga(produkId, {
      jam_per_batch: Number(jam),
      upah_per_jam: Number(upah),
    });
    setSibuk(false);
    if (j.ok) {
      setBuka(false);
      onSelesai();
    } else setGalat(j.error.pesan);
  }

  const siap = jam.trim() !== '' && upah.trim() !== '' && Number(jam) >= 0 && Number(upah) >= 0;

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="kartu mt-3 flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:scale-[0.99]"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-tinta"
          aria-hidden="true"
        >
          <Clock size={20} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-utama font-semibold text-tinta">
            {sudahDihitung ? 'Ubah hitungan waktu Anda' : 'Waktu Anda belum dihitung'}
          </span>
          <span className="mt-0.5 block text-isi leading-relaxed text-sedang">
            {sudahDihitung
              ? 'Jam kerja atau upahnya berubah? Perbarui di sini.'
              : 'Modal di atas baru menghitung bahan. Tenaga Anda masih dihitung nol rupiah.'}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="kartu mt-3 px-5 py-5">
      <p className="label-bagian">WAKTU ANDA</p>
      <p className="mt-2 text-isi leading-relaxed text-sedang">
        Dua pertanyaan. Jawabannya dipakai untuk menghitung berapa modal Anda yang
        sebenarnya.
      </p>

      <label className="mt-4 block text-utama font-semibold text-tinta" htmlFor="jam-batch">
        Sekali bikin butuh berapa jam?
      </label>
      <input
        id="jam-batch"
        type="tel"
        inputMode="numeric"
        value={jam}
        onChange={(e) => setJam(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="3"
        className="mt-2 h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 text-utama text-tinta outline-none transition placeholder:text-redup focus:border-merek"
      />

      <label className="mt-4 block text-utama font-semibold text-tinta" htmlFor="upah-jam">
        Kalau kerja di tempat orang, sejam dibayar berapa?
      </label>
      <div className="mt-2 flex h-14 items-center rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 transition focus-within:border-merek">
        <span className="text-utama font-semibold text-sedang">Rp</span>
        <span className="mx-3 h-7 w-px bg-garis" aria-hidden="true" />
        <input
          id="upah-jam"
          type="tel"
          inputMode="numeric"
          value={upah}
          onChange={(e) => setUpah(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="15000"
          className="h-full min-w-0 flex-1 bg-transparent text-utama text-tinta outline-none placeholder:text-redup"
        />
      </div>

      {galat && (
        <p className="mt-3 rounded-kontrol bg-rugi-muda px-4 py-3 text-isi text-rugi-tua">{galat}</p>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        <Tombol disabled={!siap || sibuk} onClick={() => void simpan()}>
          {sibuk ? 'Menghitung…' : 'Hitung ulang modalnya'}
        </Tombol>
        <Tombol varian="garis" onClick={() => setBuka(false)}>
          Nanti saja
        </Tombol>
      </div>
    </div>
  );
}
