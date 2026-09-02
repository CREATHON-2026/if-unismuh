# Setup Tim

Jalankan sekali di awal, di **setiap laptop**. Sekitar 10 menit.

Tanpa langkah-langkah ini, AI assistant di laptopmu tidak akan punya kemampuan yang sama dengan yang lain, dan hasil kerjanya akan berbeda-beda.

## 1. Clone repo

```bash
git clone https://github.com/CREATHON-2026/if-unsmuh.git
cd if-unsmuh
```

## 2. Claude Code

Kalau belum punya, pasang dari [claude.com/claude-code](https://claude.com/claude-code).

Repo ini sudah membawa konfigurasi bersama di `.claude/settings.json` — kamu tidak perlu mengaturnya sendiri. Yang ikut otomatis saat clone:

- Izin untuk perintah git baca-saja (tidak ditanya terus-menerus untuk `git status`, `git diff`, dll)
- Pengaturan agar commit **tidak** menambahkan Claude sebagai co-author
- Skill graphify (lihat langkah 4)

## 3. Plugin superpowers

**Ini tidak otomatis.** Meskipun `.claude/settings.json` di repo sudah mengaktifkannya, pengaturan itu hanya **saklar, bukan pemasang** — plugin-nya tetap harus diunduh sekali di tiap laptop.

Pemasangannya berbeda per alat. **Kalau kamu memakai dua-duanya, pasang di dua-duanya** — plugin ini tidak dibagi antar alat.

### Kalau kamu pakai Claude Code

Di dalam Claude Code, ketik:

```
/plugin install superpowers@claude-plugins-official
```

Lalu **restart Claude Code**.

Tidak perlu menambahkan marketplace-nya — `claude-plugins-official` sudah terdaftar otomatis di setiap mesin.

Memastikan: ketik `/`. Kalau muncul perintah seperti `/brainstorm`, `/write-plan`, atau `/execute-plan`, berarti sudah aktif.

### Kalau kamu pakai GitHub Copilot CLI

Dua perintah, dari terminal biasa (bukan dari dalam sesi Copilot):

```bash
copilot plugin marketplace add obra/superpowers-marketplace
copilot plugin install superpowers@superpowers-marketplace
```

Lalu **mulai sesi baru** — plugin dimuat saat sesi dimulai, jadi sesi yang sudah berjalan tidak akan melihatnya.

Memastikan:

```bash
copilot plugin list
```

Harus muncul `superpowers@superpowers-marketplace` beserta versinya.

Catatan: superpowers adalah plugin pihak ketiga ([github.com/obra/superpowers](https://github.com/obra/superpowers)). Akan ada konfirmasi kepercayaan saat memasang — itu memang disengaja.

### Sebelum memakainya, baca dulu

**[13-superpowers.md](13-superpowers.md).** Dua skill bawaannya — worktree dan TDD — akan merusak proyek ini kalau dijalankan apa adanya: yang pertama bisa merusak database PGlite, yang kedua bisa membuat agent memasang framework pengujian baru di tengah lomba. Dokumen itu menjelaskan penyesuaiannya.

## 4. graphify

Skill-nya **sudah ikut di repo** (`.claude/skills/graphify/`), jadi kamu tidak perlu memasang skill-nya. Yang perlu dipasang hanya paket Python-nya:

```bash
pip install "graphifyy[sql]"
```

Atau kalau punya `uv`:

```bash
uv tool install "graphifyy[sql]"
```

> **Pasang dengan `[sql]`, jangan `graphifyy` saja.** Tanpa itu graphify melewati
> semua berkas `.sql` dengan peringatan yang mudah terlewat — termasuk
> `backend/db/schema.sql`, satu-satunya tempat semua rumus finansial hidup.
> Grafnya tetap terbentuk, tapi pertanyaan seperti *"di mana modal per produk
> dihitung?"* hanya akan dijawab dari dokumen, bukan dari kode yang sebenarnya.

**Tidak butuh API key.** Perintah `query`, `path`, `explain`, dan `update` tidak memakai LLM sama sekali.

> **Jangan jalankan `graphify install` atau `graphify claude install`.** Kedua perintah itu menulis path absolut dari laptopmu ke `.claude/settings.json` yang ter-commit — dan akan merusak setup rekan tim yang lain.

### Pasang merge driver

**Wajib, dan wajib dijalankan di tiap laptop:**

```bash
graphify hook install
```

Ini memasang git merge driver untuk `graphify-out/graph.json`. Tanpa ini, tiga orang yang sama-sama memperbarui knowledge graph akan bentrok terus-menerus di berkas itu.

Perintah ini menulis ke `.git/hooks/` yang **tidak ikut ter-clone**, jadi tidak bisa diwariskan lewat repo — tiap orang harus menjalankannya sendiri.

### Kalau kamu pakai macOS atau Linux

Skill yang ikut di repo ini varian Windows (langkah instalasinya pakai PowerShell). Jalankan sekali:

```bash
graphify install --project --platform claude
```

Lalu **jangan commit perubahannya** kecuali tim sepakat — supaya tidak bolak-balik menimpa varian satu sama lain.

## 5. Konfigurasi lokal

```bash
cp .env.example .env
```

Tidak ada kunci API yang perlu diisi — LLM memakai Ollama kampus, dan nilai bawaannya sudah benar. Cukup isi `JWT_SECRET` dengan teks acak apa saja (minimal 16 karakter).

`.env` sudah ada di `.gitignore`. Tetap jangan pernah commit berkas itu.

## Cara memakai graphify sehari-hari

Sebelum menjelajah kode dengan grep atau membuka banyak file, **tanya grafnya dulu**:

```bash
graphify query "bagaimana alur ekstraksi foto buku?"
graphify path "Pesanan Masuk" "cek margin"
graphify explain "modal per produk"
```

Jawabannya berupa subgraf yang jauh lebih kecil daripada hasil grep mentah — lebih cepat dibaca, dan lebih murah dari sisi konteks AI.

Setelah mengubah kode:

```bash
graphify update .
```

AST saja, tanpa LLM, tanpa biaya.

## Daftar periksa

- [ ] Repo ter-clone
- [ ] Claude Code dan/atau Copilot CLI terpasang
- [ ] superpowers terpasang di **tiap** alat yang kamu pakai, lalu sesi dimulai ulang
- [ ] `/brainstorm` muncul di Claude Code, atau `copilot plugin list` menyebut superpowers
- [ ] Sudah membaca [13-superpowers.md](13-superpowers.md) — terutama dua bagian bahayanya
- [ ] `pip install "graphifyy[sql]"` selesai
- [ ] `graphify hook install` sudah dijalankan
- [ ] `graphify query "apa aturan commit di repo ini"` memberi jawaban
- [ ] `.env` sudah dibuat dan `JWT_SECRET` terisi (tidak ada kunci API yang dibutuhkan)
- [ ] Sudah membaca [CLAUDE.md](../CLAUDE.md) — terutama 8 aturan yang tidak boleh dilanggar

## Kalau ada yang tidak jalan

| Gejala | Kemungkinan sebab |
|---|---|
| `/brainstorm` tidak muncul | Belum restart Claude Code setelah install plugin |
| Copilot CLI tidak mengenal skill superpowers | Sesi dimulai sebelum plugin dipasang — mulai sesi baru |
| Agent memaksa memasang Vitest/Jest | Ia menuruti Hukum Besi TDD tanpa membaca [13-superpowers.md](13-superpowers.md) |
| `graphify: command not found` | Paketnya `graphifyy` (dua huruf y), bukan `graphify` |
| `graphify query` bilang graf tidak ada | Jalankan `/graphify .` sekali dari Claude Code |
| Bentrok terus di `graph.json` | Belum menjalankan `graphify hook install` |
| Claude tetap jadi co-author di commit | Belum menarik `.claude/settings.json` terbaru, atau belum restart |
| Muncul peringatan *"Run 'graphify install' to update"* | Versi paket-mu berbeda dari skill yang ikut di repo. **Abaikan saja** — menjalankan `graphify install` justru akan menimpa skill bersama dengan versi lokalmu |
