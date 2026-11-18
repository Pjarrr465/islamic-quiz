/* =====================================================
   LOGIKA APLIKASI (login, level, skor, bintang, profil) - ditulis dengan jQuery
   Soal: data.js | Hewan: sprites.js | Efek: effects.js | Musik: song.js
   Catatan: jQuery (tanda $) dimuat lebih dulu di index.html
   ===================================================== */

let LEVELS = [];   // diisi dari data/soal.json lewat AJAX (lihat bagian "Mulai" di bawah)

const state = {
  user: null,     // username yang sedang login
  best: {},       // nilai terbaik tiap level (jumlah benar), contoh { 1: 8, 2: 6 }
  level: null,    // level yang sedang dikerjakan
  answers: {},    // jawaban siswa: { idSoal: nomorPilihan }
  order: {},      // urutan pilihan yang diacak: { idSoal: [2, 0, 3, 1] }
  graded: false   // sudah diperiksa atau belum
};

/* ---------- Rumus: bintang, level terbuka, poin ---------- */
// Jumlah benar -> bintang 1 sampai 5
function toStars(correct, total) {
  return Math.max(1, Math.round(correct / total * 5));
}
function starsOf(level) {
  const correct = state.best[level.id];
  return correct === undefined ? 0 : toStars(correct, level.questions.length);
}
function isDone(level) {
  return starsOf(level) >= SETTINGS.passStars;
}
function isUnlocked(level) {
  return level.id === 1 || isDone(LEVELS[level.id - 2]);   // level sebelumnya harus lulus
}
function isAccessed(level) {
  return state.best[level.id] !== undefined;   // sudah pernah dikerjakan
}
function totalScore() {
  let sum = 0;
  Object.values(state.best).forEach((correct) => { sum += correct * SETTINGS.pointsPerCorrect; });
  return sum;
}

/* ---------- Penyimpanan akun & progres (di browser) ---------- */
function readUsers() {
  try { return JSON.parse(localStorage.getItem(SETTINGS.usersKey)) || {}; }
  catch (e) { return {}; }
}
function writeUsers(users) {
  localStorage.setItem(SETTINGS.usersKey, JSON.stringify(users));
}
function save() {
  const users = readUsers();
  users[state.user].progress = { best: state.best };
  writeUsers(users);
}

/* ---------- Password: diacak (hash) supaya tidak tersimpan apa adanya ---------- */
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const randomSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)));
async function hashPassword(password, salt) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + password));
  return toHex(new Uint8Array(buffer));
}

/* ---------- Helper kecil ---------- */
// Buat elemen jQuery: el("p", "kelas", "isi teks")
function el(tag, className, text) {
  const node = $("<" + tag + ">");
  if (className) node.addClass(className);
  if (text !== undefined) node.text(text);
  return node;
}

// Urutan acak 0..n-1, dipakai untuk mengacak pilihan jawaban
function shuffled(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function stars(count) {            // 3 -> "★★★☆☆"
  return "★".repeat(count) + "☆".repeat(5 - count);
}

let toastTimer;
function showToast(message) {
  $("#toast").text(message).prop("hidden", false);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("#toast").prop("hidden", true); }, 2500);
}

// Tampilkan satu layar saja: "welcome", "auth", "map", "profile", atau "quiz"
function showScreen(name) {
  ["welcome", "auth", "map", "profile", "quiz"].forEach((n) => {
    $("#screen-" + n).prop("hidden", n !== name);
  });
  scrollTo({ top: 0 });
}

/* ---------- Hiasan: bulan, bintang, dan hewan yang berjalan ---------- */
function buildDecorations() {
  $("#brand-moon").append(makeSprite("bulan"));

  // bintang berkelip di header
  ["34%", "38%", "42%", "46%"].forEach((left, i) => {
    $(makeSprite("bintang"))
      .css({ left: left, top: (i % 2 ? 12 : 55) + "%", animationDelay: (i * 0.4) + "s" })
      .appendTo("#sky");
  });

  // hewan berjalan dari kiri ke kanan, terus berulang
  ["kucing", "kambing", "sapi", "unta"].forEach((name, i) => {
    el("div", "walker")
      .css({ animationDuration: (20 + i * 4) + "s", animationDelay: (-i * 6) + "s" })   // minus = langsung tersebar di layar
      .append(makeSprite(name))
      .appendTo("#parade");
  });
}

