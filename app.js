/* =====================================================
   SUARA KAMPUS - APP.JS
   Backend: Flask
   Database: SQLite
   Machine Learning: Naive Bayes + TF-IDF
===================================================== */

var KEY = "pengaduan-v3";

var S = {
  laporan: [],
  batch: [],
  ai: [],
  koreksi: [],
  log: [],
  n: 0
};

var user = null;
var screen = "qr";
var tab = "harian";
var flt = "Semua";
var day = "";
var searchText = "";
var statusFilter = "Semua";
var categoryFilter = "Semua";

var KAT = [
  "Ruang kelas",
  "Laboratorium",
  "Toilet",
  "Parkiran & penerangan",
  "Perpustakaan",
  "Kantin",
  "Jaringan & Wi-Fi",
  "Fasilitas lainnya"
];

var $ = function(id) {
  return document.getElementById(id);
};


/* =====================================================
   UTILITAS
===================================================== */

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function(c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c];
  });
}

function ymd(d) {
  var z = new Date(d);
  return z.getFullYear() + "-" +
    String(z.getMonth() + 1).padStart(2, "0") + "-" +
    String(z.getDate()).padStart(2, "0");
}

function fmt(d) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function jam(d) {
  return new Date(d).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch(e) {}
}

function toast(t) {
  if (!$("toast")) return;

  $("toast").innerHTML = "<span>" + esc(t) + "</span>";

  setTimeout(function() {
    $("toast").innerHTML = "";
  }, 2400);
}


/* =====================================================
   API HELPER
===================================================== */

async function api(url, options) {
  options = options || {};

  options.credentials = "same-origin";

  var response = await fetch(url, options);

  var result = {};

  try {
    result = await response.json();
  } catch(e) {}

  if (!response.ok) {
    throw new Error(result.error || "Terjadi kesalahan server.");
  }

  return result;
}


/* =====================================================
   DATABASE SYNC
===================================================== */

async function syncReports(showError) {
  try {
    var result = await api("/api/reports");

    S.laporan = result.reports || [];

    S.n = Math.max(
      0,
      ...S.laporan.map(function(l) {
        return Number(l.id) || 0;
      })
    );

    return true;

  } catch(e) {
    console.error(e);

    if (showError !== false) {
      toast(e.message);
    }

    return false;
  }
}


/* =====================================================
   LOGIN MAHASISWA
===================================================== */

async function loginM() {
  var nama = $("nm").value.trim();
  var nim = $("nim").value.trim();
  var error = $("le");

  error.textContent = "";

  if (!nama || !nim) {
    error.textContent = "Isi nama dan NIM terlebih dahulu.";
    return;
  }

  try {
    var result = await api("/api/student/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nama: nama,
        nim: nim
      })
    });

    user = {
      role: "mhs",
      nama: result.nama,
      nim: result.nim
    };

    await syncReports();

    screen = "app";
    go("app");

  } catch(e) {
    error.textContent = e.message;
  }
}


/* =====================================================
   LOGIN ADMIN
===================================================== */

async function loginA() {
  var password = $("adminPassword").value;
  var error = $("adminError");

  error.textContent = "";

  if (!password) {
    error.textContent = "Masukkan password admin.";
    return;
  }

  try {
    await api("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password: password
      })
    });

    user = {
      role: "admin",
      nama: "Admin"
    };

    tab = "harian";

    await syncReports();

    screen = "app";
    go("app");

  } catch(e) {
    error.textContent = e.message;
  }
}


/* =====================================================
   RESTORE SESSION
===================================================== */

async function restoreSession() {
  try {
    var result = await api("/api/session");

    if (result.authenticated) {

      if (result.role === "admin") {
        user = {
          role: "admin",
          nama: "Admin"
        };

      } else if (result.role === "mahasiswa") {
        user = {
          role: "mhs",
          nama: result.nama,
          nim: result.nim
        };
      }

      screen = "app";

      await syncReports(false);

    } else {
      user = null;
      screen = "qr";
    }

  } catch(e) {
    user = null;
    screen = "qr";
    console.error(e);
  }

  render();
}


/* =====================================================
   LOGOUT
===================================================== */

async function logout() {
  try {
    await api("/api/logout", {
      method: "POST"
    });
  } catch(e) {
    console.error(e);
  }

  user = null;
  S.laporan = [];

  screen = "qr";

  render();

  toast("Kamu berhasil keluar.");
}


