import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MessageCircle, Receipt } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { BalasanReq, PesanMasukItem, StatusPesanan } from '@shared/types';
import {
  analisisPesanan, buatBalasan, buatPesanan, daftarPesanan, kirimBalasan, ubahBalasan,
} from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { Lencana } from '../components/Lencana';
import { NavBawah } from '../components/NavBawah';
import { SheetPesanan } from '../components/SheetPesanan';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { RangkaDaftar } from '../components/Rangka';
import { useStatusWa } from '../state/statusWa';
import { Tombol } from '../components/Tombol';

/**
 * Pesanan Masuk — kotak masuk, bukan alat analisis.
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
 * Pesan yang masuk SUDAH dibaca AI saat tiba — tidak ada tombol "periksa" di
 * sini, dan itu disengaja. Tombol itu dulu menjalankan ulang model tiap kali
 * ditekan: hasilnya bisa berbeda dari ketukan sebelumnya, dan tiap ketukan
 * menyisipkan satu baris baru ke daftar ini. Yang dibutuhkan pedagang bukan
 * pembacaan ulang, melainkan satu keputusan — dan keputusan itu diambil di
 * bottom sheet.
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

const NADA_STATUS: Record<StatusPesanan, 'netral' | 'untung' | 'tanda'> = {
  menunggu_bayar: 'tanda',
  diproses: 'tanda',
  selesai: 'untung',
  batal: 'netral',
};

const LABEL_STATUS: Record<StatusPesanan, string> = {
  menunggu_bayar: 'BELUM DIBAYAR',
  diproses: 'SIAP DISERAHKAN',
  selesai: 'SELESAI',
  batal: 'BATAL',
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
  const [catatan, setCatatan] = useState('');
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

  // Pesan dari sambungan WhatsApp masuk sendiri di latar, sudah terbaca AI.
  // Daftarnya dijemput berkala supaya pesan baru muncul tanpa refresh — tapi
  // penjemputan berhenti selagi sheet terbuka: daftar yang berubah di bawah
  // sheet membuat pedagang kembali ke posisi berbeda setelah menutupnya.
  useEffect(() => {
    void muatDaftar();
    if (terpilih) return;
    const jeda = window.setInterval(() => void muatDaftar(), 12_000);
    return () => window.clearInterval(jeda);
  }, [terpilih]);

  /** Tempel manual: satu kali baca AI, lalu langsung ke keputusan. */
  async function tempel() {
    if (!teks.trim()) return;
    setSibuk(true);
    setGalat('');
    setCatatan('');
    const j = await analisisPesanan(teks.trim());
    if (!j.ok) {
      setGalat(j.error.pesan);
      setSibuk(false);
      return;
    }
    const pesanId = j.data.pesan_id;
    if (j.data.jenis === 'bukan_pesanan' || pesanId == null) {
      setCatatan('Ini sepertinya bukan pesanan, jadi tidak kami simpan.');
      setSibuk(false);
      return;
    }
    const baru = await muatDaftar();
    setTeks('');
    setSibuk(false);
    setTerpilih(baru.find((p) => p.pesan_id === pesanId) ?? null);
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
    if (!balasUntuk?.produk_id) return;
    setSibuk(true);
    setGalat('');
    const j = await buatBalasan({
      maksud,
      produk_id: balasUntuk.produk_id,
      ...(balasUntuk.jumlah != null ? { jumlah: balasUntuk.jumlah } : {}),
      ...(balasUntuk.harga_diminta != null ? { harga_diminta: balasUntuk.harga_diminta } : {}),
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
        Pesan yang masuk sudah dibaca sendiri. Ketuk untuk memutuskan.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => nav('/pesanan/whatsapp')}
          className="kartu flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:scale-[0.99]"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-tinta"
            aria-hidden="true"
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
          onClick={() => nav('/pesanan/riwayat')}
          className="kartu flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:scale-[0.99]"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-tinta"
            aria-hidden="true"
          >
            <Receipt size={20} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1 text-isi leading-relaxed text-sedang">
            Riwayat pesanan — yang selesai, yang masih ditunggu, dan yang belum dibayar.
          </span>
          <ChevronRight size={20} className="shrink-0 text-redup" aria-hidden="true" />
        </button>
      </div>

      {/* Pesan tersimpan. Semua angkanya sudah dihitung SQL; di sini hanya
          ditampilkan. */}
      <div className="kartu mt-4 px-5 py-5">
        <p className="label-bagian">MASUK TERBARU</p>

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
        ) : (
          <div className="mt-1 flex flex-col divide-y divide-garis">
            {daftar.map((p) => (
              <button
                key={p.pesan_id}
                type="button"
                onClick={() => buka(p)}
                className="py-3.5 text-left transition active:scale-[0.99]"
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
                <p className="mt-0.5 truncate text-isi leading-relaxed text-redup">{p.teks}</p>
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
                  {/* Pesan yang sudah jadi pesanan memakai nomornya sebagai
                      penanda — itu yang diucapkan pedagang ke pembeli. */}
                  {p.pesanan_status ? (
                    <span className="flex items-center gap-1.5">
                      <span className="angka text-kecil font-bold text-tinta">
                        #{p.pesanan_nomor}
                      </span>
                      <Lencana nada={NADA_STATUS[p.pesanan_status]}>
                        {LABEL_STATUS[p.pesanan_status]}
                      </Lencana>
                    </span>
                  ) : (
                    p.perlu_dicek && <Lencana nada="tanda">PERLU DICEK</Lencana>
                  )}
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

      <div className="kartu mt-3 px-5 py-5">
        <p className="label-bagian">TEMPEL CHAT PEMBELI</p>
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder={CONTOH}
          rows={3}
          className="mt-3 w-full rounded-kontrol border-[1.5px] border-garis-tua bg-kartu p-4 text-utama leading-relaxed text-tinta outline-none transition placeholder:text-redup focus:border-merek"
        />
        <div className="mt-3">
          <Tombol varian="garis" disabled={!teks.trim() || sibuk} onClick={() => void tempel()}>
            {sibuk ? 'Membaca…' : 'Masukkan ke daftar'}
          </Tombol>
        </div>
        {catatan && <p className="mt-3 text-utama leading-relaxed text-sedang">{catatan}</p>}
      </div>

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
        }}
      />

      <NavBawah />
    </Layar>
  );
}
