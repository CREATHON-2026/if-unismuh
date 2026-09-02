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
        <div className="mt-5 flex flex-1 flex-col gap-3">
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
        /* `flex-1`, bukan `max-h-[52vh]`. Tinggi tetap menyisakan ruang mati
           di antara kolom ketik dan nav bawah pada layar yang tinggi, dan
           memotong percakapan pada layar yang pendek — salah di kedua arah.
           Viewport bawaan MessageScroller sudah `h-full`, jadi cukup beri tahu
           kolom induknya bahwa layar inilah yang menyerap sisa ruang.

           `justify-end` pada isinya menempelkan pesan ke BAWAH, bukan ke atas.
           Setelah menekan kirim, mata pengguna ada di kolom ketik; jawaban yang
           muncul tepat di atasnya langsung terbaca, sedangkan jawaban yang
           menempel di atas layar menyisakan ruang kosong di antara keduanya dan
           menuntut mata melompat. Saat percakapannya sudah panjang, `min-h-full`
           berhenti berpengaruh dan gulirannya berjalan seperti biasa. */
        <MessageScroller
          followOutput
          busy={sibuk}
          label="Percakapan dengan lapakAi"
          className="mt-5 flex flex-1 flex-col"
          viewportClassName="flex min-h-0 flex-1 flex-col"
          contentClassName="mt-auto"
        >
          <MessageGroup spacing="default">
            {baris.map((b) => (
              <Message key={b.id} from={b.dari === 'pengguna' ? 'user' : 'assistant'} animateIn>
                <MessageContent>
                  <MessageBubble
                    variant={b.dari === 'pengguna' ? 'solid' : 'soft'}
                  >
                    {/* Warna DUDUK DI SINI, dan menyasar SPAN-nya, bukan
                        elemen ini. Dua jebakan bertumpuk:

                        1. `MessageBubble` meneruskan className-nya ke
                           pembungkus `flex w-full flex-col` yang selebar layar
                           dan tanpa radius. Mengecatnya menghasilkan pita
                           penuh-lebar di belakang gelembung. Yang benar-benar
                           `rounded-2xl max-w-[82%]` adalah elemen konten ini.

                        2. `bg-merek` di elemen konten pun TIDAK terlihat.
                           beUI menyisipkan `<span class="absolute inset-0
                           -z-10">` sebagai permukaan gelembung, dan menurut
                           urutan pengecatan CSS anak ber-z-index negatif
                           digambar DI ATAS latar elemen induknya sendiri.
                           Ungunya terpasang, lalu tertutup hitam. Terbaca di
                           peramban: konten rgb(111,18,246), span rgb(15,23,42),
                           kotak sama persis.

                        Karena itu `[&>span]:bg-…` — satu-satunya lapisan yang
                        benar-benar terlihat. `variant` tetap diisi supaya
                        maksudnya terbaca dan animasi masuknya jalan.

                        `teks-gelembung`, bukan `text-utama`: lihat index.css.
                        Singkatnya `cn()` mengira `text-utama` warna, lalu
                        membuang warna aslinya. */}
                    <MessageBubbleContent
                      className={
                        b.dari === 'pengguna'
                          ? 'teks-gelembung text-white [&>span]:bg-merek'
                          : 'teks-gelembung border border-garis text-tinta [&>span]:bg-kartu'
                      }
                    >
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
                  <ThinkingShimmer className="teks-gelembung">Sedang menghitung…</ThinkingShimmer>
                </MessageContent>
              </Message>
            )}
          </MessageGroup>
        </MessageScroller>
      )}

      {galat && (
        <p className="mt-4 rounded-2xl bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
      )}

      {/* Kolom ketik DIPAKU bersama nav, bukan mengalir bebas.

          Sebabnya terukur: satu jawaban dengan kartu acuan sembilan baris
          membuat halaman setinggi 1062px di viewport 975px. Karena `NavBawah`
          `sticky bottom-0`, ia menutupi kolom ketik yang ada di bawahnya dalam
          urutan dokumen — jadi pengguna harus menggulir dulu sebelum bisa
          bertanya lagi. Di layar percakapan itu jelas salah.

          Dipaku sebagai satu blok, bukan dua sticky terpisah, supaya jaraknya
          ke nav ikut menyesuaikan area aman perangkat. `bg-kanvas` wajib —
          tanpanya pesan yang tergulir terbaca menembus kolom ketik. */}
      <div className="sticky bottom-0 -mx-5 mt-auto bg-kanvas px-5">
        <form
          className="flex items-end gap-2 pt-3"
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
      </div>
    </Layar>
  );
}