/* =====================================================
   NAVIGASI
===================================================== */

function go(s) {
  screen = s;
  render();
  window.scrollTo(0, 0);
}


/* =====================================================
   HALAMAN UTAMA
===================================================== */

function qr() {
  var n = 21;
  var seedv = 11;
  var out = "";

  function rnd() {
    seedv = (seedv * 16807) % 2147483647;
    return seedv % 100 < 46;
  }

  function fin(x, y) {
    return (x < 7 && y < 7) ||
      (x > 13 && y < 7) ||
      (x < 7 && y > 13);
  }

  function on(x, y) {
    var lx = x > 13 ? x - 14 : x;
    var ly = y > 13 ? y - 14 : y;

    var m = Math.max(
      Math.abs(lx - 3),
      Math.abs(ly - 3)
    );

    return m == 3 || m <= 1;
  }

  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      var f = fin(x, y);

      if (f ? on(x, y) : rnd()) {
        out += '<rect x="' + x +
          '" y="' + y +
          '" width="1.02" height="1.02"/>';
      }
    }
  }

  return '<svg viewBox="0 0 21 21" fill="currentColor">' +
    out + '</svg>';
}


/* =====================================================
   VIEW LANDING
===================================================== */

function vQR() {
  return `
  <div class="landing">

    <section class="hero-panel">

      <div class="hero-copy">

        <span class="eyebrow hero-eyebrow">
          PORTAL ASPIRASI DIGITAL KAMPUS
        </span>

        <h1>
          Suaramu membantu kampus
          <em>jadi lebih baik.</em>
        </h1>

        <p class="hero-lead">
          Laporkan kerusakan fasilitas dengan mudah.
          Pantau tindak lanjutnya, dari laporan diterima
          hingga selesai.
        </p>

        <div class="hero-actions">
          <button class="pri hero-cta" onclick="go('login')">
            Buat laporan →
          </button>

          <span class="hero-note">
            Cepat · Terarah · Transparan
          </span>
        </div>

        <div class="hero-points">
          <div><b>01</b><span>Laporkan<br>kendala</span></div>
          <div><b>02</b><span>AI bantu<br>klasifikasi</span></div>
          <div><b>03</b><span>Pantau<br>progres</span></div>
        </div>

      </div>

      <div class="hero-visual">

        <div class="visual-glow"></div>

        <div class="visual-card">

          <div class="visual-top">
            <span class="visual-dot"></span>
            <span>SUARA KAMPUS</span>
            <span class="live-pill">● ONLINE</span>
          </div>

          <div class="visual-icon">✳️</div>

          <h3>
            Fasilitas lebih baik,
            <br>aktivitas lebih nyaman.
          </h3>

          <p>
            Saluran resmi untuk menyampaikan kendala
            fasilitas kampus.
          </p>

          <div class="visual-divider"></div>

          <div class="visual-foot">
            <span>✦ Klasifikasi berbasis AI</span>
            <span>✓ Pantau status laporan</span>
          </div>

        </div>

      </div>

    </section>

    <section class="landing-bottom">

      <div>
        <span class="eyebrow">MULAI DARI SINI</span>
        <h2>Ada fasilitas yang perlu diperbaiki?</h2>
        <p class="mut">
          Masuk menggunakan nama dan NIM untuk mengirim laporan.
        </p>
      </div>

      <button class="secondary-cta" onclick="go('login')">
        Masuk ke portal ↗️
      </button>

    </section>

    <p class="demo-disclaimer">
      Portal aspirasi fasilitas kampus.
    </p>

  </div>`;
}


/* =====================================================
   VIEW LOGIN
===================================================== */

