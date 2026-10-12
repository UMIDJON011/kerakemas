# CEFR Multilevel — Reading & Listening

## Ishga tushirish
    npm run install:all
    npm run seed        # admin / admin123 yaratadi
    npm run dev         # API :5000, Web :5173

## Holat
- [x] 1. Struktura + package.json
- [x] 2. DB sxemasi (SQLite)
- [x] 3. Backend API (auth, CRUD, upload, bulk import, scoring, dashboard)
- [x] 4. Frontend foydalanuvchi sahifalari
- [x] 5. Admin panel
- [x] 6. Audio player + Map interfeys
- [x] 7. Dizayn + animatsiyalar
- [x] 8. Seed data (6 daraja × Reading + Listening)

## Savol `data` / `answer` formatlari
| Part turi | data | answer |
|---|---|---|
| gap_fill | `{ "text": "He ___ to school" }` | `["goes","walks"]` (qabul qilinadigan javoblar) |
| mc / mc_tfng | `{ "text": "...", "options": ["A","B","C"] }` | `"B"` yoki `"NOT GIVEN"` |
| matching_ads / heading_matching / multi_matching | `{ "text": "Paragraph 1" }` (variantlar `part.content.options`da) | `"C"` |
| map_label | `{ "text": "Library", "x": 40, "y": 62 }` | `"D"` |

## Eslatma
- Seed — DEMO kontent: savollar har daraja uchun 8 gaplik matndan avtomatik tuziladi. Haqiqiy testlarni admin paneldan yoki JSON import orqali kiriting.
- Listening testlarga audio (mp3/wav) admin paneldan yuklanadi; Part 4 uchun demo xarita `server/uploads/images/demo-map.svg`.

## Deploy (Docker)
    JWT_SECRET=uzun-sir-kalit docker compose up -d --build
Sayt va API: http://localhost:5000 · Admin: /admin · Ma'lumotlar `db` va `uploads` volume'larida saqlanadi.
Admin parolni birinchi kirgandan so'ng Sozlamalar bo'limida o'zgartiring.

## Yangi tuzilma (Mock 17 formati)
- Darajalar (A1–C2) olib tashlandi. Rejimlar: Only Reading / Only Listening / Full Mock (tasodifiy Listening → Reading), har biri 60 daqiqa.
- Seed: `server/seed-data/mock17.json` (Full Mock 17 Reading + Listening, audio va xarita bilan).
- Eski baza bo'lsa o'chiring: `rm server/cefr.db*` keyin `npm run seed`.
- Admin: Testlar → "Savollarni yuklash (PDF / DOCX)"; har Part'da audio yuklash; test tepasida "Javoblar kaliti (PDF / DOCX)".
- Gap matnlarida bo'shliq `[[1]]`, `[[2]]`... ko'rinishida (Part ichidagi tartib raqami).
- Highlight: matnni belgilab o'ng tugma — sariq; highlight ustida o'ng tugma — o'chadi.

## data/ papka (testlar fayldan olinadi)
Testlar `data/` papkadagi fayllardan o'qiladi (tuzilma va format: `data/README.txt`). Namuna: `data/full mock/full_mock_1`.
- `data/reading/<test>/part1.txt…part5.txt`, `data/listening/<test>/part1.txt…part6.txt` (+ `music/`, `map/`), `answers.txt`
- `data/full mock/<nom>/reading` va `listening` — bir xil tuzilma
- **Admin → Testlar → "Test qo'shish"**: tur (Reading / Listening / Full Mock) → nom → har Part uchun matn tashlang (yoki screenshot — OCR o'zi o'qiydi, logi pastda ko'rinadi) → Saqlash. Fayllar data/ ga yoziladi. Audio va xarita ham shu yerdan yuklanadi. OCR birinchi marta ingliz tili faylini internetdan yuklaydi.
- Fayl o'zgarsa test o'zi yangilanadi. Admin → Testlar → "data papkani yangilash" natijani (va ogohlantirishlarni) ko'rsatadi.
- Test boshlanganda to'liq ekran ochiladi; chiqib ketsa bloklanadi va 6 xonali kod so'raydi (standart `654789`, o'zgartirish: `UNLOCK_CODE` muhit o'zgaruvchisi).

## Yangilanishlar
- Sayt ism + familya so'raydi (parolsiz). Admin → O'quvchilar ro'yxatida ko'rinadi.
- Full Mock'da Listening + Reading bitta sessiyada; Admin → Dashboard / Natijalar: o'quvchi · Listening x/35 · Reading x/35, qatorga bosilsa har bir savol; mock bo'yicha reyting (`/ranking`).
- Only Reading / Only Listening da avval Part tanlanadi.
