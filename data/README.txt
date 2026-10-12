DATA PAPKA — testlar shu yerdan olinadi
=======================================

Tuzilma:

data/
  reading/
    <test nomi>/                 (masalan: test, mock_2)
      part1.txt … part5.txt
      answers.txt
  listening/
    <test nomi>/
      part1.txt … part6.txt
      answers.txt
      music/   part1.mp3 … part6.mp3        (audio; .wav/.m4a/.ogg ham bo'ladi)
      map/     screenshot.png               (Part 4 xaritasi; savollar so'zlari part4.txt da qoladi)
  full mock/
    full_mock_1/                 (masalan: full_mock_2 …)
      reading/                   (yuqoridagi reading/<test> bilan bir xil)
      listening/                 (yuqoridagi listening/<test> bilan bir xil)

* Fayl nomlari: part1.txt, "part 1.txt", Part_1.txt — hammasi bo'ladi.
* Serverni qayta ishga tushirish shart emas: fayl o'zgarsa, test o'zi yangilanadi.
  (Admin → Testlar → "data papkani yangilash" tugmasi natijani ko'rsatadi.)
* Test faqat hamma Part'ida savol va javob bo'lsa avtomatik e'lon qilinadi (published).
  Aks holda draft bo'lib turadi; answers.txt to'lgach o'zi e'lon qilinadi.
* Full mockdagi Reading + Listening bitta mock hisoblanadi ("Full Mock" tugmasi shuni beradi).

PART FAYLLARI — PDF'dagi matnni shundayligicha ko'chirib qo'ysangiz bo'ladi
---------------------------------------------------------------------------
Sahifa sarlavhalari ("PRACTICE TEST", "MOCK BOOK"), sahifa raqamlari va "GOOD LUCK!" o'zi tashlab ketiladi.

Listening
  Part 1 (A/B/C javob)      "1." keyin A) B) C) qatorlari
  Part 2 (gap)              "(9) …………" yoki "9._____" ko'rinishidagi bo'sh joylar
  Part 3 (moslashtirish)    "15. Speaker 1 …" qatorlari, so'ng A) … F) variantlar
  Part 4 (xarita)           "19.hotel …" qatorlari (A–H harflari avtomatik); rasm map/ papkada
  Part 5 (A/B/C)            "Extract One" sarlavhalari bilan, "24. savol" + A) B) C)
  Part 6 (gap)              "30._______" ko'rinishidagi bo'sh joylar
Reading
  Part 1 (gap)              "(1)_________"
  Part 2 (e'lonlar)         A) … J) tasdiqlar, so'ng "7. Sarlavha" + matn
  Part 3 (sarlavhalar)      "List of Headings:" A) … H), "15. Paragraph I" …, so'ng maqola
  Part 4 (matn + savollar)  maqola, "For questions 21-24 …" (A–D), "For questions 25-29 …" (True/False/No Information)
  Part 5 (matn + gap + MC)  maqola, "For questions 30-33 …" (gaplar), "For questions 34-35 …" (A–D)

answers.txt — bo'lim ichidagi tartib raqami bo'yicha (1–35):
  1. B
  2. A
  9. sign up
  14. 105
  15. E
  25. A        (True/False/No Information uchun: A=True, B=False, C=No Information)
Bir nechta to'g'ri javob bo'lsa: "color / colour".