function vLogin() {
  return `
  <div class="login-layout">

    <section class="login-aside">

      <span class="eyebrow hero-eyebrow">SUARA KAMPUS</span>

      <div class="login-symbol">✳️</div>

      <h2>
        Satu laporan kecil,
        perubahan yang berarti.
      </h2>

      <p>
        Gunakan portal ini untuk menyampaikan kendala
        fasilitas kampus dan memantau perkembangannya.
      </p>

      <div class="login-aside-foot">
        PORTAL ASPIRASI FASILITAS KAMPUS
      </div>

    </section>

    <section class="card login-card">

      <span class="eyebrow">SELAMAT DATANG</span>

      <h2>Masuk ke portal</h2>

      <p class="mut">
        Pilih jenis akses untuk melanjutkan.
      </p>

      <h3>Login Mahasiswa</h3>

      <label for="nm">Nama lengkap</label>

      <input id="nm"
        autocomplete="name"
        placeholder="Contoh: Budi Santoso">

      <label for="nim">Nomor Induk Mahasiswa</label>

      <input id="nim"
        inputmode="numeric"
        placeholder="Masukkan NIM">

      <p class="err" id="le"></p>

      <button class="pri" onclick="loginM()">
        Masuk sebagai mahasiswa →
      </button>

      <div class="visual-divider"></div>

      <h3>Login Admin</h3>

      <label for="adminPassword">Password Admin</label>

      <input id="adminPassword"
        type="password"
        autocomplete="current-password"
        placeholder="Masukkan password admin">

      <p class="err" id="adminError"></p>

      <button class="pri" onclick="loginA()">
        Masuk sebagai admin →
      </button>

      <button class="back-link" onclick="go('qr')">
        ← Kembali ke halaman utama
      </button>

    </section>

  </div>`;
}


/* =====================================================
   STATUS LAPORAN
===================================================== */

function stepsOf(status) {
  var i = [
    "Diterima",
    "Diproses",
    "Selesai"
  ].indexOf(status);

  return `
    <div class="steps" aria-hidden="true">
      <i class="f"></i>
      <i class="${i >= 1 ? "f" : ""}"></i>
      <i class="${i >= 2 ? "f" : ""}"></i>
    </div>`;
}


/* =====================================================
   KIRIM PENGADUAN
===================================================== */

async function sendL(e) {
  e.preventDefault();

  var j = $("jd").value.trim();
  var i = $("is").value.trim();
  var lokasi = $("lk").value.trim();

  if (!j || i.length < 10 || !lokasi) {
    $("fe").textContent =
      "Isi judul, lokasi, dan uraian minimal 10 karakter.";

    return false;
  }

  if (/nilai|dosen|beasiswa|\bkrs\b|\bukt\b|administrasi/i.test(j + " " + i)) {
    $("fe").textContent =
      "Form ini hanya untuk fasilitas kampus.";

    return false;
  }

  try {
    await api("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        kategori: $("kt").value,
        judul: j,
        isi: i,
        lokasi: lokasi
      })
    });

    await syncReports();

    toast("Laporan berhasil disimpan.");

    render();

  } catch(error) {
    $("fe").textContent = error.message;
  }

  return false;
}


/* =====================================================
   VIEW MAHASISWA
===================================================== */

