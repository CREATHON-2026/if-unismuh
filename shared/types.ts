/**
 * Tipe kontrak API — dipakai frontend DAN backend.
 *
 * Sumber kebenarannya docs/06-kontrak-api.md. Kalau tipe di sini berubah,
 * perbarui dokumen itu di PR yang sama dan kabari tim.
 *
 * Aturan folder ini: hanya tipe dan konstanta, TIDAK ADA logika perhitungan.
 * Kalau ada fungsi yang menghitung margin di sini, itu berarti frontend punya
 * jalan untuk menghitung sendiri — melanggar aturan #7.
 */

// ---------------------------------------------------------------------------
// Bentuk jawaban baku
// ---------------------------------------------------------------------------

export type Jawaban<T> = { ok: true; data: T } | { ok: false; error: GalatApi };

export interface GalatApi {
  kode: KodeGalat;
  pesan: string;
}

export const KODE_GALAT = {
  TIDAK_TERAUTENTIKASI: 'TIDAK_TERAUTENTIKASI',
  OTP_SALAH: 'OTP_SALAH',
  PRODUK_TIDAK_DITEMUKAN: 'PRODUK_TIDAK_DITEMUKAN',
  EKSTRAKSI_GAGAL: 'EKSTRAKSI_GAGAL',
  BERKAS_TERLALU_BESAR: 'BERKAS_TERLALU_BESAR',
  RESEP_BELUM_LENGKAP: 'RESEP_BELUM_LENGKAP',
  PERMINTAAN_TIDAK_VALID: 'PERMINTAAN_TIDAK_VALID',
  /** Pesanan tidak ada, atau milik pedagang lain — dua-duanya dijawab 404 */
  PESANAN_TIDAK_DITEMUKAN: 'PESANAN_TIDAK_DITEMUKAN',
  /** Sudah dibayar/diselesaikan/dibatalkan sebelumnya — mencegah catat ganda */
  PESANAN_SUDAH_DIPROSES: 'PESANAN_SUDAH_DIPROSES',
  GALAT_SERVER: 'GALAT_SERVER',
} as const;

export type KodeGalat = (typeof KODE_GALAT)[keyof typeof KODE_GALAT];

// ---------------------------------------------------------------------------
// Autentikasi
// ---------------------------------------------------------------------------

export interface KirimOtpReq { nomor_hp: string; }
export interface KirimOtpRes { terkirim: boolean; mode_demo: boolean; }

export interface VerifikasiOtpReq { nomor_hp: string; kode: string; }
export interface VerifikasiOtpRes {
  token: string;
  /** true -> frontend masuk ke alur onboarding, bukan langsung Beranda */
  pengguna_baru: boolean;
  pengguna: Pengguna;
}

export interface Pengguna {
  id: number;
  nomor_hp: string;
  nama_usaha: string | null;
  jenis_usaha: JenisUsaha | null;
}

/**
 * GET /auth/saya — dipanggil tiap aplikasi dibuka, dengan token dari
 * localStorage. `token` yang dikembalikan adalah token BARU: sesinya
 * diperpanjang tiap kali aplikasi dibuka, supaya pedagang tidak pernah
 * kehabisan sesi.
 */
export interface SayaRes {
  pengguna: Pengguna;
  pengguna_baru: boolean;
  token: string;
}

export type JenisUsaha = 'makanan' | 'minuman' | 'sembako' | 'jasa' | 'lainnya';

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface SimpanUsahaReq { nama_usaha: string; jenis_usaha: JenisUsaha; }

export interface BahanMasukan {
  nama: string;
  satuan: string;
  /** Berapa banyak dipakai untuk satu batch */
  jumlah: number;
  /** Harga beli untuk jumlah_beli satuan, dalam rupiah */
  harga_beli: number;
  jumlah_beli: number;
}

export interface SimpanResepReq {
  nama_produk: string;
  bahan: BahanMasukan[];
  hasil_per_batch: number;
  harga_jual: number;
}

