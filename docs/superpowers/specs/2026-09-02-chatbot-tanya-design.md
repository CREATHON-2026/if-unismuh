# Tanya lapakAi — chatbot di atas data pedagang sendiri

Status: disetujui · 2 September 2026

Kotak tanya yang menjawab "bulan ini untungnya berapa?" dan "produk mana yang
merugi?" dari data pedagang sendiri. Rupanya memakai komponen agen
[beUI](https://beui.dev); seluruh angkanya tetap lahir di SQL.

Rancangan arsitekturnya ada di [docs/14-chatbot.md](../../14-chatbot.md). Spec ini
mencatat keputusan implementasi dan apa yang ditemukan saat menelusuri kode
sebelum menulis baris pertama.

## Masalah

Chatbot adalah fitur paling berbahaya di produk ini. Ia satu-satunya tempat LLM
berbicara soal uang dalam kalimat utuh, dan kalimat yang salah tidak terlihat
seperti galat — ia terlihat seperti jawaban.

Pertanyaan pertama juri hampir pasti: *"angka ini datang dari mana?"* Jawaban
"dari AI" mengakhiri percakapan itu dengan buruk.

Sekaligus, ia dibutuhkan. Beranda sudah menampilkan untung, `v_margin_produk`
sudah tahu produk mana yang merugi, `v_saran_harga` sudah tahu harga yang layak.
Semua angka itu ada dan benar — tapi hanya ditemukan pedagang yang tahu harus
mengetuk di mana. Chatbot adalah pintu yang tidak menuntut orang menghafal
tata letak.

## Rancangan

### LLM di dua ujung, SQL di tengah

| Langkah | Siapa | Boleh menyentuh angka? |
|---|---|---|
| 1. Baca maksud | `mintaJson()` + skema enum tertutup | **Tidak.** Keluarannya hanya maksud + nama produk + rentang tanggal |
| 2. Hitung | SQL, view yang sudah ada | Ya. Ini satu-satunya tempat |
| 3. Susun kalimat | Template TypeScript | Tidak. Hanya menyulih angka yang sudah jadi |

Model tidak pernah melihat dua angka sekaligus, jadi tidak ada yang bisa
dijumlahkannya. Yang bisa salah adalah maksudnya — dan maksud yang salah
menghasilkan jawaban yang jelas-jelas tidak nyambung, bukan angka yang salah
tapi meyakinkan.

**Penyusun kalimat memakai template, bukan `mintaTeks()`.** Nol risiko mengarang,
dan hemat 3–13 detik per pertanyaan. `mintaTeks()` tetap tersedia kalau nanti
kalimatnya terasa kaku, tapi bukan untuk demo.

### Setiap jawaban membawa acuannya

```json
{ "maksud": "untung_periode",
  "jawaban": "Bulan ini uang masuk Rp 3.600.000, untung bersihnya Rp 420.000.",
  "acuan": { "omzet": 3600000, "untung_bersih": 420000, "baris_tanpa_modal": 2 } }
```

`acuan` adalah angka mentah dari SQL, apa adanya. Kalau kalimatnya menyebut angka
yang tidak ada di `acuan`, itu ketahuan — oleh uji otomatis, oleh siapa pun yang
membaca respons, dan oleh juri yang membuka Network tab.

Di layar pun `acuan` tidak dikubur dalam prosa. Ia tampil sebagai kartu angka di
bawah gelembung jawaban.

**Untuk `maksud: "tidak_paham"`, `acuan` wajib `null`.** Secara struktur mustahil
mengarang angka untuk pertanyaan yang tidak dipahami.

### Delapan maksud, nol view SQL baru

| `maksud` | Sumber angka |
|---|---|
| `untung_periode` | `ringkasanPenjualan()` di `beranda.queries.ts` |
| `produk_merugi` | `v_margin_produk` |
| `modal_produk` | `v_modal_produk` |
| `saran_harga` | `v_saran_harga` |
| `kapasitas_stok` | `v_kapasitas_produk` |
| `produk_terlaris` | `produk.queries.ts` |
| `catat_transaksi` | — dialihkan, lihat di bawah |
| `tidak_paham` | — dijawab jujur |

Daftarnya **tertutup**. Enum, bukan teks bebas. Model yang mengarang nilai di luar
daftar ditolak validasi dan jatuh ke `tidak_paham` — perilaku yang sudah ada di
`lib/llm.ts` karena model lokal memang melakukannya.

Nol tabel baru, nol view baru, nol perubahan skema.

### Modul `tanya` hanya-baca — dan pengguna tetap bisa mencatat

`CatatSuara.tsx` sudah punya alur tulis yang benar dan sudah terbukti:

```
usulanDariTeks(kalimat) → POST /transaksi/dari-teks → UsulanTransaksi
                          (tidak menyimpan apa pun — aturan #2)
      ↓ pedagang memeriksa, membetulkan, lalu menekan simpan
catatTransaksi(...)     → POST /transaksi
```

Kalau `tanya` ikut menulis, ia harus menyalin layar konfirmasi itu. Salinan
kedua dari layar yang menjaga aturan #2 adalah tempat kedua aturan #2 bisa
bocor.

**Maka `tanya` tidak menulis apa pun.** Saat maksudnya `catat_transaksi`,
backend mengembalikan maksud itu beserta kalimat aslinya, dan frontend
mengalihkan ke `/catat` dengan kalimat sudah terisi. Pedagang mendapat
kemampuan mencatat lewat chatbot, dengan **nol endpoint tulis baru**.

### Pintu masuk: tukar, bukan tambah

`KartuAksi` dikunci `aksi.slice(0, 4)`, dengan alasan yang diukur, bukan selera:
*"Lima membuat lebar tiap kolom di bawah 70px, dan labelnya mulai terpotong di
layar 360px."* Aksi kelima hilang tanpa suara.

NavBawah juga sudah penuh di lima slot, dan spec redesain sudah menolak chatbot
di slot tengahnya.

Isi kartu aksi sekarang **Catat · Produk · Pesanan · Riwayat**; NavBawah berisi
**Beranda · Produk · Catat · Pesanan · Riwayat**. Kartu itu tidak menawarkan satu
pun tujuan yang belum ada di nav, satu ibu jari di bawahnya.

**Riwayat ditukar dengan Tanya.** Nol perubahan komponen, nol risiko tata letak,
Riwayat tetap dijangkau lewat NavBawah, dan kartu aksi akhirnya berhenti
menduplikasi nav.

### Rupa: beUI

`@beui/message` dan komponen loading state dipakai untuk perilaku
percakapannya — animasi masuk pesan, pengelompokan gelembung, penggulung yang
menempel di tepi bawah selama isi bertambah, dan shimmer "sedang berpikir".
Ditulis sendiri, semua itu memakan waktu yang tidak kita punya, dan biasanya
melewatkan `prefers-reduced-motion`.

Tiga hal ditemukan saat menyiapkannya.

**1. Shimmer-nya akan tidak terlihat.** `lib/text-shimmer.ts` bawaan beUI berisi:

```
bg-clip-text text-transparent
bg-[linear-gradient(110deg, var(--muted-foreground) 30%, var(--foreground) 50%, ...)]
```

`--muted-foreground` dan `--foreground` adalah token shadcn. Proyek ini tidak
mendefinisikan keduanya — paletnya `--color-tinta`, `--color-redup`,
`--color-sedang`. Gradiennya jadi tidak sah, `text-transparent` tetap berlaku,
dan tulisannya **hilang sama sekali**: tidak ada galat, tidak ada peringatan
build, hanya ruang kosong tepat di detik-detik pengguna paling butuh tanda bahwa
aplikasinya masih hidup.

Tokennya dipetakan ke `--color-redup` dan `--color-tinta` di berkas yang disalin.

**2. `shadcn init` penuh ditolak.** Ia menulis blok temanya sendiri —
`--background`, `--primary`, `--muted`, `--destructive`. Di sini itu berbahaya:
`index.css` menetapkan warna sebagai **arti**, dengan kontras terukur. Hijau
hanya untung. Merah hanya rugi, galat, dan hapus. Menambahkan sistem warna kedua
yang berjalan sejajar, lengkap dengan `--destructive` yang juga merah, adalah
cara tercepat membuat artinya melenceng tanpa disadari — dan spec redesain sudah
mencatat kegagalan persis jenis itu, saat hijau "berhasil" lolos ke panel
keyakinan AI di atas transaksi yang merugi.

Yang dipasang hanya yang dibutuhkan: alias `@/*`, `lib/utils.ts`, dan
`components.json`. Tidak ada blok tema baru.

**3. Paletnya diganti, perilakunya dipakai.** Komponen beUI datang dengan rupa
shadcn netral. Layar ini mengikuti bahasa visual e-wallet yang sudah ada:
`rounded-kartu`, `--color-merek`, `KepalaHero` + `Lembar`, target sentuh ≥ 56px,
dan huruf yang sengaja lebih besar untuk pengguna 35–60 tahun.

`bunx --bun` diganti `npx`: repo ini memakai npm dan tidak punya `bun.lockb`.
Registrinya sama persis; memasang bun berarti menambah toolchain untuk seluruh
tim menjelang demo.

## Kontrak API

| Endpoint | Guna |
|---|---|
| `POST /tanya` | Satu pertanyaan, satu jawaban. Hanya-baca |

```ts
type TanyaReq = { pertanyaan: string };
type TanyaRes = {
  maksud: Maksud;
  jawaban: string;
  acuan: Record<string, number | string> | null;
  peringatan: string[];
  alihkan_ke: { rute: '/catat'; teks: string } | null;
};
```

`peringatan` membawa hal yang membuat angkanya tidak utuh — misalnya *"2
transaksi belum ikut dihitung untungnya karena resepnya belum diisi."* Angka yang
tidak lengkap tanpa diberi tahu adalah angka yang salah.

## Aturan yang mengikat

- **#1** LLM tidak menghitung. Ia mengklasifikasi maksud, lalu template menyulih
  angka yang sudah dihitung SQL.
- **#2** Modul ini tidak menulis apa pun. Mencatat dialihkan ke layar konfirmasi
  yang sudah ada.
- **#7** Frontend hanya menampilkan `jawaban` dan `acuan`. Nol aritmetika.
- **#8** Nama produk yang tidak meyakinkan ditanyakan lewat
  `cocokkanNamaProduk()` — satu pintu, dan selisih skor di bawah 0,15 berarti
  bertanya, bukan memilih.

## Verifikasi

`backend/scripts/uji-tanya.mjs` ditulis **sebelum** implementasi. Tiga kelompok:

1. **Klasifikasi** — delapan pertanyaan, satu per maksud.
2. **Kejujuran batas** — pertanyaan di luar cakupan menghasilkan `tidak_paham`
   **dan** `acuan: null`.
3. **Ketertelusuran** — setiap angka rupiah di `jawaban` wajib punya padanan
   persis di `acuan`.

Yang ketiga paling berharga. Tanpanya, pelanggaran aturan #1 lolos tanpa suara:
tidak ada galat, hanya angka salah dengan kalimat yang meyakinkan.

Enam hal yang tidak bisa ditangkap compiler, diperiksa dengan mata:

1. Nol aritmetika rupiah di React.
2. Shimmer "sedang berpikir" benar-benar terlihat.
3. Hijau hanya untung, merah hanya rugi/galat, kuning hanya perlu-dicek —
   termasuk di komponen beUI yang baru disalin.
4. Target sentuh ≥ 56px di kolom ketik dan tombol kirim.
5. `prefers-reduced-motion` menghentikan animasi pesan dan shimmer.
6. Kartu aksi tetap empat kolom di layar 360px.

## Yang sengaja tidak dikerjakan

- **Text-to-SQL** — melanggar aturan #1, dan model yang menulis query sendiri
  cepat atau lambat menulis satu yang kehilangan `WHERE user_id = $1`.
- **Riwayat percakapan bertingkat** — "kalau yang itu bagaimana?" memaksa model
  menyimpulkan rujukan. Salah rujuk berarti menjawab soal produk yang salah
  dengan angka yang benar: kelas kegagalan paling sulit dilihat.
- **Asisten serba bisa** — di luar delapan maksud, jawabannya `tidak_paham`.
  Chatbot yang menjawab apa saja adalah chatbot yang mengarang.
- **`shadcn init` penuh** — menanam sistem warna kedua di samping yang artinya
  sudah terukur.
- **Slot NavBawah keenam** — bertentangan dengan keputusan tertulis.
- **Perbaikan Fitur 1** — dikerjakan orang lain.

## Catatan

Chatbot ini berada **di bawah prioritas #24** di
[docs/02-fitur-prioritas.md](../../02-fitur-prioritas.md). Aturan pengorbanan
berlaku: kalau alur inti goyah saat waktu menipis, ini yang pertama dilepas, dan
melepasnya bukan kegagalan.