/* ---------- Header ---------- */
function renderHeader() {
  const done = LEVELS.filter(isDone).length;
  $("#score").text(totalScore().toLocaleString("id-ID"));
  $("#progress-label").text(done + " / " + LEVELS.length + " level");
  $("#progress-fill").css("width", (done / LEVELS.length * 100) + "%");
  renderUserPanel();
}

/* ---------- Panel user (klik ikon user) & halaman profil ---------- */
const emailText = (user) => user.email || "Email belum diisi";

function renderUserPanel() {
  if (!state.user) return;
  const user = readUsers()[state.user];
  $("#panel-name").text(user.name);
  $("#panel-email").text(emailText(user));
  $("#panel-levels").text(LEVELS.filter(isAccessed).length + " / " + LEVELS.length);
  $("#panel-score").text(totalScore().toLocaleString("id-ID"));
}

function togglePanel(open) {
  $("#user-panel").prop("hidden", !open);
  $("#user-btn").attr("aria-expanded", open);
}

function renderProfile() {
  const user = readUsers()[state.user];
  $("#profile-name").text(user.name);
  $("#profile-username").text("@" + state.user);
  $("#profile-email").text(emailText(user));
  $("#profile-points").text(totalScore().toLocaleString("id-ID"));
  $("#profile-accessed").text(LEVELS.filter(isAccessed).length + " / " + LEVELS.length);
  $("#profile-passed").text(LEVELS.filter(isDone).length + " / " + LEVELS.length);

  const list = $("#profile-levels").empty();
  const accessed = LEVELS.filter(isAccessed);
  if (accessed.length === 0) list.append(el("li", "profile-empty", "Belum ada level yang dikerjakan."));
  accessed.forEach((level) => {
    el("li", "profile-level").append(
      el("span", "", "Level " + level.id + " · " + level.topic + " (" + level.difficulty + ")"),
      el("span", "level-stars", stars(starsOf(level)))
    ).appendTo(list);
  });
}

function openProfile() {
  togglePanel(false);
  renderProfile();
  showScreen("profile");
}

/* ---------- Layar daftar level ---------- */
function renderMap() {
  const grid = $("#level-grid").empty();
  let lastTopic = "";

  LEVELS.forEach((level) => {
    // judul kelompok (Akhlak / Akidah / Sejarah Nabi) muncul sekali saja
    if (level.topic !== lastTopic) {
      grid.append(el("h3", "topic-title", level.topic));
      lastTopic = level.topic;
    }

    const open = isUnlocked(level);
    el("button", "level-card" + (isDone(level) ? " done" : ""))
      .attr({ type: "button", style: "--lv:" + level.color })
      .prop("disabled", !open)
      .on("click", () => startLevel(level))
      .append(
        el("span", "level-icon", level.icon),
        el("span", "level-no", "Level " + level.id),
        el("h3", "", level.topic),
        el("span", "tag " + level.difficulty.toLowerCase(), level.difficulty),
        el("p", "", level.description),
        el("span", "level-stars", stars(starsOf(level))),
        el("span", "level-status", open ? "Mulai →" : "Terkunci 🔒")
      )
      .appendTo(grid);
  });

  $("#finish-banner").prop("hidden", !LEVELS.every(isDone));
  renderHeader();
}

/* ---------- Layar soal ---------- */
function startLevel(level) {
  state.level = level;
  state.answers = {};
  state.graded = false;
  state.order = {};
  level.questions.forEach((q) => { state.order[q.id] = shuffled(q.options.length); });

  $("#quiz-title").text("Level " + level.id + " · " + level.topic + " (" + level.difficulty + ")");
  $("#quiz-sub").text("Jawab semua soal, lalu tekan \"Periksa jawaban\"");

  renderQuestions();
  $("#result").prop("hidden", true);
  $("#btn-submit").prop("hidden", false);
  $("#btn-retry").prop("hidden", true);
  $("#btn-next").prop("hidden", true);
  showScreen("quiz");
}