/**
 * ★ Inilah temuan pertama — momen yang membuat pengguna tidak menutup aplikasi.
 * Semua angka di sini dihitung SQL. Frontend hanya menampilkan.
 */
export interface TemuanPertama {
  produk_id: number;
  nama: string;
  modal_per_unit: number;
  harga_jual: number;
  margin_per_unit: number;
  merugi: boolean;
}

// ---------------------------------------------------------------------------
// Produk
// ---------------------------------------------------------------------------

export interface RingkasanProduk {
  id: number;
  nama: string;
  harga_jual: number;
  /** null kalau resepnya belum diisi — modal belum bisa dihitung */
  modal_per_unit: number | null;
  margin_per_unit: number | null;
  merugi: boolean | null;
  terlaris: boolean;
}

export interface RincianBahan {
  nama: string;
  satuan: string;
  jumlah_pakai: number;
  /** Kontribusi bahan ini ke modal satu unit produk */
  biaya_per_unit: number;
  /**
   * Bagian bahan ini dari modal satu unit, dalam persen bulat. Dihitung SQL.
   *
   * Pembaginya modal PENUH (bahan + tenaga), bukan total bahan saja — jadi
   * jumlah semua `persen_modal` ditambah `persen_tenaga` yang mendekati 100,
   * bukan `persen_modal` saja. `null` kalau modalnya belum diketahui; jangan
   * gambar bar kosong, karena itu terbaca sebagai "nol persen".
   */
  persen_modal: number | null;
}

/**
 * Fitur 8 — menjawab "terus saya harus jual berapa?"
 *
 * `null` kalau tidak ada yang perlu disarankan: resep belum diisi (modal tidak
 * diketahui), atau harganya sudah mencapai target. Sembunyikan bagiannya saat
 * null, jangan tampilkan angka karangan.
 */
export interface SaranHarga {
  /** Modal apa adanya. Di bawah angka ini pasti rugi — ini lantainya */
  harga_impas: number;
  /** Markup 20% atas modal, dibulatkan naik ke kelipatan Rp 500 */
  harga_disarankan: number;
  /** Selisih dari harga sekarang */
  kenaikan: number;
  /** Untung per unit kalau memakai harga yang disarankan */
  untung_per_unit: number;
  /** Kalimat siap tampil, dirangkai dari angka di atas */
  alasan: string;
}

export interface DetailProduk extends RingkasanProduk {
  hasil_per_batch: number | null;
  bahan: RincianBahan[];
  total_terjual: number;
  saran_harga: SaranHarga | null;
  /**
   * Ongkos tenaga per unit. Bagian dari modal yang BUKAN bahan — kalau tidak
   * ditampilkan, rincian bahan terlihat seolah sudah menjelaskan seluruh modal.
   * `null` kalau hasil per batch belum diisi.
   */
  biaya_tenaga_per_unit: number | null;
  /** Bagian tenaga dari modal satu unit, persen bulat. Dihitung SQL. */
  persen_tenaga: number | null;
}

// ---------------------------------------------------------------------------
// Tambah produk tanpa form (fitur 10)
// ---------------------------------------------------------------------------

export interface DariTeksProdukReq {
  /** Kalimat apa adanya, mis. hasil transkripsi suara di browser */
  teks: string;
}

export interface BahanUsulan {
  nama: string;
  satuan: string | null;
  /** Berapa banyak dipakai untuk SEKALI bikin */
  jumlah: number | null;
  harga_beli: number | null;
  jumlah_beli: number | null;
  /** true -> ada yang belum lengkap, tampilkan menonjol dan minta dilengkapi */
  perlu_dicek: boolean;
}

/**
 * ★ USULAN, BUKAN PRODUK TERSIMPAN.
 *
 * `POST /produk/dari-teks` tidak menyimpan apa pun — aturan #2. Setelah pengguna
 * melengkapi yang ditandai, frontend mengirim hasilnya ke `POST /produk` yang
 * bentuknya memang sengaja dibuat cocok.
 */
export interface UsulanProduk {
  nama_produk: string | null;
  hasil_per_batch: number | null;
  harga_jual: number | null;
  bahan: BahanUsulan[];