function vMhs() {
  var mine = S.laporan
    .filter(function(l) {
      return l.nim == user.nim;
    })
    .reverse();

  var total = mine.length;

  var done = mine.filter(function(l) {
    return l.status == "Selesai";
  }).length;

  var progress = mine.filter(function(l) {
    return l.status == "Diproses";
  }).length;

  var h = `
  <section class="welcome">

    <div>
      <span class="eyebrow">PORTAL ASPIRASI FASILITAS</span>
      <h2>Halo, ${esc(user.nama)}</h2>
      <p>
        Ceritakan kendala fasilitas kampus.
        Pantau perkembangannya sampai selesai.
      </p>
    </div>

    <div class="welcome-mark">SK</div>

  </section>`;

  h += `
  <div class="grid2 summary">

    <div class="stat">
      <span>Total laporan</span>
      <b>${total}</b>
    </div>

    <div class="stat">
      <span>Sedang diproses</span>
      <b>${progress}</b>
    </div>

    <div class="stat">
      <span>Selesai</span>
      <b>${done}</b>
    </div>

    <div class="stat">
      <span>Menunggu</span>
      <b>${total - progress - done}</b>
    </div>

  </div>`;

  h += `
  <form class="card report-form" onsubmit="return sendL(event)">

    <div class="section-head">
      <div>
        <span class="eyebrow">FORM PENGADUAN</span>
        <h3>Laporkan fasilitas</h3>
      </div>

      <span class="step-tag">01 / 01</span>
    </div>

    <p class="mut">
      Form ini khusus untuk fasilitas kampus.
    </p>

    <label for="kt">Jenis fasilitas</label>

    <select id="kt">
      ${KAT.map(function(k) {
        return "<option>" + esc(k) + "</option>";
      }).join("")}
    </select>

    <label for="jd">Judul</label>

    <input id="jd"
      maxlength="100"
      placeholder="AC ruang B2 mati">

    <label for="is">Isi laporan</label>

    <textarea id="is"
      rows="4"
      placeholder="Apa yang rusak, sejak kapan, dan siapa yang terdampak?"></textarea>

    <label for="lk">Lokasi fasilitas</label>

    <input id="lk"
      placeholder="Gedung B, lantai 2">

    <p class="err" id="fe"></p>

    <div style="margin-top:14px">
      <button class="pri" type="submit">
        Kirim laporan
      </button>
    </div>

  </form>`;

  h += '<h3 style="margin:20px 0 10px">Status laporan Anda</h3>';

  if (!mine.length) {
    h += `
    <div class="card">
      <p class="mut">
        Belum ada laporan. Kirim laporan pertama Anda.
      </p>
    </div>`;
  }

  mine.forEach(function(l) {
    h += `
    <div class="card">

      <div class="top">
        <h3>${esc(l.judul)}</h3>
        <span class="bd ${esc(l.status)}">
          ${esc(l.status)}
        </span>
      </div>

      <p class="mut">
        ${esc(l.kategori)} · ${fmt(l.created)}
      </p>

      <p style="margin:8px 0 0;font-size:15px">
        ${esc(l.isi)}
      </p>

      <p class="mut">
        Lokasi: ${esc(l.lokasi)}
      </p>

      ${l.kategori_ai ? `
        <p class="ai-result">
          <b>Prediksi Naive Bayes:</b>
          ${esc(l.kategori_ai)}
          · Keyakinan ${Math.round((l.confidence_ai || 0) * 100)}%
        </p>
      ` : ""}

      ${stepsOf(l.status)}

    </div>`;
  });

  return h;
}


/* =====================================================
   VIEW ADMIN
===================================================== */

function vAdmin() {
  var h = `
  <h2>Dashboard admin</h2>

  <div class="seg" role="tablist">

    <button class="${tab == "harian" ? "on" : ""}"
      onclick="tab='harian';render()">
      Laporan harian
    </button>

    <button class="${tab == "prioritas" ? "on" : ""}"
      onclick="tab='prioritas';render()">
      Prioritas AI
    </button>

  </div>`;

  return h + (
    tab == "harian"
      ? vHarian()
      : vPrioritas()
  );
}


/* =====================================================
   EXPORT CSV
===================================================== */

function exportCSV() {
  var rows = [[
    "ID",
    "Tanggal",
    "Jam",
    "Nama",
    "NIM",
    "Kategori",
    "Judul",
    "Deskripsi",
    "Lokasi",
    "Status",
    "Kategori AI",
    "Keyakinan AI"
  ]];

  S.laporan.forEach(function(l) {
    rows.push([
      "LP-" + String(l.id).padStart(3, "0"),
      fmt(l.created),
      jam(l.created),
      l.nama,
      l.nim,
      l.kategori,
      l.judul,
      l.isi,
      l.lokasi,
      l.status,
      l.kategori_ai || "Belum dinilai",
      l.confidence_ai == null
        ? ""
        : Math.round(l.confidence_ai * 100) + "%"
    ]);
  });

  var csv = rows.map(function(r) {
    return r.map(function(v) {
      return '"' + String(v == null ? "" : v)
        .replace(/"/g, '""') + '"';
    }).join(",");
  }).join("\r\n");

  var blob = new Blob(
    ["\ufeff" + csv],
    {type: "text/csv;charset=utf-8"}
  );

  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");

  a.href = url;
  a.download = "data-pengaduan-suara-kampus.csv";

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  toast("Data laporan berhasil diekspor.");
}


/* =====================================================
   PENCARIAN
===================================================== */

function applySearch() {
  searchText = $("cariLaporan")
    ? $("cariLaporan").value.trim().toLowerCase()
    : "";

  categoryFilter = $("filterKategori")
    ? $("filterKategori").value
    : "Semua";

  statusFilter = $("filterStatus")
    ? $("filterStatus").value
    : "Semua";

  render();
}


/* =====================================================
   UPDATE STATUS ADMIN
===================================================== */

async function setStatus(id, value) {
  try {
    await api("/api/admin/reports/" + id + "/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: value
      })
    });

    await syncReports();

    toast("Status berhasil diperbarui.");

    render();

  } catch(e) {
    toast(e.message);

    await syncReports(false);
    render();
  }
}


