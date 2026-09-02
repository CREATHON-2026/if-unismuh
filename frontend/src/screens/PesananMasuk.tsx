import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CircleCheck, Clipboard, MessageCircle, Receipt } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { BalasanReq, PesanMasukItem, StatusPesanan } from '@shared/types';
import {
  analisisPesanan, buatBalasan, buatPesanan, daftarPesanan, kirimBalasan, ubahBalasan,
} from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { KartuHero } from '../components/KartuHero';
import { Lencana } from '../components/Lencana';
import { NavBawah } from '../components/NavBawah';
import { SheetPesanan } from '../components/SheetPesanan';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { RangkaDaftar } from '../components/Rangka';
import { useStatusWa } from '../state/statusWa';
import { Tombol } from '../components/Tombol';

/**
 * Pesanan Masuk — fitur 9, puncak skrip demo.
 *
 * ★ BALASAN DISUSUN OTOMATIS, TAPI TIDAK PERNAH TERKIRIM SENDIRI (aturan #2).
 *
 * Layar ini dulu melarang tombol kirim sama sekali. Larangan itu dicabut dengan
 * sadar saat fitur balasan dibangun, dan aturan #4 di CLAUDE.md ditulis ulang
 * pada saat yang sama. Yang menggantikannya lebih sempit tapi tetap tegas:
 * draf boleh lahir sendiri, pengirimannya tidak. Satu tekanan jari pedagang
 * berdiri di antara kalimat yang disusun mesin dan chat pembeli.
 *
 * Kalimatnya juga BISA DISUNTING sebelum dikirim. Itu bukan kenyamanan
 * tambahan: melihat hasil AI tanpa bisa memperbaikinya hanya setengah janji.
 *
 * Reputasi pedagang ada di chat itu. Kalau `bisa_dikirim` false — remnya
 * ditarik, atau pesannya ditempel manual sehingga tidak punya chat — yang
 * ditawarkan tombol salin, dan alasannya ditulis apa adanya.
 *
 * Peringatan muncul SEBELUM tombol maksud, bukan sesudah — supaya pedagang tahu
 * pesanan ini merugikan sebelum ia memutuskan, bukan setelah.
 *
 * Semua angka (nilai pesanan, untung, kecukupan stok) dihitung SQL.
 */
const MAKSUD: { nilai: BalasanReq['maksud']; label: string }[] = [
  { nilai: 'tawar_harga', label: 'Tawar harga' },
  { nilai: 'terima', label: 'Terima' },
  { nilai: 'tolak', label: 'Tolak halus' },
  { nilai: 'jawab_harga', label: 'Jawab harga' },
];

const CONTOH =
  'bu saya mau pesan 20 bungkus kripik pisang buat hari sabtu, bisa 18rb ga bu?';

/* Badge jenis pesan. Mint di mockup jadi netral/kuning: hijau khusus untung,
   dan MENAWAR memang perlu dilihat manusia sebelum dijawab. */
const JENIS_HASIL: Record<Exclude<JenisPesan, 'bukan_pesanan'>, { label: string; nada: 'netral' | 'tanda' }> = {
  pesanan: { label: 'PESANAN BARU', nada: 'netral' },
  tanya_harga: { label: 'TANYA HARGA', nada: 'netral' },
  menawar: { label: 'MENAWAR', nada: 'tanda' },
};

