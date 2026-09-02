import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { BarisUsulan, UsulanTransaksi } from '@shared/types';
import { catatTransaksi, usulanDariTeks } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';
import { Tombol } from '../components/Tombol';

/**
 * Catat penjualan dengan suara — fitur 2 dan 4.
 *
 * ★ Yang diucapkan TIDAK langsung tersimpan (aturan #2). Kalimatnya jadi usulan
 * lebih dulu, ditampilkan di layar konfirmasi, dan baru masuk database setelah
 * pedagang menekan simpan.
 *
 * Transkripsi terjadi di BROWSER lewat Web Speech, bukan di server: tidak ada
 * rekaman suara yang dikirim ke mana pun. Yang berangkat ke backend hanya
 * teksnya.
 *
 * Tidak ada satu pun angka yang dihitung di sini — subtotal dan untung datang
 * dari SQL setelah tersimpan.
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

export function CatatSuara() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  const [usulan, setUsulan] = useState<UsulanTransaksi | null>(null);
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
    const j = await usulanDariTeks(kalimat.trim());
    if (j.ok) setUsulan(j.data);
    else setGalat(j.error.pesan);
    setSibuk(false);
  }

  function ubahBaris(i: number, tambahan: Partial<BarisUsulan>) {
    setUsulan((lama) =>
      lama
        ? { ...lama, baris: lama.baris.map((b, j) => (j === i ? { ...b, ...tambahan } : b)) }
        : lama,
    );
  }

  const siap = usulan?.baris.filter((b) => b.produk_id != null && b.jumlah != null) ?? [];

  async function simpan() {
    if (!usulan || siap.length === 0) return;
    setSibuk(true);
    const j = await catatTransaksi({
      tanggal: usulan.tanggal,
      baris: siap.map((b) => ({
        produk_id: b.produk_id as number,
        jumlah: b.jumlah as number,
        ...(b.harga_satuan != null ? { harga_satuan: b.harga_satuan } : {}),
      })),
    });
    setSibuk(false);
    if (j.ok) nav('/beranda');
    else setGalat(j.error.pesan);
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-8 tracking-[-0.02em] text-judul font-bold text-tinta">Catat penjualan</h1>
      <p className="mt-1 text-utama leading-relaxed text-sedang">
        Ucapkan seperti biasa: "hari ini laku 10 kripik pisang sama 5 kacang telur"
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

      <label className="mt-5 block text-utama font-bold text-tinta" htmlFor="kalimat">
        Atau ketik
      </label>
      <textarea
        id="kalimat"
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        rows={3}
        placeholder="hari ini laku 10 kripik pisang"
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
            Tanggal {usulan.tanggal}. Periksa dulu, tidak ada yang masuk sebelum Anda menekan
            simpan.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {usulan.baris.map((b, i) => (
              <div
                key={`${b.nama_mentah}-${i}`}
                /* Merah hanya untuk rugi. "Belum yakin" bukan kerugian — jadi
                   warnanya kuning-perhatian, sama seperti layar konfirmasi
                   foto, supaya satu arti tidak punya dua warna. */
                className={`rounded-kontrol border p-4 ${
                  b.produk_id == null || b.perlu_dicek
                    ? 'border-tanda-tinta/25 bg-tanda'
                    : 'border-garis bg-kartu'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-utama font-semibold text-tinta">"{b.nama_mentah}"</p>
                  {b.perlu_dicek && (
                    <span className="shrink-0 rounded-full bg-tanda-tinta px-2.5 py-1 text-label font-semibold text-white">
                      PERLU DICEK
                    </span>
                  )}
                </div>

                <p className="mt-1 text-isi text-sedang">
                  {b.nama_produk ? `→ ${b.nama_produk}` : 'Produknya belum dikenali'}
                  {b.harga_satuan != null && ` · ${formatRupiah(b.harga_satuan)}`}
                </p>

                {b.kandidat.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {b.kandidat.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() =>
                          ubahBaris(i, {
                            produk_id: k.id,
                            nama_produk: k.nama,
                            perlu_dicek: false,
                          })
                        }
                        className={`min-h-12 rounded-full border-2 px-4 text-isi font-medium transition active:scale-95 ${
                          b.produk_id === k.id && !b.perlu_dicek
                            ? 'border-merek bg-kanvas text-tinta'
                            : 'border-garis-tua bg-white text-tinta'
                        }`}
                      >
                        {k.nama}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <label className="text-isi text-sedang" htmlFor={`jumlah-${i}`}>
                    Jumlah
                  </label>
                  <input
                    id={`jumlah-${i}`}
                    inputMode="numeric"
                    value={b.jumlah ?? ''}
                    onChange={(e) => {
                      const n = e.target.value.trim();
                      ubahBaris(i, { jumlah: n === '' ? null : Number(n) });
                    }}
                    className="h-14 w-24 rounded-2xl border-2 border-garis-tua px-4 text-lg outline-none focus:border-merek"
                  />
                </div>
              </div>
            ))}
          </div>

          {usulan.baris.length === 0 && (
            <p className="mt-3 text-utama leading-relaxed text-sedang">
              Tidak ada barang yang bisa dikenali dari kalimat itu. Coba sebutkan lagi.
            </p>
          )}

          <div className="mt-5">
            <Tombol varian="utama" disabled={siap.length === 0 || sibuk} onClick={() => void simpan()}>
              Simpan {siap.length} penjualan
            </Tombol>
          </div>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