/* =====================================================
   VIEW LAPORAN HARIAN
===================================================== */

function vHarian() {
  var today = ymd(new Date());

  var all = S.laporan.slice().reverse();

  var list = day
    ? all.filter(function(l) {
        return ymd(l.created) == day;
      })
    : all;

  list = list.filter(function(l) {
    var hay = (
      l.judul + " " +
      l.isi + " " +
      l.nama + " " +
      l.nim + " " +
      (l.lokasi || "")
    ).toLowerCase();

    return (
      (!searchText || hay.indexOf(searchText) >= 0) &&
      (categoryFilter == "Semua" || l.kategori == categoryFilter) &&
      (statusFilter == "Semua" || l.status == statusFilter)
    );
  });

  var h = `
  <div class="grid2">

    <div class="stat">
      Total laporan
      <b>${all.length}</b>
    </div>

    <div class="stat">
      Masuk hari ini
      <b>${all.filter(function(l) {
        return ymd(l.created) == today;
      }).length}</b>
    </div>

    <div class="stat">
      Sedang diproses
      <b>${all.filter(function(l) {
        return l.status == "Diproses";
      }).length}</b>
    </div>

    <div class="stat">
      Selesai
      <b>${all.filter(function(l) {
        return l.status == "Selesai";
      }).length}</b>
    </div>

  </div>`;

  h += `
  <div class="card" style="margin-top:12px">

    <h3>Temukan laporan</h3>

    <label for="cariLaporan">Kata kunci</label>

    <div class="row">

      <input id="cariLaporan"
        value="${esc(searchText)}"
        placeholder="Cari judul, nama, NIM, atau lokasi..."
        style="flex:1;min-width:180px">

      <button class="pri" onclick="applySearch()">
        Cari
      </button>

      <button onclick="searchText='';categoryFilter='Semua';statusFilter='Semua';render()">
        Reset
      </button>

    </div>

    <div class="grid2">

      <div>
        <label for="filterKategori">Kategori</label>

        <select id="filterKategori"
          onchange="applySearch()">

          <option>Semua</option>

          ${KAT.map(function(k) {
            return `
            <option ${categoryFilter == k ? "selected" : ""}>
              ${esc(k)}
            </option>`;
          }).join("")}

        </select>
      </div>

      <div>
        <label for="filterStatus">Status</label>

        <select id="filterStatus"
          onchange="applySearch()">

          ${["Semua", "Diterima", "Diproses", "Selesai"].map(function(k) {
            return `
            <option ${statusFilter == k ? "selected" : ""}>
              ${k}
            </option>`;
          }).join("")}

        </select>
      </div>

    </div>

    <button style="margin-top:12px" onclick="exportCSV()">
      Ekspor data CSV
    </button>

  </div>`;

  h += `
  <div class="row" style="margin:14px 0">

    <button class="chip ${day == today ? "on" : ""}"
      onclick="day='${today}';render()">
      Hari ini
    </button>

    <button class="chip ${day == "" ? "on" : ""}"
      onclick="day='';render()">
      Semua
    </button>

    <input type="date"
      value="${esc(day)}"
      onchange="day=this.value;render()"
      style="width:auto">

  </div>

  <p class="mut" style="margin-bottom:10px">
    Data laporan mahasiswa dari database server.
  </p>`;

  if (!list.length) {
    h += `
    <div class="card">
      <p class="mut">
        Tidak ada laporan pada filter ini.
      </p>
    </div>`;
  }

  list.forEach(function(l) {
    h += `
    <div class="card">

      <div class="top">

        <h3>${esc(l.judul)}</h3>

        <span class="bd ${esc(l.status)}">
          ${esc(l.status)}
        </span>

      </div>

      <p class="mut">
        LP-${String(l.id).padStart(3, "0")}
        · ${esc(l.kategori)}
        · ${esc(l.nama)}
        (${esc(l.nim)})
        · ${fmt(l.created)}, ${jam(l.created)}
      </p>

      <p style="margin:8px 0 12px;font-size:15px">
        ${esc(l.isi)}
      </p>

      <p class="mut">
        Lokasi: ${esc(l.lokasi)}
      </p>

      ${l.kategori_ai ? `
        <p class="mut">
          Prediksi kategori Naive Bayes:
          <b>${esc(l.kategori_ai)}</b>
          · Keyakinan ${Math.round((l.confidence_ai || 0) * 100)}%
        </p>
      ` : `
        <p class="mut">
          Prediksi kategori AI belum tersedia.
        </p>
      `}

      <div class="row">

        <label for="s${l.id}" style="margin:0">
          Status
        </label>

        <select class="sm"
          id="s${l.id}"
          onchange="setStatus(${l.id},this.value)">

          ${["Diterima", "Diproses", "Selesai"].map(function(s) {
            return `
            <option ${s == l.status ? "selected" : ""}>
              ${s}
            </option>`;
          }).join("")}

        </select>

      </div>

    </div>`;
  });

  return h;
}


