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

Di dalam Claude Code, ketik:

```
/plugin install superpowers@claude-plugins-official
```

Lalu **restart Claude Code**.

Tidak perlu menambahkan marketplace-nya — `claude-plugins-official` sudah terdaftar otomatis di setiap mesin.

Catatan: superpowers adalah plugin pihak ketiga ([github.com/obra/superpowers](https://github.com/obra/superpowers)). Akan ada konfirmasi kepercayaan saat memasang — itu memang disengaja.

### Memastikan sudah terpasang

Ketik `/` di Claude Code. Kalau muncul perintah seperti `/brainstorm`, `/write-plan`, atau `/execute-plan`, berarti sudah aktif.

## 4. graphify

Skill-nya **sudah ikut di repo** (`.claude/skills/graphify/`), jadi kamu tidak perlu memasang skill-nya. Yang perlu dipasang hanya paket Python-nya:

```bash
pip install graphifyy
```

Atau kalau punya `uv`:

```bash
uv tool install graphifyy
```

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

## 5. Kunci API

```bash
cp .env.example .env
```

Isi `GEMINI_API_KEY` dengan kunci dari [Google AI Studio](https://aistudio.google.com/apikey).

`.env` sudah ada di `.gitignore`. **Jangan pernah commit kunci API.**

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
- [ ] Claude Code terpasang
- [ ] `/plugin install superpowers@claude-plugins-official` sudah dijalankan, lalu restart
- [ ] `/brainstorm` muncul saat mengetik `/`
- [ ] `pip install graphifyy` selesai
- [ ] `graphify hook install` sudah dijalankan
- [ ] `graphify query "apa aturan commit di repo ini"` memberi jawaban
- [ ] `.env` sudah dibuat dan `GEMINI_API_KEY` terisi
- [ ] Sudah membaca [CLAUDE.md](../CLAUDE.md) — terutama 8 aturan yang tidak boleh dilanggar

## Kalau ada yang tidak jalan

| Gejala | Kemungkinan sebab |
|---|---|
| `/brainstorm` tidak muncul | Belum restart Claude Code setelah install plugin |
| `graphify: command not found` | Paketnya `graphifyy` (dua huruf y), bukan `graphify` |
| `graphify query` bilang graf tidak ada | Jalankan `/graphify .` sekali dari Claude Code |
| Bentrok terus di `graph.json` | Belum menjalankan `graphify hook install` |
| Claude tetap jadi co-author di commit | Belum menarik `.claude/settings.json` terbaru, atau belum restart |
| Muncul peringatan *"Run 'graphify install' to update"* | Versi paket-mu berbeda dari skill yang ikut di repo. **Abaikan saja** — menjalankan `graphify install` justru akan menimpa skill bersama dengan versi lokalmu |