  /**
   * Produk yang sudah ada dan namanya mirip. Kalau terisi, TANYAKAN dulu apakah
   * ini produk yang sama — menyimpan diam-diam akan membuat duplikat, dan dua
   * produk dengan nama nyaris sama memecah riwayat penjualannya.
   */
  produk_mirip: KandidatProduk[];

  /** true kalau ada di `yang_kurang` — tombol simpan harus ditahan dulu */
  perlu_dicek: boolean;
  /** Pertanyaan yang HARUS dijawab sebelum bisa disimpan */
  yang_kurang: string[];
  /** Boleh dilewati, tapi akibatnya perlu disadari pengguna */
  catatan: string[];
}

/**
 * Simpan produk — jalan masuk kedua selain onboarding.
 *
 * `bahan` boleh kosong: pedagang yang buru-buru berhak mencatat produknya dulu
 * dan melengkapi resepnya nanti. Akibatnya `modal_per_unit` bernilai null dan
 * penjualannya masuk `baris_tanpa_modal` di Beranda — bukan dianggap untung
 * penuh. Yang tidak diketahui tampil sebagai tidak diketahui.
 */
export interface SimpanProdukReq {
  nama_produk: string;
  harga_jual: number;
  /** Wajib kalau `bahan` diisi — tanpa ini modal tidak bisa dihitung */
  hasil_per_batch?: number | null;
  bahan?: BahanMasukan[];
}

// ---------------------------------------------------------------------------
// Beranda
// ---------------------------------------------------------------------------

export interface Beranda {
  omzet: number;
  untung_bersih: number;
  /** false -> tampilkan ajakan mencatat, bukan angka nol */
  ada_transaksi: boolean;
  /**
   * Penjualan yang untungnya belum bisa dihitung karena modal produknya tidak
   * diketahui. Sudah masuk `omzet` (uang masuk selalu diketahui) tapi TIDAK
   * masuk `untung_bersih`. Kalau > 0, beri tahu penggunanya.
   */
  baris_tanpa_modal: number;
  /** Terisi meski belum ada transaksi — dihitung dari resep, bukan penjualan */
  jumlah_produk_merugi: number;
  produk_paling_merugi: { nama: string; margin_per_unit: number } | null;
}

// ---------------------------------------------------------------------------
// Rekap (fitur 14)
// ---------------------------------------------------------------------------

/** Satu titik di grafik tren (per hari). Kedua angka dijumlahkan SQL. */
export interface TitikTren {
  /** Label siap tampil, mis. "Sen", "Sel". Frontend tidak merangkai tanggal. */
  label: string;
  omzet: number;
  /** Mengikuti aturan Beranda: hanya penjualan yang modal produknya diketahui */
  untung_bersih: number;
}

/**
 * GET /rekap — fitur 14, grafik tren omzet vs untung minggu berjalan.
 *
 * Semua angka dihitung SQL. Frontend hanya menggambar garisnya — memetakan
 * nilai ke piksel adalah tampilan, bukan perhitungan finansial (aturan #7).
 */
export interface Rekap {
  /** 7 hari terakhir, urut dari paling lama ke hari ini */
  hari: TitikTren[];
  /** Total sepanjang periode grafik, dijumlahkan SQL — bukan oleh frontend */
  omzet: number;
  untung_bersih: number;
  /** false -> tampilkan ajakan mencatat, bukan grafik datar nol */
  ada_transaksi: boolean;
  /** Paling banyak terjual sepanjang periode. null kalau belum ada penjualan */
  produk_terlaris: { id: number; nama: string; jumlah_terjual: number } | null;
}

// ---------------------------------------------------------------------------
// Pesanan Masuk (fitur 9)
// ---------------------------------------------------------------------------

export type JenisPesan = 'pesanan' | 'tanya_harga' | 'menawar' | 'bukan_pesanan';

export interface AnalisisPesananReq {
  teks: string;
}

/** Kandidat produk saat nama dari chat tidak cocok meyakinkan. */
export interface KandidatProduk {
  id: number;
  nama: string;
  skor: number;
}

