import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import type { TanyaRes } from '@shared/types';
import { tanya } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';
import {
  Message,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
  MessageGroup,
  MessageScroller,
} from '../components/agents/message';
import { ThinkingShimmer } from '../components/agents/loading-states/thinking-shimmer';

/**
 * Tanya lapakAi — chatbot atas data pedagang sendiri.
 *
 * ★ TIDAK ADA SATU PUN PERHITUNGAN DI LAYAR INI (aturan #7). `jawaban` sudah
 * berupa kalimat jadi dari backend, dan `acuan` adalah angka SQL mentah yang
 * dipakai menyusun kalimat itu. Layar ini hanya menampilkan keduanya
 * berdampingan.
 *
 * Menampilkan `acuan` bukan hiasan: itu yang membuat jawabannya bisa
 * diperiksa. Kalau angka di kalimatnya berbeda dari angka di kartu bawahnya,
 * ada yang salah — dan pedagang bisa melihatnya sendiri tanpa membuka apa pun.
 *
 * Rupa percakapannya memakai komponen agen beUI (src/components/agents/).
 *
 * Pertanyaan mencatat penjualan TIDAK diproses di sini. Backend mengembalikan
 * `alihkan_ke`, dan layar ini membuka Catat dengan kalimatnya sudah terisi —
 * supaya yang menyimpan tetap satu layar yang sama, dengan konfirmasi manusia
 * seperti biasa (aturan #2).
 */

interface Baris {
  id: number;
  dari: 'pengguna' | 'lapak';
  teks: string;
  acuan?: TanyaRes['acuan'];
  peringatan?: string[];
}

/**
 * Contoh pertanyaan yang benar-benar bisa dijawab.
 *
 * Bukan basa-basi. Kotak teks kosong adalah pertanyaan tanpa jawaban bagi orang
 * yang belum pernah memakai chatbot, dan pengguna kita berusia 35–60 tahun.
 * Daftar ini juga jujur menunjukkan batas cakupannya: yang di luar ini memang
 * tidak akan terjawab.
 */
const CONTOH = [
  'Bulan ini untung saya berapa?',
  'Produk mana yang bikin saya rugi?',
  'Produk apa yang paling laku?',
];

/** `untung_bersih` -> "Untung bersih", `rugi_per_unit_2` -> "Rugi per unit". */
function namaAcuan(kunci: string): string {
  const tanpaUrutan = kunci.replace(/_\d+$/, '').replace(/_/g, ' ');
  return tanpaUrutan.charAt(0).toUpperCase() + tanpaUrutan.slice(1);
}

/**
 * Memformat, bukan menghitung. Pemisah ribuan saja, tanpa "Rp" — sebagian
 * acuan adalah banyaknya barang, bukan uang, dan menambahkan "Rp" di sini
 * berarti layar ini ikut menafsirkan angka yang bukan urusannya.
 */
function nilaiAcuan(nilai: number | string): string {
  return typeof nilai === 'number' ? nilai.toLocaleString('id-ID') : nilai;
}

