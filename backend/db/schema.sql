-- lapakAi — skema database
--
-- Di sinilah semua aritmetika hidup. Lihat docs/05-model-data.md.
--
-- Dua aturan yang mengikat seluruh berkas ini:
--   1. Uang disimpan sebagai INTEGER rupiah, bukan NUMERIC/FLOAT. Galat
--      pembulatan muncul sebagai selisih receh di layar, dan pedagang yang
--      menghitung uang tiap hari akan menyadarinya lalu berhenti percaya.
--   2. Setiap tabel milik pengguna punya user_id, dan setiap query wajib
--      menyertakannya di WHERE. Isolasi terjadi di database, bukan di aplikasi.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- pengguna
-- Tidak ada kolom email. Tidak ada kolom password. Identitas = nomor HP + OTP.
-- Lihat docs/08-keamanan-data.md.
-- ---------------------------------------------------------------------------
CREATE TABLE pengguna (
  id           BIGSERIAL PRIMARY KEY,
  nomor_hp     TEXT UNIQUE NOT NULL,
  nama_usaha   TEXT,
  jenis_usaha  TEXT CHECK (jenis_usaha IN ('makanan','minuman','sembako','jasa','lainnya')),
  dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- bahan — bahan baku beserta harga belinya
--
-- Menyimpan harga_beli DAN jumlah_beli (bukan langsung harga per satuan)
-- supaya bisa jujur menampilkan "minyak 5 kg Rp 60.000" seperti yang pedagang
-- ingat, sambil tetap bisa menghitung harga per kilo.
-- ---------------------------------------------------------------------------
CREATE TABLE bahan (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  nama        TEXT NOT NULL,
  satuan      TEXT NOT NULL,
  harga_beli  INTEGER NOT NULL CHECK (harga_beli >= 0),
  jumlah_beli NUMERIC NOT NULL CHECK (jumlah_beli > 0),
  diperbarui  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bahan_user ON bahan (user_id);

-- ---------------------------------------------------------------------------
-- produk
-- ---------------------------------------------------------------------------
CREATE TABLE produk (
  id                     BIGSERIAL PRIMARY KEY,
  user_id                BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  nama                   TEXT NOT NULL,
  harga_jual             INTEGER NOT NULL CHECK (harga_jual >= 0),
  hasil_per_batch        NUMERIC CHECK (hasil_per_batch > 0),
  -- Fitur 11: tenaga sendiri sebagai biaya. Pedagang hampir tidak pernah
  -- menghitung waktunya sendiri, jadi "untung" yang mereka rasakan sudah
  -- termasuk membayar diri sendiri nol rupiah.
  biaya_tenaga_per_batch INTEGER NOT NULL DEFAULT 0 CHECK (biaya_tenaga_per_batch >= 0),
  dibuat_pada            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_produk_user ON produk (user_id);
-- Untuk pencocokan nama produk: "kripik psg" -> "Kripik Pisang".
-- Lihat docs/04-pipeline-ai.md.
CREATE INDEX idx_produk_nama_trgm ON produk USING gin (nama gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- resep — menghubungkan produk dengan bahannya
-- Inilah yang membuat modal per produk bisa dihitung, dan inilah yang
-- melahirkan "temuan pertama" saat onboarding.
-- ---------------------------------------------------------------------------
CREATE TABLE resep (
  id           BIGSERIAL PRIMARY KEY,
  produk_id    BIGINT NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  bahan_id     BIGINT NOT NULL REFERENCES bahan(id)  ON DELETE CASCADE,
  jumlah_pakai NUMERIC NOT NULL CHECK (jumlah_pakai > 0),
  UNIQUE (produk_id, bahan_id)
);
CREATE INDEX idx_resep_produk ON resep (produk_id);

-- ---------------------------------------------------------------------------
-- ekstraksi — satu baris per foto atau voice note yang diproses
--
-- Hasil AI berhenti di sini dengan status 'menunggu'. Baru setelah manusia
-- mengonfirmasi, barisnya pindah ke transaksi. Tidak ada jalan pintas.
-- Aturan #2: tidak ada yang tersimpan diam-diam.
-- ---------------------------------------------------------------------------
CREATE TABLE ekstraksi (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  jenis             TEXT NOT NULL CHECK (jenis IN ('foto','suara')),
  status            TEXT NOT NULL DEFAULT 'menunggu'
                      CHECK (status IN ('menunggu','dikonfirmasi','dibatalkan')),
  -- Dikosongkan dan berkasnya dihapus setelah status = 'dikonfirmasi'.
  -- Buku catatan berisi data usaha yang sensitif.
  path_berkas       TEXT,
  hasil_mentah      JSONB,
  -- Angka total yang DITULIS pedagang di halaman. Dibaca, bukan dihitung.
  -- Dipakai SQL sebagai pemeriksa silang: kalau jumlah baris tidak cocok
  -- dengan angka ini, baris-barisnya ditandai untuk diperiksa manusia.
  total_tertulis    INTEGER,
  dibuat_pada       TIMESTAMPTZ NOT NULL DEFAULT now(),
  dikonfirmasi_pada TIMESTAMPTZ
);
CREATE INDEX idx_ekstraksi_user ON ekstraksi (user_id, status);

-- ---------------------------------------------------------------------------
-- transaksi
-- Setiap baris menyimpan asal-usulnya. Inilah yang membuat setiap angka di
-- layar bisa ditelusuri sampai ke sumbernya — jawaban untuk pertanyaan juri
-- soal halusinasi angka.
-- ---------------------------------------------------------------------------
CREATE TABLE transaksi (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  produk_id    BIGINT REFERENCES produk(id) ON DELETE SET NULL,
  jumlah       NUMERIC NOT NULL CHECK (jumlah > 0),
  harga_satuan INTEGER NOT NULL CHECK (harga_satuan >= 0),
  tanggal      DATE NOT NULL,

  sumber       TEXT NOT NULL CHECK (sumber IN ('foto','suara','manual','pesanan')),
  sumber_id    BIGINT REFERENCES ekstraksi(id) ON DELETE SET NULL,
  keyakinan    NUMERIC,   -- null kalau diketik manusia
  -- Apa yang tertulis di buku sebelum dicocokkan ke produk. Disimpan supaya
  -- kalau pencocokan ternyata salah, masih bisa ditelusuri.
  nama_mentah  TEXT,

  dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transaksi_user_tgl ON transaksi (user_id, tanggal);
CREATE INDEX idx_transaksi_produk   ON transaksi (produk_id);

-- ---------------------------------------------------------------------------
-- stok — fitur 12, dipakai untuk cek kecukupan bahan di Pesanan Masuk
-- ---------------------------------------------------------------------------
CREATE TABLE stok (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  bahan_id   BIGINT NOT NULL REFERENCES bahan(id) ON DELETE CASCADE,
  jumlah     NUMERIC NOT NULL DEFAULT 0 CHECK (jumlah >= 0),
  diperbarui TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, bahan_id)
);

-- ---------------------------------------------------------------------------
-- v_modal_produk — modal per unit tiap produk
--
-- Semua rumus finansial bertumpu pada view ini. Ditulis sekali di sini supaya
-- tidak ada dua tempat yang menghitung modal dengan cara berbeda.
--
-- LEFT JOIN, bukan JOIN: produk yang resepnya belum diisi tetap muncul dengan
-- modal NULL, bukan menghilang diam-diam dari daftar.
-- ---------------------------------------------------------------------------
CREATE VIEW v_modal_produk AS
SELECT
  p.id                AS produk_id,
  p.user_id,
  p.nama,
  p.harga_jual,
  p.hasil_per_batch,
  CASE WHEN p.hasil_per_batch IS NULL OR COUNT(r.id) = 0 THEN NULL
       ELSE ROUND(
              (COALESCE(SUM(b.harga_beli::numeric / b.jumlah_beli * r.jumlah_pakai), 0)
               + p.biaya_tenaga_per_batch)
              / p.hasil_per_batch
            )::int
  END                 AS modal_per_unit
FROM produk p
LEFT JOIN resep r ON r.produk_id = p.id
LEFT JOIN bahan b ON b.id = r.bahan_id
GROUP BY p.id, p.user_id, p.nama, p.harga_jual, p.hasil_per_batch, p.biaya_tenaga_per_batch;

-- ---------------------------------------------------------------------------
-- v_margin_produk — modal, margin, dan penanda merugi
-- Ini yang menjawab fitur 6: produk merugi diurutkan dari margin terendah.
-- ---------------------------------------------------------------------------
CREATE VIEW v_margin_produk AS
SELECT
  m.*,
  m.harga_jual - m.modal_per_unit AS margin_per_unit,
  CASE WHEN m.modal_per_unit IS NULL THEN NULL
       ELSE (m.harga_jual - m.modal_per_unit) < 0
  END                             AS merugi
FROM v_modal_produk m;

-- ---------------------------------------------------------------------------
-- v_kapasitas_produk — bahan yang ada cukup untuk berapa unit produk?
-- Menjawab peringatan "bahan cuma cukup 14" di layar Pesanan Masuk (fitur 9).
--
-- LEFT JOIN ke stok, dan maks_unit NULL kalau ADA bahan yang stoknya belum
-- dicatat. Ini disengaja: mengatakan "cukup 0" untuk pedagang yang belum
-- mengisi stok adalah berbohong. Yang tidak diketahui harus tampil sebagai
-- tidak diketahui, bukan sebagai nol.
-- ---------------------------------------------------------------------------
CREATE VIEW v_kapasitas_produk AS
SELECT
  p.id      AS produk_id,
  p.user_id,
  CASE WHEN COUNT(r.id) = 0 THEN NULL
       WHEN COUNT(*) FILTER (WHERE s.jumlah IS NULL) > 0 THEN NULL
       ELSE FLOOR(MIN(s.jumlah / NULLIF(r.jumlah_pakai / p.hasil_per_batch, 0)))::int
  END       AS maks_unit
FROM produk p
LEFT JOIN resep r ON r.produk_id = p.id
LEFT JOIN stok  s ON s.bahan_id = r.bahan_id AND s.user_id = p.user_id
GROUP BY p.id, p.user_id;

-- ---------------------------------------------------------------------------
-- pesan_masuk — pesan pembeli yang ditempel pedagang, atau dibaca dari WhatsApp
--
-- Catatan privasi: pembeli tidak pernah setuju datanya diproses aplikasi ini.
-- Karena itu nomor pengirim disimpan TERSAMAR, bukan lengkap — kita cuma perlu
-- membedakan percakapan, tidak perlu identitas orangnya. Dan pesan yang
-- ternyata bukan pesanan dibuang, teksnya tidak disimpan.
-- Lihat docs/08-keamanan-data.md.
-- ---------------------------------------------------------------------------
CREATE TABLE pesan_masuk (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  teks               TEXT NOT NULL,
  sumber             TEXT NOT NULL CHECK (sumber IN ('tempel','whatsapp')),
  pengirim_samar     TEXT,

  -- hasil klasifikasi AI; keputusan untung-rugi TIDAK ada di sini, itu SQL
  jenis              TEXT CHECK (jenis IN ('pesanan','tanya_harga','menawar','bukan_pesanan')),
  nama_produk_mentah TEXT,
  produk_id          BIGINT REFERENCES produk(id) ON DELETE SET NULL,
  jumlah             NUMERIC,
  harga_diminta      INTEGER,
  tanggal_dibutuhkan DATE,
  keyakinan_cocok    NUMERIC,   -- skor pg_trgm saat mencocokkan nama produk
  perlu_dicek        BOOLEAN NOT NULL DEFAULT false,

  hasil_mentah       JSONB,
  diterima_pada      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pesan_masuk_user ON pesan_masuk (user_id, diterima_pada DESC);

-- ---------------------------------------------------------------------------
-- pesanan — apa yang PEDAGANG SETUJUI, bukan apa yang pembeli tulis
--
-- Tabel ketiga di rantai pesan_masuk -> pesanan -> transaksi, dan ketiganya
-- sengaja tidak digabung:
--
--   pesan_masuk  apa kata pembeli + apa yang dibaca AI   tidak pernah diubah
--   pesanan      apa yang disepakati pedagang            boleh diubah pedagang
--   transaksi    buku besar                              tidak pernah diubah
--
-- Menambahkan kolom status ke pesan_masuk akan mencampur "apa kata pembeli"
-- dengan "apa yang disepakati". Percampuran seperti itulah yang dulu melahirkan
-- bug pembalik untung: koreksi pedagang menimpa bacaan AI, lalu tidak ada lagi
-- yang bisa ditelusuri saat angkanya janggal.
--
-- CATATAN NAMA STATUS: status di sini menyatakan TAHAP PENYERAHAN BARANG, bukan
-- keadaan uang. Pesanan kasbon memakai cara_bayar='nanti' dengan dibayar_pada
-- NULL — statusnya tetap 'diproses'. Menamainya 'dibayar' akan membuat layar
-- menuliskan "Dibayar" untuk pesanan yang uangnya belum diterima, dan berbohong
-- di layar adalah pelanggaran aturan #2 sama seriusnya dengan menyimpan diam-diam.
-- ---------------------------------------------------------------------------
CREATE TABLE pesanan (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  -- Boleh NULL: pesanan bisa lahir dari pembeli yang datang langsung, tanpa chat.
  pesan_id      BIGINT REFERENCES pesan_masuk(id) ON DELETE SET NULL,
  -- RESTRICT, bukan SET NULL: menghapus produk yang punya pesanan berjalan akan
  -- membuat modalnya hilang dan untungnya mendadak tak terhitung.
  produk_id     BIGINT NOT NULL REFERENCES produk(id) ON DELETE RESTRICT,

  jumlah        NUMERIC NOT NULL CHECK (jumlah > 0),
  -- Harga yang DISEPAKATI, bukan harga daftar. Kalau pembeli menawar 18.000 dan
  -- pedagang setuju, 18.000 yang tercatat — meski produknya berharga 20.000.
  harga_satuan  INTEGER NOT NULL CHECK (harga_satuan >= 0),

  tanggal       DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Nomor yang diucapkan pedagang ke pembeli. Reset tiap hari, per pedagang:
  -- urutan global akan membocorkan volume usaha antar pengguna.
  urutan_harian INTEGER NOT NULL CHECK (urutan_harian > 0),

  status        TEXT NOT NULL DEFAULT 'menunggu_bayar'
                  CHECK (status IN ('menunggu_bayar','diproses','selesai','batal')),

  -- --- fakta pembayaran, terpisah dari status ---
  cara_bayar        TEXT CHECK (cara_bayar IN ('tunai','transfer','qris','nanti')),
  -- NULL untuk kasbon: langkah bayar sudah dilewati, uangnya belum masuk.
  dibayar_pada      TIMESTAMPTZ,
  midtrans_order_id TEXT UNIQUE,
  midtrans_status   TEXT,
  midtrans_url      TEXT,

  alasan_batal  TEXT,
  -- Diisi hanya saat status jadi 'selesai'. Inilah jembatan ke buku besar.
  transaksi_id  BIGINT REFERENCES transaksi(id) ON DELETE SET NULL,

  dibuat_pada   TIMESTAMPTZ NOT NULL DEFAULT now(),
  selesai_pada  TIMESTAMPTZ,

  -- Penjaga terakhir kalau dua permintaan datang bersamaan: nomor kembar
  -- ditolak database, bukan diharapkan tidak terjadi.
  UNIQUE (user_id, tanggal, urutan_harian)
);
CREATE INDEX idx_pesanan_user     ON pesanan (user_id, dibuat_pada DESC);
CREATE INDEX idx_pesanan_status   ON pesanan (user_id, status);
CREATE INDEX idx_pesanan_transaksi ON pesanan (transaksi_id);

-- ---------------------------------------------------------------------------
-- v_pesanan — SEMUA uang pesanan lahir di sini
--
-- Tidak ada satu pun angka di bawah yang boleh dihitung ulang di TypeScript
-- atau di React (aturan #1 dan #7). Kalau layar butuh angka baru, tambahkan
-- kolomnya di sini.
--
-- untung_pesanan memakai harga_satuan YANG DISEPAKATI, bukan harga_jual produk.
-- Di situlah letak seluruh gunanya: pesanan 20 kripik yang ditawar jadi 18.000
-- muncul sebagai MINUS Rp 64.000, dan pedagang melihatnya sebelum menyetujui.
-- ---------------------------------------------------------------------------
CREATE VIEW v_pesanan AS
SELECT
  ps.id,
  ps.user_id,
  ps.pesan_id,
  ps.produk_id,
  m.nama              AS nama_produk,
  ps.jumlah,
  ps.harga_satuan,
  ps.tanggal,
  ps.urutan_harian,
  -- "0902-07". Dirakit di SQL supaya tidak ada dua tempat yang merakitnya beda.
  to_char(ps.tanggal, 'MMDD') || '-' || lpad(ps.urutan_harian::text, 2, '0') AS nomor,
  ps.status,
  ps.cara_bayar,
  ps.dibayar_pada,
  ps.midtrans_order_id,
  ps.midtrans_status,
  ps.midtrans_url,
  ps.alasan_batal,
  ps.transaksi_id,
  ps.dibuat_pada,
  ps.selesai_pada,

  -- Konteks dari pesan aslinya, diambil lewat join alih-alih disalin: satu
  -- kebenaran, dan kalimat pembeli tetap utuh di tempatnya.
  pm.teks               AS teks_pesan,
  pm.pengirim_samar,
  pm.tanggal_dibutuhkan,

  -- --- dihitung SQL ---
  ROUND(ps.jumlah * ps.harga_satuan)::int AS nilai_pesanan,
  m.modal_per_unit,
  CASE WHEN m.modal_per_unit IS NULL THEN NULL
       ELSE ROUND(ps.jumlah * (ps.harga_satuan - m.modal_per_unit))::int
  END                   AS untung_pesanan,
  CASE WHEN m.modal_per_unit IS NULL THEN NULL
       ELSE (ps.harga_satuan - m.modal_per_unit) < 0
  END                   AS merugi,
  -- NULL = stok bahannya belum dicatat, BUKAN berarti habis.
  k.maks_unit           AS stok_cukup_untuk
FROM pesanan ps
LEFT JOIN v_margin_produk    m  ON m.produk_id  = ps.produk_id
LEFT JOIN v_kapasitas_produk k  ON k.produk_id  = ps.produk_id
LEFT JOIN pesan_masuk        pm ON pm.id        = ps.pesan_id;

-- ---------------------------------------------------------------------------
-- v_saran_harga — fitur 8, menjawab "terus saya harus jual berapa?"
--
-- MARKUP ATAS MODAL, bukan margin atas harga jual. Pedagang berpikir "modal
-- segini, ambil untung sekian" — bukan "berapa persen dari omzet". Markup 20%
-- atas modal 21.200 = 25.440.
--
-- Dibulatkan NAIK ke kelipatan 500, karena pedagang memberi harga dengan angka
-- bulat. Naik, bukan ke terdekat: membulatkan turun berarti menyarankan untung
-- di bawah target yang baru saja kita janjikan.
--
-- Dua angka, bukan satu. harga_impas adalah LANTAINYA — pedagang yang belum
-- berani menaikkan harga sebanyak itu setidaknya tahu batas tidak-rugi.
-- Menyodorkan satu angka yang melompat jauh berisiko diabaikan sama sekali.
-- ---------------------------------------------------------------------------
CREATE VIEW v_saran_harga AS
SELECT
  m.produk_id,
  m.user_id,
  m.modal_per_unit                              AS harga_impas,
  (CEIL(m.modal_per_unit * 1.20 / 500) * 500)::int AS harga_disarankan,
  ((CEIL(m.modal_per_unit * 1.20 / 500) * 500) - m.harga_jual)::int    AS kenaikan,
  ((CEIL(m.modal_per_unit * 1.20 / 500) * 500) - m.modal_per_unit)::int AS untung_per_unit
FROM v_margin_produk m
WHERE m.modal_per_unit IS NOT NULL
  -- Tidak ada yang perlu disarankan kalau harganya sudah mencapai target.
  AND m.harga_jual < CEIL(m.modal_per_unit * 1.20 / 500) * 500;