/**
 * ★ Semua angka finansial di sini dihitung SQL, bukan LLM.
 *
 * LLM hanya mengeluarkan `jenis`, `nama_produk_mentah`, `jumlah`,
 * `harga_diminta`, dan `tanggal_dibutuhkan` — yaitu apa yang TERTULIS di chat.
 * `nilai_pesanan`, `untung_pesanan`, `merugi`, dan `stok_cukup_untuk` datang
 * dari query. Lihat aturan #1 di CLAUDE.md.
 */
export interface AnalisisPesanan {
  /** null kalau pesannya bukan pesanan — teksnya sengaja tidak disimpan */
  pesan_id: number | null;
  jenis: JenisPesan;

  produk: { id: number; nama: string } | null;
  nama_produk_mentah: string | null;
  jumlah: number | null;
  harga_diminta: number | null;
  tanggal_dibutuhkan: string | null;

  /** Diisi kalau pencocokan nama produk tidak meyakinkan — tanya penggunanya */
  perlu_dicek: boolean;
  kandidat: KandidatProduk[];

  // --- dihitung SQL ---
  nilai_pesanan: number | null;
  untung_pesanan: number | null;
  merugi: boolean | null;
  /** null = stok bahannya belum dicatat, bukan berarti nol */
  stok_cukup_untuk: number | null;
  stok_kurang: boolean | null;

  /** Kalimat siap tampil, sudah berisi angka hasil hitungan SQL */
  peringatan: string[];
}

/**
 * Satu baris di daftar `GET /pesanan` — pesan tersimpan dari jalur tempel
 * maupun WhatsApp. Pesan `bukan_pesanan` tidak pernah ada di sini.
 *
 * Semua angka finansial dihitung SQL (aturan #1 dan #7); frontend hanya
 * menampilkan.
 */
export interface PesanMasukItem {
  pesan_id: number;
  jenis: Exclude<JenisPesan, 'bukan_pesanan'>;
  teks: string;
  sumber: 'tempel' | 'whatsapp';
  /** Empat digit terakhir pengirim, mis. "…7890"; null untuk jalur tempel */
  pengirim_samar: string | null;
  nama_produk_mentah: string | null;
  jumlah: number | null;
  harga_diminta: number | null;
  tanggal_dibutuhkan: string | null;
  perlu_dicek: boolean;
  /** ISO timestamp saat pesan diterima */
  diterima_pada: string;

  produk_id: number | null;
  nama_produk: string | null;

  // --- dihitung SQL ---
  modal_per_unit: number | null;
  nilai_pesanan: number | null;
  untung_pesanan: number | null;
  merugi: boolean | null;
  /** null = stok bahannya belum dicatat, bukan berarti nol */
  stok_cukup_untuk: number | null;

  /**
   * Pesanan HIDUP yang lahir dari chat ini — null kalau belum diproses, dan
   * null lagi kalau pesanannya dibatalkan. Ada supaya kotak masuk tidak
   * menawarkan pesan yang sama dua kali dan membuat pesanan kembar.
   */
  pesanan_id: number | null;
  pesanan_nomor: string | null;
  pesanan_status: StatusPesanan | null;
}

/** Balasan siap salin untuk pembeli — fitur 9, penutup alur Pesanan Masuk. */
export interface BalasanReq {
  maksud: 'tawar_harga' | 'terima' | 'tolak' | 'jawab_harga';
  produk_id: number;
  jumlah?: number;
  harga_diminta?: number;
}

export interface BalasanRes {
  /**
   * Kalimat yang DISALIN PEDAGANG SENDIRI. Sistem tidak pernah mengirimnya —
   * lihat aturan #4 di CLAUDE.md.
   */
  teks: string;
  /**
   * Angka yang dipakai LLM saat menyusun kalimat, semuanya dari SQL.
   * Disertakan supaya bisa dicocokkan: kalau angka di kalimat berbeda dari
   * yang di sini, berarti model mengarang dan itu kegagalan.
   */
  acuan: {
    nama: string;
    modal_per_unit: number | null;
    harga_jual: number;
    harga_diminta: number | null;
    jumlah: number | null;
    untung_pesanan: number | null;
    merugi: boolean | null;
  };
}