function renderQuestions() {
  const wrap = $("#questions").empty();

  state.level.questions.forEach((q, number) => {
    const chosen = state.answers[q.id];
    const isCorrect = chosen === q.answer;

    const box = el("div", "card question")
      .toggleClass("correct", state.graded && isCorrect)
      .toggleClass("incorrect", state.graded && !isCorrect);

    el("h3").append(el("span", "num", number + 1), el("span", "prompt", q.prompt)).appendTo(box);

    const list = el("div", "options").appendTo(box);
    state.order[q.id].forEach((optionIndex, position) => {
      el("button", "option")
        .attr("type", "button")
        .prop("disabled", state.graded)
        .toggleClass("is-right", state.graded && optionIndex === q.answer)
        .toggleClass("is-wrong", state.graded && optionIndex !== q.answer && optionIndex === chosen)
        .toggleClass("selected", !state.graded && optionIndex === chosen)
        .append(el("span", "letter", String.fromCharCode(65 + position)), el("span", "", q.options[optionIndex]))
        .on("click", function () {
          state.answers[q.id] = optionIndex;
          list.find(".option").removeClass("selected");
          $(this).addClass("selected");
        })
        .appendTo(list);
    });

    if (state.graded) {
      el("div", "explain").append(
        el("strong", "", chosen === undefined ? "Belum dijawab. " : isCorrect ? "Benar! " : "Kurang tepat. "),
        document.createTextNode(q.explain)
      ).appendTo(box);
    }
    wrap.append(box);
  });
}

function submitLevel() {
  const level = state.level;
  const total = level.questions.length;
  const unanswered = level.questions.filter((q) => state.answers[q.id] === undefined).length;
  if (unanswered > 0 && !confirm(unanswered + " soal belum dijawab. Tetap periksa jawaban?")) return;

  state.graded = true;
  const correct = level.questions.filter((q) => state.answers[q.id] === q.answer).length;
  const starCount = toStars(correct, total);

  // simpan hanya jika lebih baik dari nilai sebelumnya
  const before = state.best[level.id] || 0;
  const gained = Math.max(0, correct - before) * SETTINGS.pointsPerCorrect;
  if (state.best[level.id] === undefined || correct > before) state.best[level.id] = correct;
  save();
  renderHeader();
  renderQuestions();

  showResult(correct, total, starCount, gained);
  celebrate(starCount);
}

