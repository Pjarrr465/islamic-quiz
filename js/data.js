/* =====================================================
   DATA KUIS - file ini yang paling sering diedit.

   Tambah soal   : buka data/soal.json, salin satu blok { "id": ..., "prompt": ... } di dalam "questions".
   Ganti jawaban : (di data/soal.json) ubah angka "answer" (0 = pilihan pertama, 1 = kedua, dst).
   Ganti tulisan reaksi bintang : ubah bagian REACTIONS di bawah.
   ===================================================== */

const SETTINGS = {
  pointsPerCorrect: 100,   // poin untuk tiap jawaban benar (dihitung dari nilai TERBAIK tiap level)
  passStars: 3,            // level dianggap lulus jika dapat minimal 3 bintang
  usersKey: "islamic_quiz_users_v1",     // tempat menyimpan akun di browser
  sessionKey: "islamic_quiz_session_v1"  // tempat menyimpan siapa yang sedang login
};

// Reaksi sistem untuk nilai 1/5 sampai 5/5.
// confetti = jumlah kertas warna-warni yang jatuh (makin tinggi bintang, makin meriah)
const REACTIONS = {
  1: { title: "Ayo semangat!",         text: "Jangan menyerah ya. Baca penjelasannya lalu coba lagi!", confetti: 0 },
  2: { title: "Lumayan!",              text: "Sedikit lagi! Kamu pasti bisa lebih baik.",              confetti: 25 },
  3: { title: "Bagus!",                text: "Kamu sudah paham banyak. Terus belajar ya!",             confetti: 60 },
  4: { title: "Hebat sekali!",         text: "Alhamdulillah, hampir sempurna!",                        confetti: 110 },
  5: { title: "MasyaAllah, Sempurna!", text: "Semua jawabanmu benar. Kamu juara!",                     confetti: 180 }
};

// Daftar soal (LEVELS) sekarang ada di data/soal.json dan dimuat dengan AJAX ($.getJSON) di js/app.js