// ---------------------------------------------------------------------------
// Stok (fitur 12)
// ---------------------------------------------------------------------------

export interface BarisStok {
  bahan_id: number;
  jumlah: number;
}

export interface StokBahan {
  bahan_id: number;
  nama: string;
  satuan: string;
  /** null = belum pernah dicatat. BUKAN nol — jangan tampilkan sebagai "habis" */
  jumlah: number | null;
  diperbarui: string | null;
}

// ---------------------------------------------------------------------------
// Transaksi
// ---------------------------------------------------------------------------

export type SumberTransaksi = 'foto' | 'suara' | 'manual' | 'pesanan';

export interface BarisTransaksi {
  produk_id: number;
  jumlah: number;
  /** Kalau tidak diisi, dipakai harga_jual produk yang tersimpan */
  harga_satuan?: number;
}

/**
 * Banyak baris sekaligus — pedagang membuka buku di penghujung hari dan
 * mencatat beberapa penjualan dalam satu layar. Bentuknya sama dengan layar
 * konfirmasi foto, jadi komponen barisnya bisa dipakai untuk keduanya.
 *
 * Semua baris masuk dalam satu transaksi database: semua atau tidak sama
 * sekali.
 */
export interface CatatTransaksiReq {
  /** YYYY-MM-DD. Kalau tidak diisi, dipakai hari ini */
  tanggal?: string;
  baris: BarisTransaksi[];
}

export interface Transaksi {
  id: number;
  produk_id: number | null;
  nama_produk: string | null;
  jumlah: number;
  harga_satuan: number;
  tanggal: string;
  sumber: SumberTransaksi;
}

// ---------------------------------------------------------------------------
// Kalimat bebas → usulan transaksi (fitur 2, dan ketikan bebas)
// ---------------------------------------------------------------------------

export interface DariTeksReq {
  /** Kalimat apa adanya, mis. hasil transkripsi suara di browser */
  teks: string;
  /** YYYY-MM-DD. Kalau kosong, dipakai hari ini */
  tanggal?: string;
}

export interface BarisUsulan {
  /** Nama PERSIS seperti diucapkan/ditulis, sebelum dicocokkan */
  nama_mentah: string;
  /** null kalau belum cocok meyakinkan — pengguna yang memutuskan */
  produk_id: number | null;
  nama_produk: string | null;
  jumlah: number | null;
  harga_satuan: number | null;
  /** true -> tampilkan menonjol di layar konfirmasi, minta dipastikan */
  perlu_dicek: boolean;
  /** Terisi kalau penyaring backend menandai baris ini (jumlah tidak disebut,
   *  harga terlihat seperti total, kalimatnya pertanyaan, dsb). Tampilkan
   *  sebagai keterangan di samping penanda. */
  alasan_ragu?: string;
  kandidat: KandidatProduk[];
}

/**
 * ★ USULAN, BUKAN DATA TERSIMPAN.
 *
 * Endpoint `/transaksi/dari-teks` tidak menyimpan apa pun — aturan #2. Setelah
 * pengguna membetulkan baris yang ditandai, frontend mengirim hasilnya ke
 * `POST /transaksi` yang bentuknya memang sengaja dibuat cocok.
 */
export interface UsulanTransaksi {
  tanggal: string;
  baris: BarisUsulan[];
}

// ---------------------------------------------------------------------------
// Ekstraksi foto/suara (fitur 1, 2, 4) — lihat docs/06-kontrak-api.md.
// Ditambahkan dari sisi frontend untuk layar konfirmasi; kabari tim bila berubah.
// ---------------------------------------------------------------------------

export interface BarisEkstraksi {
  urutan: number;
  nama_mentah: string;
  produk_id: number | null;
  nama_produk: string | null;
  jumlah: number;
  harga_satuan: number | null;
  /** Dihitung SQL di backend, bukan frontend */
  subtotal: number;
  tanggal: string | null;
  /** 0..1, per baris — bukan per foto */
  keyakinan: number;
  perlu_dicek: boolean;
  alasan_ragu?: string;
}

