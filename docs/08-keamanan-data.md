# Keamanan Data

Dokumen ini menjawab pertanyaan juri soal keamanan, dan menetapkan aturan yang tidak boleh dilanggar saat implementasi.

## Autentikasi

**Nomor HP + OTP. Tidak ada email, tidak ada password.**

Alasannya ada di [01-produk.md](01-produk.md): pengguna kita sering lupa password dan banyak yang tidak punya email aktif. Password bukan cuma merepotkan bagi mereka — password adalah alasan mereka berhenti memakai aplikasi.

### Sesi

| Aspek | Ketentuan |
|---|---|
| Masa berlaku | 90 hari |
| Penyimpanan | `localStorage` di sisi browser |
| Perpanjangan | Otomatis setiap aplikasi dibuka |
| Logout otomatis | **Tidak pernah** |

Sesi pendek akan membunuh retensi. Kalau pedagang harus login ulang tiap minggu, mereka berhenti pakai — dan kita kehilangan pengguna bukan karena produknya buruk, tapi karena gerbangnya merepotkan.

### Mode demo untuk lomba

Kode OTP selalu `123456`, nomor apa pun diterima. Tidak ada SMS yang benar-benar dikirim.

Ini **disebutkan terus terang di presentasi**. Menyembunyikannya jauh lebih berisiko daripada mengakuinya — juri menilai alur, bukan infrastruktur SMS.

Yang tetap wajib: **layar loginnya benar-benar ada dan berfungsi.** Melompati layar login membuat produk terlihat seperti prototipe setengah jadi.

## Isolasi data

**Satu nomor HP = satu usaha.** Tidak ada multi-user, tidak ada multi-cabang. Menambahkannya untuk lomba hanya menambah permukaan yang bisa rusak tanpa menambah nilai demo.

### Isolasi di level query, bukan level tampilan

Ini yang penting, dan ini jawaban untuk juri.

**Benar** — penyaringan terjadi di database:
```sql
SELECT * FROM produk WHERE user_id = $1;
```

**Salah** — mengambil semua lalu menyaring di aplikasi:
```js
const semua = await db.query('SELECT * FROM produk');
return semua.filter(p => p.user_id === userId);   // JANGAN
```

Cara kedua berarti data pengguna lain pernah keluar dari database dan masuk ke memori proses. Satu kesalahan kecil di lapisan mana pun setelah itu — log, cache, respons galat — akan membocorkannya.

**Setiap query yang menyentuh tabel milik pengguna wajib punya `user_id` di klausa `WHERE`.** Tanpa pengecualian.

## Foto buku catatan

Buku catatan berisi data usaha yang sensitif: siapa membeli apa, berapa harganya, berapa untungnya. Ini bukan file biasa.

| Aspek | Ketentuan |
|---|---|
| Penyimpanan | Storage privat, **bukan** bucket publik |
| Akses | URL bertanda tangan (*signed URL*) dengan masa berlaku pendek |
| Retensi | **Dihapus setelah ekstraksi dikonfirmasi** |
| Yang disimpan | Hanya hasil terstrukturnya |

### Kebijakan retensi

> Foto mentah dihapus setelah ekstraksi dikonfirmasi. Yang kami simpan adalah hasil terstrukturnya.

Ini pertanyaan yang mungkin muncul di sesi tanya jawab, dan jawaban yang sudah siap membuat tim terlihat matang. Menyimpan foto selamanya adalah pilihan yang harus dibela; menghapusnya setelah tidak diperlukan tidak perlu dibela.

Implementasinya: saat `ekstraksi.status` berubah jadi `dikonfirmasi`, berkasnya dihapus dan `path_berkas` dikosongkan. Lihat [05-model-data.md](05-model-data.md).

## Membaca WhatsApp — dan batasnya

Pesanan Masuk bisa membaca pesan pembeli langsung dari WhatsApp pedagang, lewat sesi **hanya-baca**. Ini menimbulkan dua kewajiban yang tidak boleh dilewati.

### Kredensial sesi lebih sensitif daripada foto buku