/* =====================================================
   PRIORITAS AI
   Penilaian prioritas masih menggunakan aturan sederhana.
===================================================== */

function score(l, batch) {
  var t = (l.judul + " " + l.isi).toLowerCase();

  var sc = 0;
  var why = [];

  if (/listrik|kabel|kebakaran|bahaya|rawan|pelecehan|kekerasan|korban|licin/.test(t)) {
    sc += 40;
    why.push("ada risiko keselamatan");
  }

  if (/kuliah|praktikum|ujian|kelas/.test(t)) {
    sc += 25;
    why.push("mengganggu kegiatan belajar");
  }

  if (/semua|banyak|seluruh|setiap/.test(t)) {
    sc += 15;
    why.push("berdampak ke banyak orang");
  }

  if (l.kategori == "Parkiran & penerangan") {
    sc += 20;
    why.push("area umum rawan");
  }

  var age = Math.min(
    20,
    Math.floor(
      (Date.now() - new Date(l.created)) / 864e5
    ) * 2
  );

  if (age >= 6) {
    sc += age;
    why.push("sudah menunggu lama");
  }

  var sim = batch.filter(function(x) {
    return x.kategori == l.kategori && x.id != l.id;
  }).length;

  if (sim > 0) {
    sc += Math.min(15, sim * 5);
    why.push(sim + " laporan serupa");
  }

  return {
    skor: sc,
    prioritas: sc >= 60
      ? "Tinggi"
      : sc >= 30
        ? "Sedang"
        : "Rendah",
    alasan: why.length
      ? why.join(", ")
      : "bersifat saran atau tidak mendesak"
  };
}


function runAI(fn, quiet) {
  var p = S.laporan.filter(function(l) {
    return !S.ai.some(function(a) {
      return a.laporan_id == l.id;
    }) && (!fn || fn(l));
  });

  if (!p.length) {
    if (!quiet) toast("Tidak ada laporan baru.");
    return;
  }

  var b = {
    id: S.batch.length + 1,
    mulai: ymd(p[0].created),
    selesai: ymd(new Date()),
    at: new Date().toISOString(),
    jumlah: p.length
  };

  S.batch.push(b);

  p.forEach(function(l) {
    var r = score(l, p);

    S.ai.push({
      laporan_id: l.id,
      batch_id: b.id,
      prioritas: r.prioritas,
      skor: r.skor,
      alasan: r.alasan
    });
  });

  save();

  if (!quiet) {
    toast(p.length + " laporan diurutkan AI.");
    render();
  }
}


function aiOf(id) {
  var a = S.ai.filter(function(x) {
    return x.laporan_id == id;
  });

  return a[a.length - 1];
}

function korOf(id) {
  var a = S.koreksi.filter(function(x) {
    return x.laporan_id == id;
  });

  return a[a.length - 1];
}

function finalOf(id) {
  var k = korOf(id);
  return k ? k.prioritas : null;
}

function setPri(id, value) {
  if (!value || finalOf(id) == value) return;

  S.koreksi.push({
    laporan_id: id,
    admin: user.nama,
    prioritas: value,
    at: new Date().toISOString()
  });

  save();

  toast("Penilaian prioritas disimpan.");
  render();
}


/* =====================================================
   EVALUASI MODEL
===================================================== */