function showResult(correct, total, starCount, gained) {
  const reaction = REACTIONS[starCount];

  // hewan maskot ikut bereaksi (makin tinggi bintang, makin heboh)
  const animals = ["kucing", "kambing", "sapi", "unta"];
  $("#result-mascot").empty()
    .attr("class", "mascot mood-" + starCount)
    .append(makeSprite(animals[Math.floor(Math.random() * animals.length)]));

  // bintang muncul satu per satu
  const row = $("#result-stars").empty();
  for (let i = 1; i <= 5; i++) {
    el("span", "star" + (i <= starCount ? " on" : ""), "★").attr("style", "--i:" + i).appendTo(row);
  }

  const passed = starCount >= SETTINGS.passStars;
  $("#result-title").text(reaction.title + " " + starCount + "/5");
  $("#result-text").text(reaction.text);
  $("#result-count").text(correct + " dari " + total + " soal benar");
  $("#result-note").text(passed
    ? "Level lulus! " + (gained ? "+" + gained + " poin" : "Level berikutnya sudah terbuka.")
    : "Dapatkan minimal " + SETTINGS.passStars + " bintang untuk membuka level berikutnya.");

  $("#result").attr("class", "card result " + (passed ? "pass" : "fail")).prop("hidden", false);
  $("#btn-submit").prop("hidden", true);
  $("#btn-retry").prop("hidden", false);
  $("#btn-next").prop("hidden", false);
  $("#result").get(0).scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetProgress() {
  if (!confirm("Hapus semua progres dan poin untuk akun ini?")) return;
  state.best = {};
  save();
  showScreen("map");
  renderMap();
  showToast("Progres dihapus");
}

/* ---------- Masuk, daftar, keluar ---------- */
function showError(selector, message) {
  $(selector).text(message).prop("hidden", !message);
}

function switchTab(mode) {
  const isLogin = mode === "login";
  $("#tab-login").toggleClass("active", isLogin);
  $("#tab-signup").toggleClass("active", !isLogin);
  $("#form-login").prop("hidden", !isLogin);
  $("#form-signup").prop("hidden", isLogin);
  $("#auth-title").text(isLogin ? "Masuk ke Kuis Islami" : "Buat Akun Baru");
  showError("#login-error", "");
  showError("#signup-error", "");
}

function enterApp(username) {
  const user = readUsers()[username];
  state.user = username;
  state.best = (user.progress && user.progress.best) || {};
  localStorage.setItem(SETTINGS.sessionKey, username);

  $("#hero-title").text("Assalamualaikum, " + user.name.split(" ")[0] + "! Pilih level untuk mulai");
  $("#stats").prop("hidden", false);
  $("#btn-reset").prop("hidden", false);
  togglePanel(false);
  showScreen("map");
  renderMap();
}

function logout() {
  state.user = null;
  togglePanel(false);
  localStorage.removeItem(SETTINGS.sessionKey);
  $("#stats").prop("hidden", true);
  $("#btn-reset").prop("hidden", true);
  $("#form-login").get(0).reset();
  $("#form-signup").get(0).reset();
  showScreen("welcome");
  showToast("Kamu sudah keluar");
}

async function handleLogin(event) {
  event.preventDefault();
  const username = $("#login-username").val().trim().toLowerCase();
  const password = $("#login-password").val();
  const user = readUsers()[username];

  // pesan sama untuk username salah maupun password salah
  const failMessage = "Username atau password salah.";
  if (!user) return showError("#login-error", failMessage);
  if (await hashPassword(password, user.salt) !== user.hash) return showError("#login-error", failMessage);

  showError("#login-error", "");
  enterApp(username);
}

async function handleSignup(event) {
  event.preventDefault();
  const name = $("#signup-name").val().trim();
  const email = $("#signup-email").val().trim().toLowerCase();
  const username = $("#signup-username").val().trim().toLowerCase();
  const password = $("#signup-password").val();
  const users = readUsers();

  if (name.length < 2) return showError("#signup-error", "Nama lengkap minimal 2 karakter.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return showError("#signup-error", "Format email belum benar.");
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return showError("#signup-error", "Username 3-20 karakter: huruf kecil, angka, atau _.");
  if (users[username]) return showError("#signup-error", "Username sudah dipakai, pilih yang lain.");
  if (password.length < 6) return showError("#signup-error", "Password minimal 6 karakter.");
  if (password !== $("#signup-password2").val()) return showError("#signup-error", "Konfirmasi password tidak sama.");

  const salt = randomSalt();
  users[username] = { name: name, email: email, salt: salt, hash: await hashPassword(password, salt), progress: { best: {} } };
  writeUsers(users);
  showToast("Akun berhasil dibuat");
  enterApp(username);
}

/* ---------- Layar pembuka ---------- */
// Setiap huruf dibungkus <span> supaya bisa diberi warna sendiri dan melompat bergantian (CSS)
let letterNo = 0;
function rainbow(selector) {
  const target = $(selector);
  target.html(target.text().split(" ").map((word) =>
    '<span class="word">' + [...word].map((ch) =>
      `<span style="--c:${COLORS[letterNo % COLORS.length]};--i:${letterNo++}">${ch}</span>`).join("") + "</span>"
  ).join(" "));
}
rainbow("#welcome-title");

const openAuth = (mode) => { switchTab(mode); showScreen("auth"); };
$("#go-login").on("click", () => openAuth("login"));
$("#go-signup").on("click", () => openAuth("signup"));
$("#btn-welcome").on("click", () => showScreen("welcome"));

/* ---------- Mulai ---------- */
$("#tab-login").on("click", () => switchTab("login"));
$("#tab-signup").on("click", () => switchTab("signup"));
$("#form-login").on("submit", handleLogin);
$("#form-signup").on("submit", handleSignup);
$("#btn-logout").on("click", logout);
$("#user-btn").on("click", () => togglePanel($("#user-panel").prop("hidden")));
$("#btn-profile").on("click", openProfile);
const backToMap = () => { showScreen("map"); renderMap(); };
$("#btn-profile-back, #btn-back, #btn-next").on("click", backToMap);
// klik di luar panel atau tekan Esc: panel ditutup
$(document).on("click", (e) => { if (!$(e.target).closest("#user-menu").length) togglePanel(false); });
$(document).on("keydown", (e) => { if (e.key === "Escape") togglePanel(false); });
$("#btn-submit").on("click", submitLevel);
$("#btn-retry").on("click", () => startLevel(state.level));
$("#btn-reset").on("click", resetProgress);

buildDecorations();

// AJAX: ambil daftar soal dari data/soal.json, baru setelah itu aplikasi dijalankan
$.getJSON("data/soal.json")
  .done((data) => {
    LEVELS = data;
    // Jika masih ada sesi login, langsung masuk
    const savedUser = localStorage.getItem(SETTINGS.sessionKey);
    if (savedUser && readUsers()[savedUser]) enterApp(savedUser);
    else showScreen("welcome");
  })
  .fail(() => {
    showScreen("welcome");
    showToast("Soal gagal dimuat. Jalankan lewat Live Server, bukan dibuka langsung dari file.");
  });