# SMM Nexus - Premium Automation Platform

Bu loyiha to'liq avtomatlashtirilgan SMM (Social Media Marketing) platformasi hisoblanadi. Tizim ikkita asosiy qismdan tashkil topgan:
1. **Server (Backend & UI):** Buyurtmalarni qabul qiladi, foydalanuvchilarni menejment qiladi va vazifalarni (tasklarni) Workerlarga tarqatadi. Endi UI (Dashboard) ham server ichida (public papkada).
2. **Worker (Bot Manager):** Sizning kompyuteringizda (yoki VPS) ishlab, haqiqiy brauzer orqali bot akkauntlar yaratadi va vazifalarni (follow, like, view, comment) platformalarda bajaradi.

## GitHubga Push Qilish

Siz aynan shu SMM papkasidagi hamma narsani GitHubga push qilishingiz kerak. `.gitignore` fayli orqali keraksiz fayllar (`node_modules`, `.env`) avtomatik ravishda e'tiborga olinmaydi.

```bash
git init
git add .
git commit -m "Initial commit for SMM Nexus complete system"
git branch -M main
git remote add origin https://github.com/SIZNING_USERNAME/SMM-Nexus.git
git push -u origin main
```

## Render.com da Serverni Ishga Tushirish

Backend va UIni Render.com da bepul yoki pullik tarifda oson ishga tushirishingiz mumkin. Worker esa sizning shaxsiy kompyuteringizda yoki alohida Windows serverda ishlaydi.

### 1-Qadam: Renderda Web Service yaratish
1. Render.com saytiga kiring va GitHub akkauntingiz orqali login qiling.
2. **New** -> **Web Service** tugmasini bosing.
3. GitHub repozitoriyangizni tanlang (`SMM-Nexus`).
4. **Root Directory** bo'limiga `server` deb yozing (BUNGA JUDA DIQQAT QILING! Chunki backend `server` papkasi ichida).

### 2-Qadam: Sozlamalar (Settings)
- **Name:** SMM-Nexus-Server (ixtiyoriy)
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start` yoki `node index.js`

### 3-Qadam: Environment Variables (.ENV) qo'shish
Sahifani pastga tushirib **Environment Variables** bo'limini toping va quyidagilarni qo'shing:

- `PORT` = `5000` (ixtiyoriy, lekin yaxshi)
- `MONGODB_URI` = `sizning_mongodb_atlas_url_ingiz` (Buning uchun MongoDB Atlas saytidan bepul klaster ochib, ulanish URLini olishingiz kerak. Masalan: `mongodb+srv://admin:parol@cluster0.abcde.mongodb.net/smm_nexus`)
- `JWT_SECRET` = `super_maxfiy_kalit_uchun_ixtiyoriy_matn` (Masalan: `smm_nexus_secret_key_2026`)

Keyin **Create Web Service** tugmasini bosing va deploy tugashini kuting.

### 4-Qadam: Workerni (Sizni kompyuterda) Sozlash
Render sizga URL beradi (masalan: `https://smm-nexus.onrender.com`). Shu URLni kompyuteringizdagi Workerga `.env` faylida kiritishingiz kerak.

**`worker/.env` yaratish (kompyuteringizda):**
Worker papkasining ichida `.env` nomli fayl yarating va quyidagilarni yozing:
```properties
SERVER_URL=https://smm-nexus.onrender.com
AUTH_TOKEN=siz_registratsiyadan_o'tib_olgan_token
```
*(Tokenni saytga kirgach Konsol (F12) -> Application -> Local Storage dan `smm_token` nomli joydan olasiz).*

Worker ichida Run qilasiz:
```bash
cd worker
npm install
npm start
```
Bo'ldi! Endi saytdan berilgan buyurtmalar kompyuteringizdagi worker orqali bajarilaveradi. Proxylarni `worker/proxies.txt` fayliga `ip:port:user:pass` formatida qo'shishni unutmang!