async function evaluateModel() {
  var el = $("modelEval");

  if (!el) return;

  el.textContent = "Mengambil hasil evaluasi...";

  try {
    var d = await api("/api/evaluate");

    var matrix = `
      <h4 style="margin:12px 0 6px">
        Confusion matrix
      </h4>

      <div style="overflow-x:auto">

        <table class="table">

          <thead>
            <tr>
              <th>Aktual \\ Prediksi</th>

              ${d.labels.map(function(x) {
                return "<th>" + esc(x) + "</th>";
              }).join("")}

            </tr>
          </thead>

          <tbody>

            ${d.confusion_matrix.map(function(row, i) {
              return `
                <tr>
                  <th>${esc(d.labels[i])}</th>

                  ${row.map(function(v) {
                    return "<td>" + v + "</td>";
                  }).join("")}

                </tr>`;
            }).join("")}

          </tbody>

        </table>

      </div>`;

    el.innerHTML = `

      <div class="grid2" style="margin-top:10px">

        <div class="stat">
          Akurasi
          <b>${Math.round(d.accuracy * 100)}%</b>
        </div>

        <div class="stat">
          Precision macro
          <b>${Math.round(d.macro_precision * 100)}%</b>
        </div>

        <div class="stat">
          Recall macro
          <b>${Math.round(d.macro_recall * 100)}%</b>
        </div>

        <div class="stat">
          F1-score macro
          <b>${Math.round(d.macro_f1 * 100)}%</b>
        </div>

      </div>

      <p class="mut" style="margin-top:8px">
        Data: ${d.dataset_size}
        · Latih: ${d.train_size}
        · Uji: ${d.test_size}
        · Fitur: ${esc(d.features)}
      </p>

      ${matrix}

      <p class="mut">${esc(d.note)}</p>

    `;

  } catch(e) {
    el.textContent = e.message;
  }
}


/* =====================================================
   VIEW PRIORITAS AI
===================================================== */

