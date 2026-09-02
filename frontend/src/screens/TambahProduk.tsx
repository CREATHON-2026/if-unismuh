import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, PackagePlus, Pencil } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { BahanUsulan, TemuanPertama, UsulanProduk } from '@shared/types';
import { simpanProduk, usulanProdukDariTeks } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';
import { Tombol } from '../components/Tombol';
import { tulisOnboarding } from '../state/onboarding';

/**
 * Tambah produk — fitur 10.
 *
 * ★ Yang diucapkan TIDAK langsung tersimpan (aturan #2). Kalimatnya jadi usulan
 * lebih dulu, pedagang memeriksanya, dan baru masuk database setelah ia menekan
 * simpan. Pola dan pengenal suaranya dicetak dari CatatSuara.tsx, karena
 * alurnya memang sama persis — bicara, diperiksa, disimpan.
 *
 * Layar ini ada karena sebelumnya pedagang TIDAK BISA menambah produk kedua:
 * tombol "Tambah produk" hidup di dalam cabang daftar-kosong di DaftarProduk,
 * jadi ia menghilang begitu ada satu produk. Yang tersisa hanya tautan ke
 * wizard onboarding, yang menyambut dengan bar progres "langkah 3 dari 4" dan
 * pertanyaan "Apa produk yang paling laku?" — pertanyaan yang salah untuk orang
 * yang sedang menambah produk keenam.
 *
 * Empat medan usulan diperlakukan BERBEDA, dan itu inti aturan #2 dan #8:
 *   yang_kurang  -> menahan tombol simpan; harus dijawab
 *   perlu_dicek  -> baris bahannya ditandai menonjol
 *   produk_mirip -> peringatan duplikat; menyimpan diam-diam memecah riwayat
 *   catatan      -> ditampilkan, tapi tidak menahan
 *
 * Tidak ada angka yang dihitung di sini. Modal dan margin datang jadi dari SQL
 * setelah tersimpan (aturan #7).
 */