/** Format tampilan waktu, mis. "2 Sep 03.05". Murni tampilan, bukan hitungan. */
function waktuSingkat(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function PesananMasuk() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  /**
   * `null` berarti BELUM DIMUAT — bukan kosong.
   *
   * Dulu ini dimulai sebagai `[]`, sehingga kedua keadaan itu tidak bisa
   * dibedakan dan layar langsung menulis "Belum ada pesanan masuk" pada render
   * pertama, sebelum permintaannya selesai. Pesan yang ada tampak lenyap sesaat
   * tiap kali halaman dimuat ulang. Pola `null` + rangka ini sudah dipakai
   * DaftarProduk; layar inilah yang menyimpang.
   */
  const [daftar, setDaftar] = useState<PesanMasukItem[] | null>(null);
  const [galatDaftar, setGalatDaftar] = useState('');

  /**
   * Hanya untuk memilih kalimat di kartu ajakan WhatsApp — layar ini tidak
   * memantau sambungan, jadi dijemput sekali saja (`berkala: false`).
   *
   * `hanya_baca === false` berarti rem WA_BALAS_AKTIF di server sudah dilepas.
   * Selama server belum terbaca, dianggap belum boleh mengirim: kalimat yang
   * lebih hati-hati adalah tebakan yang lebih aman kalau ternyata salah.
   */
  const { data: statusWa } = useStatusWa(false);
  const bolehKirim = statusWa?.hanya_baca === false;
  const [terpilih, setTerpilih] = useState<PesanMasukItem | null>(null);
  const [balasUntuk, setBalasUntuk] = useState<PesanMasukItem | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [tersalin, setTersalin] = useState(false);
  /** Isi kotak balasan yang sedang dilihat pedagang — boleh ia ubah. */
  const [draf, setDraf] = useState('');
  const [terkirim, setTerkirim] = useState(false);

  /**
   * Kegagalan TIDAK ditelan, tapi juga tidak menghapus yang sudah tampil.
   *
   * Dua hal berbeda, dan keduanya penting. Dulu `if (!j.ok) return []` membuat
   * gangguan jaringan tampil persis seperti "tidak ada pesanan" — pedagang
   * menyimpulkan pesanannya hilang. Tapi layar ini juga menjemput ulang tiap 12
   * detik, jadi kegagalan pada penjemputan LATAR tidak boleh mengosongkan
   * daftar yang sudah terlihat; kalau tidak, layar berkedip tiap jaringan
   * tersendak. Galatnya hanya ditampilkan kalau memang belum ada apa-apa.
   */
  async function muatDaftar(): Promise<PesanMasukItem[]> {
    const j = await daftarPesanan();
    if (!j.ok) {
      setGalatDaftar(j.error.pesan);
      // `daftar` sengaja TIDAK disentuh. Kalau masih null, ia tetap null dan
      // layar menampilkan galat bertombol ulang — bukan "belum ada pesanan".
      // Kalau sudah berisi, isinya bertahan.
      return [];
    }
    setGalatDaftar('');
    setDaftar(j.data);
    return j.data;
  }

  // Pesan dari sambungan WhatsApp masuk sendiri di latar. Daftarnya dijemput
  // berkala supaya pesan baru muncul tanpa pedagang me-refresh halaman.
  useEffect(() => {
    void muatDaftar();
    const jeda = window.setInterval(() => void muatDaftar(), 12_000);
    return () => window.clearInterval(jeda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function periksaTeks(t: string) {
    if (!t.trim()) return;
    setSibuk(true);
    setGalat('');
    setBalasan(null);
    const j = await analisisPesanan(t.trim());
    if (j.ok) {
      setHasil(j.data);
      void muatDaftar();   // hasil analisis ikut tersimpan — segarkan daftarnya
    } else setGalat(j.error.pesan);
    setSibuk(false);
  }

  /**
   * Pesan yang sudah punya pesanan hidup TIDAK membuka sheet lagi. Tanpa ini,
   * satu chat bisa melahirkan dua pesanan dan stoknya berkurang dua kali —
   * pedagang baru sadar setelah barangnya kurang.
   */
  function buka(p: PesanMasukItem) {
    if (p.pesanan_id != null) {
      nav(`/proses/${p.pesanan_id}`);
      return;
    }
    setBalasUntuk(null);
    setDraf('');
    setTerpilih(p);
  }

  /** Buka lagi pesan tersimpan lewat pipeline analisis yang sama persis. */
  function tinjau(p: PesanMasukItem) {
    setTeks(p.teks);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void periksaTeks(p.teks);
  }

  /** Pilihan pedagang dari sheet → pesanan dibuat → layar proses. */
  async function proses(arg: { produk_id: number; jumlah: number; harga_satuan: number }) {
    if (!terpilih) return;
    setSibuk(true);
    setGalat('');
    const j = await buatPesanan({ pesan_id: terpilih.pesan_id, ...arg });
    setSibuk(false);
    if (!j.ok) {
      setGalat(j.error.pesan);
      return;
    }
    setTerpilih(null);
    nav(`/proses/${j.data.id}`);
  }

  async function susunBalasan(maksud: BalasanReq['maksud']) {
    if (!hasil?.produk) return;
    setSibuk(true);
    setGalat('');
    const j = await buatBalasan({
      maksud,
      produk_id: hasil.produk.id,
      ...(hasil.jumlah != null ? { jumlah: hasil.jumlah } : {}),
      ...(hasil.harga_diminta != null ? { harga_diminta: hasil.harga_diminta } : {}),
    });
    if (j.ok) {
      // Nada diganti pedagang: kalimatnya disusun ulang, tapi TIDAK langsung
      // tersimpan. Yang tersimpan baru isi kotak, saat tombol kirim ditekan.
      setDraf(j.data.teks);
      setTerkirim(false);
      setTersalin(false);
    } else setGalat(j.error.pesan);
    setSibuk(false);
  }

  async function salin() {
    if (!draf.trim()) return;
    try {
      // Yang disalin adalah isi kotak, bukan kalimat asli dari model.
      // Kalau pedagang sudah memperbaikinya, perbaikan itu yang ia bawa.
      await navigator.clipboard.writeText(draf);
      setTersalin(true);
    } catch {
      setGalat('Belum bisa menyalin otomatis. Tekan lama teksnya lalu salin.');
    }
  }

  /**
   * Kirim ke pembeli — satu-satunya tempat di seluruh aplikasi yang melakukannya.
   *
   * Suntingan disimpan LEBIH DULU, selalu, bahkan kalau pedagang merasa tidak
   * mengubah apa pun. Yang terkirim harus persis yang terbaca di layar; menebak
   * "sepertinya tidak berubah" adalah cara termurah untuk mengirim kalimat yang
   * berbeda dari yang disetujui.
   */
  async function kirim() {
    if (!balasUntuk || !draf.trim()) return;
    setSibuk(true);
    setGalat('');

    const disimpan = await ubahBalasan(balasUntuk.pesan_id, draf.trim());
    if (!disimpan.ok) {
      setGalat(disimpan.error.pesan);
      setSibuk(false);
      return;
    }

    const j = await kirimBalasan(balasUntuk.pesan_id);
    setSibuk(false);
    if (!j.ok) {
      setGalat(j.error.pesan);
      return;
    }
    setTerkirim(true);
    void muatDaftar();
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-7 text-judul font-bold tracking-[-0.02em] text-tinta">Pesanan Masuk</h1>
      <p className="mt-1 text-utama leading-relaxed text-sedang">
        Tempel pesan dari pembeli, biar lapakAi bantu catat.
      </p>

      <div className="kartu mt-4 p-4">
        <p id="label-pesan-pembeli" className="text-utama font-bold text-tinta">
          Pesan pembeli
        </p>
        <div className="relative mt-3">
          <textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder={`Contoh: ${CONTOH}`}
            rows={4}
            aria-labelledby="label-pesan-pembeli"
            className="w-full rounded-kontrol border-[1.5px] border-garis bg-kanvas p-4 pb-12 text-utama leading-relaxed text-tinta outline-none transition placeholder:text-redup focus:border-hero"
          />
          <button
            type="button"
            aria-label="Tempel dari papan klip"
            onClick={() => void tempelDariPapanKlip()}
            className="absolute bottom-3 right-2.5 flex h-11 w-11 items-center justify-center rounded-xl text-aksen-tua transition hover:bg-aksen-muda active:scale-95"
          >
            <MessageCircle size={20} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1 text-isi leading-relaxed text-sedang">
            Sambungkan WhatsApp supaya pesanan terbaca sendiri.{' '}
            {/* Janji ini dulu dipaku di sini. Sejak fitur balas ada, kalimat
                itu hanya benar selama remnya mati — jadi ia mengikuti server,
                bukan ditulis mati. Layar yang menjanjikan hal yang tidak lagi
                berlaku lebih merusak daripada layar yang tidak menjanjikan. */}
            <span className="font-semibold text-tinta">
              {bolehKirim
                ? 'Balasan hanya terkirim kalau Anda menekan tombolnya.'
                : 'Hanya membaca, tidak pernah mengirim.'}
            </span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-redup" aria-hidden="true" />
        </button>

      <button
        type="button"
        onClick={() => nav('/pesanan/whatsapp')}
        className="kartu mt-3 flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:scale-[0.99]"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-tinta"
          aria-hidden="true"
        >
          <MessageCircle size={20} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 text-isi leading-relaxed text-sedang">
          Atau sambungkan WhatsApp supaya pesanan terbaca sendiri.{' '}
          <span className="font-semibold text-tinta">Hanya membaca, tidak pernah mengirim.</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-redup" aria-hidden="true" />
      </button>

      {galat && (
        <p className="mt-3 rounded-kartu bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
      )}

      {hasil && hasil.jenis === 'bukan_pesanan' && (
        <p className="kartu mt-4 p-5 text-utama leading-relaxed text-sedang">
          Ini sepertinya bukan pesanan, jadi tidak kami simpan.
        </p>
      )}

      {hasil && hasil.jenis !== 'bukan_pesanan' && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="kartu px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2.5 text-sub font-bold text-tinta">
                <CircleCheck size={22} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                Hasil analisis
              </p>
              <Lencana nada={JENIS_HASIL[hasil.jenis].nada}>
                {JENIS_HASIL[hasil.jenis].label}
              </Lencana>
            </div>

            {/* Satu pesan = satu produk di kontrak /pesanan/analisis — bukan
                daftar belanjaan seperti di rancangan. Tidak mengarang baris. */}
            <p className="label-bagian mt-4">DAFTAR BARANG</p>
            <div className="mt-2 rounded-kontrol bg-kanvas px-4 py-3.5">
              <p className="truncate text-utama font-bold text-tinta">
                {hasil.produk?.nama ?? hasil.nama_produk_mentah ?? 'Produk belum dikenali'}
              </p>
              {(hasil.jumlah != null || hasil.harga_diminta != null) && (
                <p className="angka mt-0.5 text-isi text-redup">
                  {hasil.jumlah != null ? `${hasil.jumlah} pcs` : ''}
                  {hasil.jumlah != null && hasil.harga_diminta != null ? ' · ' : ''}
                  {hasil.harga_diminta != null
                    ? `pembeli minta ${formatRupiah(hasil.harga_diminta)}`
                    : ''}
                </p>
              )}
            </div>

            {/* Aturan #8: kalau nama produknya tidak yakin, tanya — jangan
                diam-diam memilih yang paling mirip. */}
            {hasil.perlu_dicek && hasil.kandidat.length > 0 && (
              <div className="mt-3 rounded-kontrol bg-tanda p-4">
                <Lencana nada="tanda">PERLU DICEK</Lencana>
                <p className="mt-2 text-isi leading-relaxed text-tanda-tinta">
                  Maksudnya produk yang mana? {hasil.kandidat.map((k) => k.nama).join(', ')}
                </p>
              </div>
            )}

            {/* "Stok cukup" netral, bukan hijau: hijau khusus untung. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {hasil.stok_kurang === true ? (
                <Lencana nada="rugi">STOK KURANG</Lencana>
              ) : hasil.stok_kurang === false ? (
                <Lencana nada="netral">STOK CUKUP</Lencana>
              ) : (
                <Lencana nada="netral">STOK BELUM DICATAT</Lencana>
              )}
              {hasil.merugi != null && (
                <Lencana nada={hasil.merugi ? 'rugi' : 'untung'}>
                  {hasil.merugi ? 'STATUS: MERUGI' : 'STATUS: UNTUNG'}
                </Lencana>
              )}
            </div>

        {/* Tiga keadaan, bukan dua. "Belum dimuat" dulu tidak punya tampilan
            sendiri dan meminjam tampilan "kosong" — itu bug yang membuat pesan
            tampak lenyap tiap kali halaman dimuat ulang. */}
        {daftar === null && !galatDaftar ? (
          <div className="mt-3">
            <RangkaDaftar baris={3} />
          </div>
        ) : daftar === null ? (
          <KeadaanGalat
            pesan={galatDaftar}
            onCoba={() => void muatDaftar()}
            sedangMencoba={sibuk}
          />
        ) : daftar.length === 0 ? (
          <p className="mt-3 text-utama leading-relaxed text-redup">
            Belum ada pesanan masuk. Sambungkan WhatsApp, atau tempel chat pembeli di bawah.
          </p>
        </div>
      )}

      {/* Pesan tersimpan — dari WhatsApp (terbaca sendiri) dan tempel manual.
          Semua angkanya sudah dihitung SQL; di sini hanya ditampilkan. */}
      {daftar.length > 0 && (
        <div className="kartu mt-4 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="label-bagian">MASUK TERBARU</p>
            <button
              type="button"
              onClick={() => nav('/pesanan/riwayat')}
              className="flex items-center gap-1 text-isi font-semibold text-tinta transition active:scale-95"
            >
              <Receipt size={16} strokeWidth={1.9} aria-hidden="true" />
              Riwayat
              <ChevronRight size={16} className="text-redup" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1 flex flex-col divide-y divide-garis">
            {daftar.map((p) => (
              <button
                key={p.pesan_id}
                type="button"
                onClick={() => setTerpilih(p)}
                disabled={sibuk}
                className="py-3.5 text-left transition active:scale-[0.99] disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-utama font-bold text-tinta">
                    {p.nama_produk ?? p.nama_produk_mentah ?? 'Belum dikenali'}
                  </p>
                  {p.jumlah != null && (
                    <span className="angka shrink-0 text-isi font-semibold text-sedang">
                      {p.jumlah} pcs
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-isi leading-relaxed text-redup">
                  {p.teks}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-isi">
                  <span className="text-redup">
                    {p.sumber === 'whatsapp'
                      ? `WhatsApp ${p.pengirim_samar ?? ''}`.trim()
                      : 'Tempel'}
                    {' · '}
                    {waktuSingkat(p.diterima_pada)}
                  </span>
                  {p.untung_pesanan != null && (
                    <span
                      className={`angka font-semibold ${p.merugi ? 'text-rugi' : 'text-untung'}`}
                    >
                      {p.merugi ? '\u2212' : '+'} {formatRupiah(Math.abs(p.untung_pesanan))}
                    </span>
                  )}
                  {p.perlu_dicek && <Lencana nada="tanda">PERLU DICEK</Lencana>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {galat && (
        <p className="mt-3 rounded-kartu bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
      )}

      {balasUntuk && (
        <div className="kartu mt-3 px-5 py-5">
          <p className="label-bagian">SIAPKAN BALASAN</p>
          <p className="mt-2 truncate text-isi text-redup">“{balasUntuk.teks}”</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MAKSUD.map((m) => (
              <button
                key={m.nilai}
                type="button"
                disabled={sibuk || !balasUntuk.produk_id}
                onClick={() => void susunBalasan(m.nilai)}
                className="min-h-14 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-3 text-utama font-semibold text-tinta transition active:scale-95 disabled:opacity-40"
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Draf sudah ada sejak pesannya tiba. Kotak ini muncul lebih dulu
              daripada tombol nada di atas — pedagang membaca kalimatnya, bukan
              memilih dulu baru membaca. */}
          {draf ? (
            <>
              <textarea
                value={draf}
                onChange={(e) => { setDraf(e.target.value); setTerkirim(false); setTersalin(false); }}
                rows={4}
                disabled={terkirim || balasUntuk.balasan.status === 'terkirim'}
                className="mt-4 w-full resize-none rounded-kontrol bg-kanvas p-4 text-utama leading-relaxed text-tinta outline-none focus:ring-2 focus:ring-merek disabled:opacity-60"
              />

              {terkirim || balasUntuk.balasan.status === 'terkirim' ? (
                <p className="mt-3 rounded-kontrol bg-untung-muda p-4 text-center text-utama font-semibold text-untung-tua">
                  Terkirim ke pembeli ✓
                </p>
              ) : balasUntuk.balasan.bisa_dikirim ? (
                <>
                  <div className="mt-3">
                    <Tombol varian="utama" disabled={sibuk || !draf.trim()} onClick={() => void kirim()}>
                      {sibuk ? 'Mengirim…' : 'Kirim ke pembeli'}
                    </Tombol>
                  </div>
                  <button
                    type="button"
                    onClick={() => void salin()}
                    className="mt-2 min-h-11 w-full text-utama font-semibold text-merek"
                  >
                    {tersalin ? 'Tersalin ✓' : 'Atau salin saja'}
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-3">
                    <Tombol varian="utama" onClick={() => void salin()}>
                      {tersalin ? 'Tersalin ✓' : 'Salin balasan'}
                    </Tombol>
                  </div>
                  {/* Tombol yang mati tanpa alasan adalah jalan buntu.
                      Alasannya datang dari server, bukan ditebak di sini. */}
                  <p className="mt-3 text-center text-isi leading-relaxed text-redup">
                    {balasUntuk.balasan.alasan_tidak_bisa}
                  </p>
                </>
              )}
            </>
          ) : (
            /* Tidak ada draf berarti produknya belum pasti — aturan #8. Yang
               dibutuhkan pedagang bukan tombol, tapi tahu apa yang kurang. */
            <p className="mt-4 rounded-kontrol bg-tanda p-4 text-utama leading-relaxed text-tanda-tinta">
              Balasan belum bisa disiapkan karena barang yang dimaksud belum pasti.
              Pastikan dulu produknya, atau pilih nada balasan di atas.
            </p>
          )}
        </div>
      )}

      {/* Sheet keputusan — memilih produk/jumlah/harga sekali, bukan
          menjalankan ulang AI tiap ketuk. Untungnya dihitung SQL di layar
          proses setelah pesanan dibuat. */}
      <SheetPesanan
        pesan={terpilih}
        sibuk={sibuk}
        onTutup={() => setTerpilih(null)}
        onProses={(arg) => void proses(arg)}
        onBalas={() => {
          setBalasUntuk(terpilih);
          // Draf sudah disusun saat pesannya tiba — langsung ditampilkan,
          // bukan menunggu pedagang memilih nada dulu.
          setDraf(terpilih?.balasan.teks ?? '');
          setTerkirim(false);
          setTersalin(false);
          setTerpilih(null);
          if (p) tinjau(p);
        }}
      />

      <NavBawah />
    </Layar>
  );
}