export interface EkstraksiRes {
  ekstraksi_id: number;
  baris: BarisEkstraksi[];
  total_item: number;
  total_belanja: number;
}

/** Baris yang disetujui pengguna di layar konfirmasi. */
export interface BarisKonfirmasi {
  urutan: number;
  produk_id: number | null;
  jumlah: number;
  harga_satuan: number | null;
  tanggal: string | null;
}

export interface KonfirmasiRes {
  tersimpan: number;
  berkas_dihapus: boolean;
}

/**
 * POST /ekstraksi/pratinjau (usulan, lihat docs/06-kontrak-api.md) — SQL
 * menghitung ulang subtotal dan total saat pengguna menyunting baris.
 */
export interface PratinjauEkstraksiRes {
  baris: { urutan: number; subtotal: number }[];
  total_item: number;
  total_belanja: number;
}

// ---------------------------------------------------------------------------
// WhatsApp (fitur 9, jalur opsional)
// ---------------------------------------------------------------------------

export type StatusWa = 'terputus' | 'menunggu_qr' | 'menyambung' | 'tersambung';

/**
 * ★ `hanya_baca` SELALU true, dan itu bukan pengaturan — itu kenyataan
 * strukturnya. Modul WhatsApp di backend tidak mengekspor apa pun yang bisa
 * mengirim; socket-nya privat. Lihat aturan #4 di CLAUDE.md.
 *
 * Menautkan WhatsApp sifatnya OPSIONAL. Kalau tidak pernah ditautkan, atau
 * sesinya putus, Pesanan Masuk tetap berfungsi penuh lewat tempel manual.
 */
export interface StatusWhatsappRes {
  status: StatusWa;
  /** QR mentah; null kalau tidak sedang menunggu pemindaian */
  qr: string | null;
  /** Kode 8 digit yang dimasukkan pengguna di HP-nya; null kalau memakai QR */
  kode_pairing: string | null;
  hanya_baca: true;
  /** Alasan sambungan berhenti, kalau ada. Siap ditampilkan ke pengguna */
  alasan: string | null;
}

/**
 * Kosongkan `nomor_hp` untuk memakai QR; isi untuk mendapat KODE PAIRING.
 *
 * Kode pairing jauh lebih ramah untuk pengguna 35–60 tahun: tidak perlu
 * memindai apa pun, cukup mengetik 8 digit di HP sendiri.
 *
 * Kodenya tidak langsung ada — socket butuh beberapa detik. Panggil
 * GET /whatsapp/status sesaat kemudian untuk mengambilnya.
 */
export interface HubungkanWhatsappReq {
  nomor_hp?: string;
}

/**
 * PATCH /produk/:id/tenaga — fitur 11, hitung tenaga sendiri sebagai biaya.
 *
 * Dua angka yang benar-benar diketahui pedagang, bukan "biaya tenaga per batch"
 * yang tidak bisa dijawab siapa pun secara langsung. Perkaliannya terjadi di
 * SQL; frontend mengirim kedua angka ini apa adanya.
 *
 * `jam_per_batch: 0` sah dan berguna — itu cara membatalkan perhitungan waktu.
 *
 * Jawabannya berbentuk `TemuanPertama`, sama seperti POST /onboarding/resep:
 * modal, margin, dan penanda merugi yang SUDAH diperbarui. Layar tinggal
 * menampilkan, tidak menghitung ulang apa pun.
 */
export interface OngkosTenagaReq {
  /** Berapa jam sekali bikin satu batch */
  jam_per_batch: number;
  /** Kalau kerja di tempat orang, sejam dibayar berapa */
  upah_per_jam: number;
}

// ---------------------------------------------------------------------------
// Proses Pesanan — pesanan masuk sampai jadi untung
//
// Rantainya: pesan_masuk (apa kata pembeli) -> pesanan (apa yang disepakati
// pedagang) -> transaksi (buku besar). Tiga tabel, tiga peran, tidak boleh
// tercampur. Lihat docs/superpowers/specs/2026-09-02-pesanan-ke-untung-design.md
// ---------------------------------------------------------------------------