export function Tanya() {
  const nav = useNavigate();
  const [pertanyaan, setPertanyaan] = useState('');
  const [baris, setBaris] = useState<Baris[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const berikutnya = useRef(0);

  // Fokus tidak dipindahkan otomatis ke kolom ketik saat layar dibuka: papan
  // ketik yang langsung naik menutupi contoh pertanyaan, dan contoh itulah yang
  // paling menolong pengguna yang belum tahu harus bertanya apa.
  useEffect(() => setGalat(''), [pertanyaan]);

  async function kirim(teks: string) {
    const bersih = teks.trim();
    if (!bersih || sibuk) return;

    setPertanyaan('');
    setGalat('');
    setBaris((lama) => [
      ...lama,
      { id: berikutnya.current++, dari: 'pengguna', teks: bersih },
    ]);
    setSibuk(true);

    const j = await tanya(bersih);
    setSibuk(false);

    if (!j.ok) {
      setGalat(j.error.pesan);
      return;
    }

    // Melaporkan penjualan bukan pertanyaan. Yang menyimpan tetap layar Catat.
    if (j.data.alihkan_ke) {
      nav(j.data.alihkan_ke.rute, { state: { teks: j.data.alihkan_ke.teks } });
      return;
    }

    setBaris((lama) => [
      ...lama,
      {
        id: berikutnya.current++,
        dari: 'lapak',
        teks: j.data.jawaban,
        acuan: j.data.acuan,
        peringatan: j.data.peringatan,
      },
    ]);
  }

  const kosong = baris.length === 0;

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <h1 className="mt-8 tracking-[-0.02em] text-judul font-bold text-tinta">Tanya lapakAi</h1>
      <p className="mt-1 text-utama leading-relaxed text-sedang">
        Tanya soal untung, modal, harga, stok, dan produk yang paling laku.
      </p>

      {kosong ? (
        <div className="mt-5 flex flex-col gap-3">
          {CONTOH.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void kirim(c)}
              className="flex min-h-14 w-full items-center gap-3 rounded-kontrol border border-garis bg-kartu px-4 text-left text-utama text-tinta transition active:scale-[0.99]"
            >
              <Sparkles size={20} strokeWidth={1.9} className="shrink-0 text-merek" aria-hidden="true" />
              {c}
            </button>
          ))}
        </div>
      ) : (
        <MessageScroller
          followOutput
          busy={sibuk}
          label="Percakapan dengan lapakAi"
          className="mt-5"
          viewportClassName="max-h-[52vh]"
        >
          <MessageGroup spacing="default">
            {baris.map((b) => (
              <Message key={b.id} from={b.dari === 'pengguna' ? 'user' : 'assistant'} animateIn>
                <MessageContent>
                  <MessageBubble
                    variant={b.dari === 'pengguna' ? 'solid' : 'soft'}
                    className={
                      b.dari === 'pengguna'
                        ? 'bg-merek text-white'
                        : 'border border-garis bg-kartu text-tinta'
                    }
                  >
                    <MessageBubbleContent className="text-utama leading-relaxed">
                      {b.teks}
                    </MessageBubbleContent>
                  </MessageBubble>

                  {/* Angka mentah dari SQL, di samping kalimatnya. Bukan hiasan:
                      ini yang membuat jawabannya bisa dicocokkan. */}
                  {b.acuan && Object.keys(b.acuan).length > 0 && (
                    <div className="w-full rounded-kontrol border border-garis bg-permukaan p-4">
                      <p className="label-bagian">ANGKA YANG DIPAKAI</p>
                      <dl className="mt-2 flex flex-col gap-1.5">
                        {Object.entries(b.acuan).map(([kunci, nilai]) => (
                          <div key={kunci} className="flex items-baseline justify-between gap-4">
                            <dt className="text-isi text-sedang">{namaAcuan(kunci)}</dt>
                            <dd className="angka text-isi font-semibold text-tinta">
                              {nilaiAcuan(nilai)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {b.peringatan?.map((p) => (
                    <p
                      key={p}
                      className="w-full rounded-kontrol bg-tanda p-4 text-isi leading-relaxed text-tanda-tinta"
                    >
                      {p}
                    </p>
                  ))}
                </MessageContent>
              </Message>
            ))}

            {sibuk && (
              <Message from="assistant">
                <MessageContent>
                  <ThinkingShimmer className="text-utama">Sedang menghitung…</ThinkingShimmer>
                </MessageContent>
              </Message>
            )}
          </MessageGroup>
        </MessageScroller>
      )}

      {galat && (
        <p className="mt-4 rounded-2xl bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
      )}

      <form
        className="mt-5 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void kirim(pertanyaan);
        }}
      >
        <label className="sr-only" htmlFor="pertanyaan">
          Pertanyaan
        </label>
        <input
          id="pertanyaan"
          value={pertanyaan}
          onChange={(e) => setPertanyaan(e.target.value)}
          placeholder="Tulis pertanyaan…"
          autoComplete="off"
          className="h-14 min-w-0 flex-1 rounded-kartu border-[1.5px] border-garis-tua bg-kartu px-4 text-utama text-tinta outline-none placeholder:text-redup focus:border-merek"
        />
        <button
          type="submit"
          disabled={!pertanyaan.trim() || sibuk}
          aria-label="Kirim pertanyaan"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-merek text-white transition active:scale-95 disabled:bg-garis disabled:text-sedang disabled:active:scale-100"
        >
          <Send size={22} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </form>

      <NavBawah />
    </Layar>
  );
}
