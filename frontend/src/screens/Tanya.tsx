import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { riwayatTanya, tanya } from '../api/client';
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
 * Layar ini hanya menampilkan. `jawaban` datang sebagai kalimat jadi dari
 * backend dan ditampilkan apa adanya: tidak dipotong, tidak disaring, tidak
 * ditambahi kartu apa pun. Model yang menyusunnya bebas menjawab apa saja —
 * termasuk hal yang tidak ada hubungannya dengan usaha — jadi bentuk
 * jawabannya tidak bisa ditebak dan layar ini tidak boleh berasumsi apa pun
 * tentang isinya.
 *
 * Karena jawabannya bisa berupa beberapa paragraf atau daftar berpoin,
 * `whitespace-pre-wrap` di gelembung asisten bukan hiasan: tanpanya semua baris
 * menempel jadi satu blok yang tidak terbaca.
 *
 * Rupa percakapannya memakai komponen agen beUI (src/components/agents/).
 */

interface Baris {
  id: number;
  dari: 'pengguna' | 'lapak';
  teks: string;
}

/**
 * Contoh pertanyaan.
 *
 * Bukan basa-basi. Kotak teks kosong adalah pertanyaan tanpa jawaban bagi orang
 * yang belum pernah memakai chatbot, dan pengguna kita berusia 35–60 tahun.
 *
 * Dipilih yang bentuknya BERBEDA-BEDA — satu angka lugas, satu pengandaian,
 * satu minta pendapat. Chatbotnya menjawab bebas, jadi contoh yang seragam
 * justru menyesatkan: pengguna akan mengira hanya tiga kalimat itu yang boleh
 * ditanyakan.
 */
const CONTOH = [
  'Bulan ini untung saya berapa?',
  'Kalau kripik saya jual 25 ribu, untungnya berapa?',
  'Menurutmu produk mana yang sebaiknya saya hentikan?',
];

export function Tanya() {
  const [pertanyaan, setPertanyaan] = useState('');
  const [baris, setBaris] = useState<Baris[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);
  const berikutnya = useRef(0);

  // Fokus tidak dipindahkan otomatis ke kolom ketik saat layar dibuka: papan
  // ketik yang langsung naik menutupi contoh pertanyaan, dan contoh itulah yang
  // paling menolong pengguna yang belum tahu harus bertanya apa.
  useEffect(() => setGalat(''), [pertanyaan]);

  /**
   * Muat percakapan yang MASIH DIINGAT server.
   *
   * Tanpa ini layar kosong setiap kali dimuat ulang — padahal server menyimpan
   * percakapannya dan tetap memakainya sebagai konteks. Akibatnya jawaban
   * berikutnya merujuk giliran yang tidak pernah terlihat pengguna, dan
   * chatbotnya terkesan menjawab pertanyaan yang tidak pernah ia ajukan.
   *
   * `memuat` dipisah dari `sibuk`: yang satu memuat riwayat, yang lain menunggu
   * jawaban. Kalau digabung, rangka pemuatan ikut muncul tiap kali bertanya.
   */
  useEffect(() => {
    let batal = false;
    void (async () => {
      const j = await riwayatTanya();
      if (batal) return;
      if (j.ok) {
        setBaris(j.data.giliran.map((g) => ({
          id: berikutnya.current++,
          dari: g.peran === 'pedagang' ? 'pengguna' : 'lapak',
          teks: g.teks,
        })));
      }
      // Gagal memuat riwayat TIDAK ditampilkan sebagai galat. Percakapan lama
      // bukan syarat untuk bertanya — memblokir layar karenanya menukar
      // gangguan kecil dengan jalan buntu.
      setMemuat(false);
    })();
    return () => { batal = true; };
  }, []);

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

    setBaris((lama) => [
      ...lama,
      { id: berikutnya.current++, dari: 'lapak', teks: j.data.jawaban },
    ]);
  }

  // `!memuat` penting: tanpanya contoh pertanyaan berkedip muncul sepersekian
  // detik lalu tergantikan percakapan lama — persis kedipan yang sama dengan
  // bug daftar pesanan yang hilang saat reload.
  const kosong = !memuat && baris.length === 0;

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <h1 className="mt-8 tracking-[-0.02em] text-judul font-bold text-tinta">Tanya lapakAi</h1>
      <p className="mt-1 text-utama leading-relaxed text-sedang">
        Tanya apa saja soal usaha Bapak/Ibu — untung, modal, harga, stok, sampai
        minta saran.
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
                          ? 'teks-gelembung whitespace-pre-wrap text-white [&>span]:bg-merek'
                          : 'teks-gelembung whitespace-pre-wrap border border-garis text-tinta [&>span]:bg-kartu'
                      }
                    >
                      {b.teks}
                    </MessageBubbleContent>
                  </MessageBubble>
                </MessageContent>
              </Message>
            ))}

            {sibuk && (
              <Message from="assistant">
                <MessageContent>
                  <ThinkingShimmer className="teks-gelembung">Sedang berpikir…</ThinkingShimmer>
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

          Sebabnya terukur: satu jawaban panjang saja sudah membuat halaman
          lebih tinggi dari viewport. Karena `NavBawah` `sticky bottom-0`, ia
          menutupi kolom ketik yang ada di bawahnya dalam urutan dokumen — jadi
          pengguna harus menggulir dulu sebelum bisa bertanya lagi. Di layar
          percakapan itu jelas salah.

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