type PengenalSuara = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: {
    resultIndex: number;
    results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
  }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function buatPengenal(): PengenalSuara | null {
  const w = window as unknown as { SpeechRecognition?: new () => PengenalSuara; webkitSpeechRecognition?: new () => PengenalSuara };
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

const CONTOH =
  'donat gula, sekali bikin 50 biji, dijual 3 ribu, bahannya terigu 5 kilo 60 ribu sama gula halus 2 kilo 30 ribu';

/** Bahan dianggap lengkap kalau ketiga angkanya ada — sama dengan syarat backend. */
function bahanLengkap(b: BahanUsulan): boolean {
  return b.jumlah != null && b.harga_beli != null && b.jumlah_beli != null;
}

export function TambahProduk() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  const [usulan, setUsulan] = useState<UsulanProduk | null>(null);
  const [tersimpan, setTersimpan] = useState<TemuanPertama | null>(null);
  const [namaManual, setNamaManual] = useState('');
  const [mendengar, setMendengar] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const pengenal = useRef<PengenalSuara | null>(null);

  const adaSuara = typeof window !== 'undefined' && buatPengenal() !== null;
  const amanUntukMic = typeof window !== 'undefined' && window.isSecureContext;

  function mulaiRekam() {
    const r = buatPengenal();
    if (!r) return;
    pengenal.current = r;
    r.lang = 'id-ID';
    r.continuous = true;
    r.interimResults = true;

    let final = '';
    setMendengar(true);
    setGalat('');

    r.onresult = (e) => {
      let sementara = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const potongan = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += potongan;
        else sementara += potongan;
      }
      setTeks((final + sementara).trim());
    };
    r.onerror = (e) => {
      setGalat(
        e.error === 'not-allowed'
          ? 'Mikrofonnya belum diizinkan. Izinkan dulu di browser, atau ketik saja di bawah.'
          : 'Suaranya belum terbaca. Coba lagi, atau ketik saja di bawah.',
      );
      setMendengar(false);
    };
    r.onend = () => setMendengar(false);
    r.start();
  }

  async function bacaKalimat(kalimat: string) {
    if (!kalimat.trim()) return;
    setSibuk(true);
    setGalat('');
    const j = await usulanProdukDariTeks(kalimat.trim());
    if (j.ok) setUsulan(j.data);
    else setGalat(j.error.pesan);
    setSibuk(false);
  }

  function ubahUsulan(tambahan: Partial<UsulanProduk>) {
    setUsulan((lama) => (lama ? { ...lama, ...tambahan } : lama));
  }

  function ubahBahan(i: number, tambahan: Partial<BahanUsulan>) {
    setUsulan((lama) =>
      lama
        ? { ...lama, bahan: lama.bahan.map((b, j) => (j === i ? { ...b, ...tambahan } : b)) }
        : lama,
    );
  }

  /**
   * Boleh disimpan atau belum.
   *
   * Bukan sekadar membaca `usulan.perlu_dicek` dari server: pedagang baru saja
   * membetulkan yang kurang di layar ini, dan penanda dari server masih
   * menggambarkan keadaan SEBELUM ia mengetik. Yang dinilai di sini adalah isi
   * kotak sekarang — nama dan harga wajib, dan kalau ada bahan, resepnya harus
   * lengkap. Syaratnya sengaja dicocokkan dengan yang ditolak backend, supaya
   * tombol tidak pernah hidup untuk sesuatu yang akan ditolak server.
   */
  const adaBahan = (usulan?.bahan.length ?? 0) > 0;
  const bahanBeres = usulan?.bahan.every(bahanLengkap) ?? true;
  const bisaSimpan =
    usulan != null
    && (usulan.nama_produk ?? '').trim() !== ''
    && usulan.harga_jual != null
    && (!adaBahan || (usulan.hasil_per_batch != null && bahanBeres));

  async function simpan() {
    if (!usulan || !bisaSimpan) return;
    setSibuk(true);
    setGalat('');
    const j = await simpanProduk({
      nama_produk: (usulan.nama_produk ?? '').trim(),
      harga_jual: usulan.harga_jual as number,
      hasil_per_batch: (usulan.hasil_per_batch ?? 0) as number,
      bahan: usulan.bahan.filter(bahanLengkap).map((b) => ({
        nama: b.nama,
        satuan: b.satuan ?? 'buah',
        jumlah: b.jumlah as number,
        harga_beli: b.harga_beli as number,
        jumlah_beli: b.jumlah_beli as number,
      })),
    });
    setSibuk(false);
    if (!j.ok) {
      setGalat(j.error.pesan);
      return;
    }
    setTersimpan(j.data);
    setUsulan(null);
    setTeks('');
  }

  function tambahLagi() {
    setTersimpan(null);
    setUsulan(null);
    setTeks('');
    setGalat('');
  }

  function isiManual() {
    if (!namaManual.trim()) return;
    tulisOnboarding({ nama_produk: namaManual.trim(), mode: 'tambah' });
    nav('/resep/bahan');
  }

  // --- Sesudah tersimpan: temuan produk barunya, lalu jalan untuk lanjut ----
  if (tersimpan) {
    const belumAdaModal = tersimpan.margin_per_unit == null;
    const rugi = tersimpan.merugi === true;

    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi />
        <h1 className="mt-8 tracking-[-0.02em] text-judul font-bold text-tinta">
          {tersimpan.nama} tersimpan
        </h1>

        {belumAdaModal ? (
          /* Yang tidak diketahui tampil sebagai tidak diketahui — bukan untung
             penuh, bukan rugi. Produk tanpa resep memang belum punya modal. */
          <div className="mt-4 rounded-kartu bg-tanda p-5">
            <p className="text-utama font-semibold text-tanda-tinta">Modal belum diisi</p>
            <p className="mt-1 text-isi leading-relaxed text-tanda-tinta">
              Untung-ruginya belum bisa dihitung sampai bahannya dicatat. Penjualannya tetap
              masuk uang masuk, tapi belum ikut dihitung sebagai untung.
            </p>
          </div>
        ) : (
          <div className={`mt-4 rounded-kartu p-5 ${rugi ? 'bg-rugi-muda' : 'bg-untung-muda'}`}>
            <p className={`text-utama font-semibold ${rugi ? 'text-rugi-tua' : 'text-untung-tua'}`}>
              {rugi ? 'Produk ini merugi' : 'Produk ini untung'}
            </p>
            <p className={`angka mt-2 text-nomor font-extrabold leading-none ${rugi ? 'text-rugi' : 'text-untung'}`}>
              {rugi ? '−' : '+'} {formatRupiah(Math.abs(tersimpan.margin_per_unit as number))}
            </p>
            <p className={`mt-2 text-isi ${rugi ? 'text-rugi-tua' : 'text-untung-tua'}`}>
              tiap satu terjual · modal {formatRupiah(tersimpan.modal_per_unit as number)}, dijual{' '}
              {formatRupiah(tersimpan.harga_jual)}
            </p>
          </div>
        )}

        <div className="mt-5">
          <Tombol varian="utama" onClick={tambahLagi}>
            <span className="flex items-center justify-center gap-2.5">
              <PackagePlus size={21} strokeWidth={1.9} aria-hidden="true" />
              Tambah produk lagi
            </span>
          </Tombol>
        </div>
        <div className="mt-2">
          <Tombol varian="garis" onClick={() => nav(`/produk/${tersimpan.produk_id}`)}>
            Lihat produk ini
          </Tombol>
        </div>
        <button
          type="button"
          onClick={() => nav('/produk')}
          className="min-h-12 w-full py-3 text-center text-utama font-semibold text-sedang active:scale-95"
        >
          Kembali ke daftar produk
        </button>

        <NavBawah />
      </Layar>
    );
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-8 tracking-[-0.02em] text-judul font-bold text-tinta">Tambah produk</h1>
      <p className="mt-1 text-utama leading-relaxed text-sedang">
        Ceritakan satu produk beserta bahannya. Modal dan untungnya dihitung sendiri.
      </p>

      {!adaSuara && (
        <p className="mt-3 rounded-kontrol bg-tanda p-4 text-isi leading-relaxed text-tanda-tinta">
          Browser ini belum mendukung suara. Pakai Chrome, atau ketik saja di bawah — hasilnya sama.
        </p>
      )}
      {adaSuara && !amanUntukMic && (
        <p className="mt-3 rounded-kontrol bg-tanda p-4 text-isi leading-relaxed text-tanda-tinta">
          Halaman ini dibuka lewat http, jadi browser memblokir mikrofon. Ketik saja di bawah.
        </p>
      )}

      <button
        type="button"
        disabled={!adaSuara || !amanUntukMic || mendengar}
        onClick={mulaiRekam}
        className="mt-4 flex min-h-20 w-full items-center justify-center gap-3 rounded-full bg-merek text-sub font-bold text-white transition active:scale-[0.98] disabled:bg-garis disabled:text-sedang disabled:active:scale-100"
      >
        <Mic size={26} strokeWidth={1.9} aria-hidden="true" />
        {mendengar ? 'Mendengarkan…' : 'Mulai bicara'}
      </button>

      <label className="mt-5 block text-utama font-bold text-tinta" htmlFor="kalimat-produk">
        Atau ketik
      </label>
      <textarea
        id="kalimat-produk"
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        rows={3}
        placeholder={CONTOH}
        className="mt-2 w-full rounded-kartu border-[1.5px] border-garis-tua bg-kartu p-4 text-utama leading-relaxed text-tinta outline-none placeholder:text-redup focus:border-merek"
      />
      <div className="mt-3">
        <Tombol varian="gelap" disabled={!teks.trim() || sibuk} onClick={() => void bacaKalimat(teks)}>
          {sibuk ? 'Membaca…' : 'Baca kalimat ini'}
        </Tombol>
      </div>

      {galat && (
        <p className="mt-3 rounded-2xl bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
      )}

      {usulan && (
        <div className="kartu mt-4 p-6">
          <p className="text-sub font-bold text-tinta">Belum tersimpan</p>
          <p className="mt-1 text-isi leading-relaxed text-sedang">
            Periksa dulu. Tidak ada yang masuk sebelum Anda menekan simpan.
          </p>

          {/* Duplikat: ditanyakan, bukan diputuskan sendiri. Dua produk bernama
              nyaris sama memecah riwayat penjualannya jadi dua dan tidak ada
              yang menyadarinya sampai angkanya terlihat aneh. */}
          {usulan.produk_mirip.length > 0 && (
            <div className="mt-4 rounded-kontrol bg-tanda p-4">
              <p className="text-utama font-semibold text-tanda-tinta">
                Sudah ada produk yang mirip
              </p>
              <p className="mt-1 text-isi leading-relaxed text-tanda-tinta">
                Kalau ini barang yang sama, jangan tambah baru — buka yang lama saja.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {usulan.produk_mirip.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => nav(`/produk/${k.id}`)}
                    className="min-h-12 rounded-full border-2 border-tanda-tinta/40 bg-white px-4 text-isi font-medium text-tinta transition active:scale-95"
                  >
                    {k.nama}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Yang HARUS dijawab. Tombol simpan ditahan sampai beres. */}
          {usulan.yang_kurang.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {usulan.yang_kurang.map((t) => (
                <li
                  key={t}
                  className="rounded-kontrol border border-tanda-tinta/25 bg-tanda p-4 text-isi leading-relaxed text-tanda-tinta"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}

          <label className="mt-5 block text-utama font-bold text-tinta" htmlFor="nama-usulan">
            Nama produk
          </label>
          <input
            id="nama-usulan"
            value={usulan.nama_produk ?? ''}
            onChange={(e) => ubahUsulan({ nama_produk: e.target.value })}
            placeholder="Misal: Donat Gula"
            className="mt-2 h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua px-4 text-utama text-tinta outline-none placeholder:text-redup focus:border-merek"
          />

          <div className="mt-4 flex gap-3">
            <div className="flex-1">
              <label className="block text-utama font-bold text-tinta" htmlFor="harga-usulan">
                Dijual berapa
              </label>
              <input
                id="harga-usulan"
                type="tel"
                inputMode="numeric"
                value={usulan.harga_jual ?? ''}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, '');
                  ubahUsulan({ harga_jual: n === '' ? null : Number(n) });
                }}
                placeholder="3000"
                className="mt-2 h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua px-4 text-utama text-tinta outline-none placeholder:text-redup focus:border-merek"
              />
            </div>
            <div className="flex-1">
              <label className="block text-utama font-bold text-tinta" htmlFor="hasil-usulan">
                Sekali bikin jadi
              </label>
              <input
                id="hasil-usulan"
                type="tel"
                inputMode="numeric"
                value={usulan.hasil_per_batch ?? ''}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, '');
                  ubahUsulan({ hasil_per_batch: n === '' ? null : Number(n) });
                }}
                placeholder="50"
                className="mt-2 h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua px-4 text-utama text-tinta outline-none placeholder:text-redup focus:border-merek"
              />
            </div>
          </div>

          {usulan.bahan.length > 0 && (
            <>
              <p className="label-bagian mt-6">BAHAN SEKALI BIKIN</p>
              <div className="mt-2 flex flex-col gap-3">
                {usulan.bahan.map((b, i) => (
                  <div
                    key={`${b.nama}-${i}`}
                    /* Kuning berarti "perlu diperiksa", bukan rugi — sama dengan
                       layar konfirmasi foto, supaya satu arti tidak punya dua
                       warna. */
                    className={`rounded-kontrol border p-4 ${
                      bahanLengkap(b) ? 'border-garis bg-kartu' : 'border-tanda-tinta/25 bg-tanda'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-utama font-semibold text-tinta">{b.nama}</p>
                      {!bahanLengkap(b) && (
                        <span className="shrink-0 rounded-full bg-tanda-tinta px-2.5 py-1 text-label font-semibold text-white">
                          PERLU DICEK
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        aria-label={`Jumlah ${b.nama} sekali bikin`}
                        type="tel"
                        inputMode="numeric"
                        value={b.jumlah ?? ''}
                        onChange={(e) => {
                          const n = e.target.value.replace(/[^\d.]/g, '');
                          ubahBahan(i, { jumlah: n === '' ? null : Number(n) });
                        }}
                        placeholder="Jumlah"
                        className="h-14 w-24 rounded-kontrol border-[1.5px] border-garis-tua px-3 text-utama outline-none focus:border-merek"
                      />
                      <input
                        aria-label={`Satuan ${b.nama}`}
                        value={b.satuan ?? ''}
                        onChange={(e) => ubahBahan(i, { satuan: e.target.value })}
                        placeholder="kg"
                        className="h-14 w-20 rounded-kontrol border-[1.5px] border-garis-tua px-3 text-utama outline-none focus:border-merek"
                      />
                      <input
                        aria-label={`Beli ${b.nama} sebanyak`}
                        type="tel"
                        inputMode="numeric"
                        value={b.jumlah_beli ?? ''}
                        onChange={(e) => {
                          const n = e.target.value.replace(/[^\d.]/g, '');
                          ubahBahan(i, { jumlah_beli: n === '' ? null : Number(n) });
                        }}
                        placeholder="Beli brp"
                        className="h-14 w-28 rounded-kontrol border-[1.5px] border-garis-tua px-3 text-utama outline-none focus:border-merek"
                      />
                      <input
                        aria-label={`Harga beli ${b.nama}`}
                        type="tel"
                        inputMode="numeric"
                        value={b.harga_beli ?? ''}
                        onChange={(e) => {
                          const n = e.target.value.replace(/\D/g, '');
                          ubahBahan(i, { harga_beli: n === '' ? null : Number(n) });
                        }}
                        placeholder="Harganya"
                        className="h-14 w-32 rounded-kontrol border-[1.5px] border-garis-tua px-3 text-utama outline-none focus:border-merek"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Boleh dilewati, tapi akibatnya perlu disadari. */}
          {usulan.catatan.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5">
              {usulan.catatan.map((t) => (
                <li key={t} className="text-isi leading-relaxed text-redup">
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            <Tombol varian="utama" disabled={!bisaSimpan || sibuk} onClick={() => void simpan()}>
              {sibuk ? 'Menyimpan…' : 'Simpan produk'}
            </Tombol>
          </div>
          {!bisaSimpan && (
            <p className="mt-2 text-center text-isi leading-relaxed text-redup">
              Lengkapi dulu yang ditandai kuning di atas.
            </p>
          )}
        </div>
      )}

      {/* Jalan kedua. Sengaja melewati layar onboarding "Apa produk yang paling
          laku?" — pertanyaan itu benar untuk produk pertama, bukan untuk yang
          keenam. Yang dibutuhkan wizard hanyalah namanya. */}
      {!usulan && (
        <div className="kartu mt-6 p-6">
          <p className="flex items-center gap-2.5 text-sub font-bold text-tinta">
            <Pencil size={19} strokeWidth={2} className="text-merek" aria-hidden="true" />
            Isi sendiri langkah demi langkah
          </p>
          <p className="mt-1 text-isi leading-relaxed text-sedang">
            Kalau lebih suka mengetik satu-satu, tulis namanya dulu.
          </p>
          <input
            aria-label="Nama produk baru"
            value={namaManual}
            onChange={(e) => setNamaManual(e.target.value)}
            placeholder="Misal: Donat Gula"
            className="mt-3 h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua px-4 text-utama text-tinta outline-none placeholder:text-redup focus:border-merek"
          />
          <div className="mt-3">
            <Tombol varian="garis" disabled={!namaManual.trim()} onClick={isiManual}>
              Lanjut isi bahan
            </Tombol>
          </div>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