/**
 * Tahap PENYERAHAN BARANG, bukan keadaan uang.
 *
 * Sengaja tidak ada nilai 'dibayar': pesanan kasbon akan tampil "Dibayar"
 * padahal uangnya belum masuk. Fakta pembayaran hidup di `cara_bayar` dan
 * `dibayar_pada`, terpisah dari status.
 */
export type StatusPesanan = 'menunggu_bayar' | 'diproses' | 'selesai' | 'batal';

export type CaraBayar = 'tunai' | 'transfer' | 'qris' | 'nanti';

export interface BuatPesananReq {
  /** Boleh null: pembeli yang datang langsung tidak punya chat */
  pesan_id: number | null;
  /** Pilihan PEDAGANG, mengalahkan tebakan AI */
  produk_id: number;
  jumlah: number;
  /** Harga yang DISEPAKATI, bukan harga daftar */
  harga_satuan: number;
}

export interface Pesanan {
  id: number;
  /** "0902-07" — dirakit di SQL, diucapkan pedagang ke pembeli */
  nomor: string;
  pesan_id: number | null;
  produk_id: number;
  nama_produk: string | null;
  jumlah: number;
  harga_satuan: number;
  tanggal: string;

  status: StatusPesanan;
  cara_bayar: CaraBayar | null;
  /** null untuk kasbon: langkah bayar dilewati, uangnya belum masuk */
  dibayar_pada: string | null;
  /** Tautan bayar Midtrans — DISALIN pedagang, tidak pernah dikirim sistem */
  midtrans_url: string | null;
  midtrans_status: string | null;
  alasan_batal: string | null;
  /** Terisi hanya setelah selesai — inilah jejak ke buku besar */
  transaksi_id: number | null;
  dibuat_pada: string;
  selesai_pada: string | null;

  /** Kalimat asli pembeli, diambil lewat join — bukan disalin */
  teks_pesan: string | null;
  pengirim_samar: string | null;
  tanggal_dibutuhkan: string | null;

  // --- dihitung SQL (aturan #1 dan #7) ---
  nilai_pesanan: number;
  modal_per_unit: number | null;
  untung_pesanan: number | null;
  merugi: boolean | null;
  /** null = stok bahannya belum dicatat, BUKAN habis */
  stok_cukup_untuk: number | null;

  /** Kalimat siap tampil; kosong kalau tidak ada yang perlu diwaspadai */
  peringatan: string[];
}

/** Isi bottom sheet: yang ditebak AI, dan semua yang bisa dipilih pedagang. */
export interface PilihanPesanan {
  pesan_id: number;
  nama_produk_mentah: string | null;
  jumlah: number | null;
  harga_diminta: number | null;
  perlu_dicek: boolean;
  /** Diurutkan dari yang paling mirip; kosong kalau AI yakin */
  kandidat: KandidatProduk[];
  /** Semua produk pedagang — jalan keluar kalau tebakan AI meleset jauh */
  produk: RingkasanProduk[];
}

export interface BayarReq { cara: CaraBayar; }
export interface BatalReq { alasan: string; }

export interface RiwayatPesanan {
  daftar: Pesanan[];
  ringkasan: {
    total: number;
    menunggu_bayar: number;
    diproses: number;
    selesai: number;
    gagal: number;
    /** Sudah diserahkan tapi uangnya belum masuk — piutang */
    belum_dibayar: number;
    /** HANYA dari pesanan selesai. Yang batal tidak menyentuh buku besar */
    untung: number;
  };
}

/**
 * Struk 58 mm.
 *
 * SENGAJA tidak memuat modal maupun untung: struk ini dilihat pembeli, dan
 * margin adalah rahasia dagang pedagang. Disembunyikan di lapisan data, bukan
 * lewat CSS — yang disembunyikan CSS tetap terkirim lewat kabel.
 */