Auth state memegang akses penuh ke WhatsApp pedagang. Disimpan di `backend/db/baileys-auth/`, **wajib ada di `.gitignore`**, dan tidak pernah keluar dari mesin yang menjalankan backend.

### Pembeli tidak pernah setuju datanya diproses

Menempel manual berarti pedagang **memilih** apa yang diproses. Membaca inbox otomatis berarti menelan **semuanya** — termasuk chat keluarga, teman, dan orang yang sama sekali bukan pembeli. Mereka tidak pernah menyetujui apa pun.

Karena itu penyaringannya ketat:

| Aturan | Alasan |
|---|---|
| Hanya pesan pribadi | Grup dan status broadcast diabaikan |
| Hanya teks | Media, dokumen, dan suara tidak disentuh |
| Bukan pesanan → **dibuang** | Teksnya tidak disimpan sama sekali, tidak masuk daftar |
| Nomor pengirim **empat digit terakhir saja** | Pedagang cukup butuh mengenali percakapan; kita tidak perlu menyimpan identitas orang lain |

Nomor lengkap memang tidak diperlukan, karena sistem tidak pernah membalas sendiri — pedagang membalas dari WhatsApp-nya, tempat percakapan itu sudah ada.

### Sistem tetap tidak pernah mengirim

Aturan #4 ditegakkan **struktur, bukan janji**: socket WhatsApp disimpan privat dan modulnya tidak mengekspor apa pun yang bisa mengirim. Yang tidak ada tidak bisa dipanggil.

## Transkripsi suara — di browser, tapi bukan di perangkat

Fitur 2 memakai Web Speech API. Transkripsi tidak melewati backend kita sama sekali; yang sampai ke server hanya teksnya.

**Tapi jangan mengklaim "diproses di perangkat".** Di Chrome, Web Speech mengirim audionya ke server Google untuk dikenali. Jadi yang benar:

> Suara pedagang tidak pernah menyentuh server kami — tapi memang melewati layanan pengenalan suara Google, sama seperti fitur dikte bawaan di HP-nya.

Yang bisa kita kendalikan sudah dikendalikan: audionya tidak disimpan di mana pun, dan yang masuk database hanya teks hasil transkripsi **setelah pengguna mengonfirmasi**.

Kalau ini dianggap tidak cukup, alternatifnya Groq Whisper (gratis 2.000 permintaan/hari, tanpa kartu kredit) atau Whisper yang dijalankan sendiri — keduanya menukar kemudahan dengan kendali penuh.

## Kredensial

**LLM tidak memakai kunci API sama sekali.** Ollama kampus tidak memintanya, jadi tidak ada kunci yang bisa bocor dan tidak ada yang perlu disiapkan rekan tim.

Yang tetap rahasia dan disimpan di `.env` (sudah ter-`.gitignore`):

| Isi | Kenapa rahasia |
|---|---|
| `JWT_SECRET` | Siapa pun yang tahu ini bisa membuat token atas nama pedagang mana pun |
| `DATABASE_URL` | Berisi kata sandi database saat memakai PostgreSQL sungguhan |

Aturannya tetap: **tidak pernah masuk ke kode, tidak pernah masuk ke frontend.**

Semua panggilan LLM tetap terjadi di **backend**. Meski tanpa kunci, memindahkannya ke frontend berarti memajang alamat server internal kampus ke browser — dan siapa pun bisa memakai kuotanya lewat aplikasi kita.

`.env.example` berisi nama variabelnya saja, supaya rekan tim tahu apa yang perlu diisi.

## Yang tidak dikerjakan untuk lomba, dan alasannya

Jujur soal batasan lebih baik daripada mengaku-aku. Kalau ditanya:

| Tidak ada | Kenapa |
|---|---|
| Gateway SMS asli | Butuh pendaftaran dan biaya; alurnya sudah lengkap dan tinggal disambung |
| Multi-user per usaha | Tidak menambah nilai demo, menambah permukaan yang bisa rusak |
| Enkripsi at-rest khusus | Mengandalkan enkripsi bawaan penyedia database |
| Audit log | Di luar cakupan 24 jam |

Yang penting: keputusan-keputusan ini **disengaja dan bisa dijelaskan**, bukan terlewat.
