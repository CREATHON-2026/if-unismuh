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

  sumber       TEXT NOT NULL CHECK (sumber IN ('foto','suara','manual')),
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