export interface Struk {
  nomor: string;
  transaksi_id: number | null;
  nama_usaha: string | null;
  nama_produk: string | null;
  jumlah: number;
  harga_satuan: number;
  total: number;
  cara_bayar: CaraBayar | null;
  lunas: boolean;
  tanggal: string;
  waktu: string;
}

// ---------------------------------------------------------------------------
// Tanya lapakAi — chatbot
//
// Rancangannya di docs/14-chatbot.md dan
// docs/superpowers/specs/2026-09-02-chatbot-tanya-design.md.
//
// Yang perlu diketahui saat membaca tipe di bawah: LLM ada di ujung depan
// (membaca maksud) dan template ada di ujung belakang (menyusun kalimat).
// SQL ada di tengah, dan HANYA SQL yang menghitung.
// ---------------------------------------------------------------------------

/**
 * Daftar maksud TERTUTUP. Bukan teks bebas.
 *
 * Model lokal mengarang nilai di luar daftar kalau diberi kesempatan, jadi
 * keluarannya divalidasi terhadap daftar ini dan yang tidak cocok jatuh ke
 * `tidak_paham`. Menambah maksud baru berarti menambah query SQL yang
 * menjawabnya — bukan sekadar menambah string di sini.
 */
export const MAKSUD = {
  UNTUNG_PERIODE: 'untung_periode',
  PRODUK_MERUGI: 'produk_merugi',
  MODAL_PRODUK: 'modal_produk',
  SARAN_HARGA: 'saran_harga',
  KAPASITAS_STOK: 'kapasitas_stok',
  PRODUK_TERLARIS: 'produk_terlaris',
  /** Tidak dijawab di sini — pengguna dialihkan ke layar Catat */
  CATAT_TRANSAKSI: 'catat_transaksi',
  /** Di luar cakupan. Dijawab jujur, dan `acuan` WAJIB null */
  TIDAK_PAHAM: 'tidak_paham',
} as const;

export type Maksud = (typeof MAKSUD)[keyof typeof MAKSUD];

export interface TanyaReq {
  pertanyaan: string;
}

/**
 * POST /tanya — satu pertanyaan, satu jawaban. Hanya-baca.
 *
 * Tidak ada `percakapan_id` dan tidak ada riwayat: tiap pertanyaan berdiri
 * sendiri. "Kalau yang itu bagaimana?" memaksa model menyimpulkan rujukan, dan
 * salah rujuk berarti menjawab soal produk yang salah dengan angka yang benar —
 * kelas kegagalan yang paling sulit dilihat.
 */
export interface TanyaRes {
  maksud: Maksud;

  /** Kalimat siap tampil. Disusun template dari angka di `acuan` */
  jawaban: string;

  /**
   * Angka mentah dari SQL, apa adanya.
   *
   * Ini yang membuat jawabannya bisa ditelusuri: kalau `jawaban` menyebut angka
   * yang tidak ada di sini, itu ketahuan — oleh uji otomatis maupun oleh siapa
   * pun yang membuka Network tab. Frontend menampilkannya sebagai kartu angka
   * di bawah gelembung jawaban, BUKAN menghitung apa pun darinya (aturan #7).
   *
   * WAJIB null untuk `tidak_paham`: secara struktur mustahil mengarang angka
   * untuk pertanyaan yang tidak dipahami.
   */
  acuan: Record<string, number | string> | null;

  /**
   * Hal yang membuat angkanya tidak utuh, misalnya "2 transaksi belum ikut
   * dihitung untungnya karena resepnya belum diisi".
   *
   * Angka yang tidak lengkap tanpa diberi tahu adalah angka yang salah.
   */
  peringatan: string[];

  /**
   * Diisi HANYA saat maksudnya `catat_transaksi`.
   *
   * Modul tanya tidak pernah menulis ke database. Mencatat dialihkan ke layar
   * Catat yang sudah punya konfirmasi manusia — menyalin layar itu berarti
   * menyediakan tempat kedua bagi aturan #2 untuk bocor.
   */
  alihkan_ke: { rute: '/catat'; teks: string } | null;
}