function vPrioritas() {
  var lb = S.batch[S.batch.length - 1];

  var items = S.laporan.filter(function(l) {
    return !!aiOf(l.id);
  });

  var pend = S.laporan.length - items.length;

  var cnt = {
    Tinggi: 0,
    Sedang: 0,
    Rendah: 0,
    Belum: 0
  };

  items.forEach(function(l) {
    cnt[finalOf(l.id) || "Belum"]++;
  });

  var h = `
  <div class="card">

    <div class="top">

      <div>
        <h3>Model klasifikasi kategori</h3>
        <p class="mut">
          Multinomial Naive Bayes + TF-IDF
        </p>
      </div>

      <span class="bd Diproses">
        Machine Learning
      </span>

    </div>

    <p class="mut">
      Model memprediksi kategori fasilitas dari teks laporan.
      Evaluasi dilakukan pada data uji.
    </p>

    <button class="pri" onclick="evaluateModel()">
      Evaluasi model ML
    </button>

    <div id="modelEval" class="mut"
      style="margin-top:10px"></div>

  </div>`;

  if (lb) {
    h += `
    <div class="card">

      <h3>
        Batch ${lb.id}
      </h3>

      <p class="mut">
        Diproses ${fmt(lb.at)}.
        Jumlah laporan: ${lb.jumlah}.
      </p>

    </div>`;
  } else {
    h += `
    <div class="card">
      <p class="mut">
        Belum ada siklus AI.
      </p>
    </div>`;
  }

  h += `
  <div class="grid2">

    <div class="stat">
      Dinilai Tinggi
      <b>${cnt.Tinggi}</b>
    </div>

    <div class="stat">
      Dinilai Sedang
      <b>${cnt.Sedang}</b>
    </div>

    <div class="stat">
      Dinilai Rendah
      <b>${cnt.Rendah}</b>
    </div>

    <div class="stat">
      Belum dinilai admin
      <b>${cnt.Belum}</b>
    </div>

  </div>`;

  if (pend) {
    h += `
    <p class="mut" style="margin-top:10px">
      ${pend} laporan baru menunggu siklus AI.
    </p>`;
  }

  h += `
  <div class="row" style="margin:14px 0">

    ${[
      ["Semua", "Semua"],
      ["Belum", "Belum dinilai"],
      ["Tinggi", "Tinggi"],
      ["Sedang", "Sedang"],
      ["Rendah", "Rendah"]
    ].map(function(f) {
      return `
      <button class="chip ${flt == f[0] ? "on" : ""}"
        onclick="flt='${f[0]}';render()">
        ${f[1]}
      </button>`;
    }).join("")}

    <span style="flex:1"></span>

    <button class="pri" onclick="runAI()">
      Jalankan siklus AI
    </button>

  </div>`;

  var list = items.filter(function(l) {
    var f = finalOf(l.id);

    return flt == "Semua" ||
      (flt == "Belum" ? !f : f == flt);

  }).sort(function(a, b) {
    var ra = finalOf(a.id) ? 1 : 0;
    var rb = finalOf(b.id) ? 1 : 0;

    return ra - rb ||
      aiOf(b.id).skor - aiOf(a.id).skor;
  });

  if (!list.length) {
    h += `
    <div class="card">
      <p class="mut">
        Tidak ada laporan pada kategori ini.
      </p>
    </div>`;
  }

  list.forEach(function(l) {
    var a = aiOf(l.id);
    var f = finalOf(l.id);

    h += `
    <div class="card">

      <div class="top">

        <h3>${esc(l.judul)}</h3>

        ${f
          ? <span class="bd ${f}">Admin: ${f}</span>
          : <span class="bd none">Belum dinilai admin</span>
        }

      </div>

      <p class="mut">
        LP-${String(l.id).padStart(3, "0")}
        · ${esc(l.kategori)}
        · ${esc(l.status)}
      </p>

      <p style="margin:8px 0 6px;font-size:15px">
        ${esc(l.isi)}
      </p>

      <p class="mut">
        Saran AI:
        <span class="bd ${a.prioritas}">
          ${a.prioritas}
        </span>
        ${esc(a.alasan)}
        (skor ${a.skor})
      </p>

      ${f && f != a.prioritas
        ? `<p class="mut">
             Admin memutuskan berbeda dari saran AI.
           </p>`
        : ""
      }

      <div class="row" style="margin-top:10px">

        ${f ? "" : `
          <button class="pri"
            onclick="setPri(${l.id},'${a.prioritas}')">
            Setujui saran: ${a.prioritas}
          </button>
        `}

        <label for="p${l.id}" style="margin:0">
          ${f ? "Ubah penilaian" : "Atau pilih sendiri"}
        </label>

        <select class="sm"
          id="p${l.id}"
          onchange="setPri(${l.id},this.value)">

          ${f ? "" : `
            <option value="" disabled selected>
              Pilih
            </option>
          `}

          ${["Tinggi", "Sedang", "Rendah"].map(function(q) {
            return `
            <option ${q == f ? "selected" : ""}>
              ${q}
            </option>`;
          }).join("")}

        </select>

      </div>

    </div>`;
  });

  h += `
  <p class="mut" style="margin-top:8px">
    Klasifikasi kategori menggunakan Multinomial Naive Bayes.
    Skor prioritas masih menggunakan aturan sederhana.
    Admin tetap menentukan penanganan akhir.
  </p>`;

  return h;
}


/* =====================================================
   RENDER UTAMA
===================================================== */

function render() {
  if (!$("app") || !$("who")) return;

  if (screen == "app" && !user) {
    screen = "qr";
  }

  $("who").innerHTML = user
    ? '<span class="mut" style="margin-right:8px">' +
      esc(user.nama) +
      '</span><button class="chip" onclick="logout()">Keluar</button>'
    : "";

  if (screen == "qr") {
    $("app").innerHTML = vQR();

  } else if (screen == "login") {
    $("app").innerHTML = vLogin();

  } else if (user && user.role == "admin") {
    $("app").innerHTML = vAdmin();

  } else if (user && user.role == "mhs") {
    $("app").innerHTML = vMhs();

  } else {
    $("app").innerHTML = vQR();
  }
}


/* =====================================================
   INISIALISASI
===================================================== */

loadLocalState();

function loadLocalState() {
  try {
    var old = JSON.parse(
      localStorage.getItem(KEY)
    );

    if (old) {
      S.batch = old.batch || [];
      S.ai = old.ai || [];
      S.koreksi = old.koreksi || [];
      S.log = old.log || [];
    }

  } catch(e) {
    console.warn("Data lokal tidak dapat dibaca.");
  }
}

restoreSession();
