// ====== Referencias DOM ======
const appsGrid = document.getElementById("appsGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const chips = document.querySelectorAll(".chip");
document.getElementById("year").textContent = new Date().getFullYear();

// Overlay detalle
const overlay = document.getElementById("detailOverlay");
const overlayBackdrop = document.getElementById("detailBackdrop");
const detailIcon = document.getElementById("detailIcon");
const detailName = document.getElementById("detailName");
const detailCategory = document.getElementById("detailCategory");
const detailSize = document.getElementById("detailSize");
const detailInternet = document.getElementById("detailInternet");
const detailStats = document.getElementById("detailStats");
const detailDesc = document.getElementById("detailDesc");
const detailScreens = document.getElementById("detailScreens");
const installBtn = document.getElementById("installBtn");
const likeBtn = document.getElementById("likeBtn");
const starsRow = document.getElementById("starsRow");
const ratingLabel = document.getElementById("ratingLabel");
const ratingBig = document.getElementById("ratingBig");
const ratingTotal = document.getElementById("ratingTotal");

let allApps = [];
let currentCat = "all";
let currentApp = null;

// ====== LocalStorage para votos anónimos ======
const VOTES_KEY = "appsmart_votes";

function getVotes() {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function saveVotes(v) {
  localStorage.setItem(VOTES_KEY, JSON.stringify(v));
}

// ====== Cargar apps desde Firestore ======
db.collection("apps").orderBy("fecha", "desc").onSnapshot(
  snap => {
    allApps = snap.docs.map(d => {
      const data = d.data();
      data.id = d.id; // por si no lo guardaste dentro
      return data;
    });
    renderApps();
  },
  err => {
    console.error(err);
    emptyState.style.display = "block";
    emptyState.textContent = "Error cargando apps. Intenta más tarde.";
  }
);

// ====== Render lista ======
function renderApps() {
  const q = (searchInput.value || "").toLowerCase();
  appsGrid.innerHTML = "";

  let list = allApps;

  if (currentCat !== "all") {
    list = list.filter(a => a.categoria === currentCat);
  }

  if (q) {
    list = list.filter(
      a =>
        (a.nombre || "").toLowerCase().includes(q) ||
        (a.descripcion || "").toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  const votes = getVotes();

  list.forEach(app => {
    const card = document.createElement("article");
    card.className = "play-card";

    const myVote = votes[app.id] || {};
    const ratingAvg = app.ratingAvg || 0;
    const ratingCount = app.ratingCount || 0;
    const likes = app.likes || 0;
    const descargas = app.descargas || 0;

    const size = app.size && app.size.length > 0 ? app.size : "—";

    const internet =
      app.internet === "offline" ? "📴 Sin Internet" : "🌐 Con Internet";

    const starsText = ratingCount
      ? `⭐ ${ratingAvg.toFixed(1)} (${ratingCount})`
      : "⭐ Sin valoraciones";

    card.innerHTML = `
      <img class="play-icon" src="${app.imagen}" alt="${app.nombre}">
      <div class="play-info">
        <h3 class="play-name">${app.nombre}</h3>
        <p class="play-line1">${internet}</p>
        <p class="play-line2">
          ${starsText} • ❤️ ${likes} • ${size} • ${descargas} descargas
        </p>
      </div>
    `;

    card.addEventListener("click", () => openDetails(app));

    appsGrid.appendChild(card);
  });
}

// ====== Eventos ======
searchInput.addEventListener("input", renderApps);

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelector(".chip.active").classList.remove("active");
    chip.classList.add("active");
    currentCat = chip.dataset.cat;
    renderApps();
  });
});

// ====== Detalle tipo Play Store ======
function openDetails(app) {
  currentApp = app;

  const votes = getVotes();
  const myVote = votes[app.id] || {};

  overlay.classList.remove("hidden");

  detailIcon.src = app.imagen;
  detailName.textContent = app.nombre;
  detailCategory.textContent = app.categoria || "";

  detailSize.textContent =
    app.size && app.size.length > 0
      ? `📦 Tamaño: ${app.size}`
      : "📦 Tamaño: —";

  detailInternet.textContent =
    app.internet === "offline"
      ? "📴 Funciona sin Internet"
      : "🌐 Requiere Internet";

  detailDesc.textContent = app.descripcion || "";

  const ratingAvg = app.ratingAvg || 0;
  const ratingCount = app.ratingCount || 0;

  ratingLabel.textContent = ratingCount
    ? `Valoración: ${ratingAvg.toFixed(1)} (${ratingCount} votos)`
    : "Sin valoraciones todavía";

  detailStats.textContent = `Descargas: ${
    app.descargas || 0
  } • Likes: ${app.likes || 0}`;

  // ===== GRAFICO ESTRELLAS (resumen tipo Play Store) =====
  let breakdown = app.starsBreakdown || {1:0,2:0,3:0,4:0,5:0};
  let total = Object.values(breakdown).reduce((a,b)=>a+b,0);

  // Si no hay breakdown pero sí ratingCount, asume todo en 5★ como fallback
  if (!total && ratingCount) {
    breakdown = {1:0,2:0,3:0,4:0,5:ratingCount};
    total = ratingCount;
  }

  if (ratingBig) {
    ratingBig.textContent = ratingAvg.toFixed(1);
  }
  if (ratingTotal) {
    ratingTotal.textContent =
      (total || 0).toLocaleString("es-ES") + " reseñas";
  }

  function setBar(star) {
    const value = breakdown[star] || 0;
    const percent = total ? (value / total) * 100 : 0;
    const el = document.getElementById(`bar${star}`);
    if (el) el.style.width = percent + "%";
  }

  [5,4,3,2,1].forEach(setBar);

  // ===== CAPTURAS DESDE GITHUB (si no hay imgSecundarias en Firestore) =====
  detailScreens.innerHTML = "";

  if (Array.isArray(app.imgSecundarias) && app.imgSecundarias.length) {
    app.imgSecundarias.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      detailScreens.appendChild(img);
    });
  } else {
    const capturas = [
      "https://raw.githubusercontent.com/Eler3096/eler3096.github.io/main/Screenshot_1_Universal%20Bible.jpg",
      "https://raw.githubusercontent.com/Eler3096/eler3096.github.io/main/Screenshot_2_Universal%20Bible.jpg",
      "https://raw.githubusercontent.com/Eler3096/eler3096.github.io/main/Screenshot_3_Universal%20Bible.jpg",
      "https://raw.githubusercontent.com/Eler3096/eler3096.github.io/main/Screenshot_4_Universal%20Bible.jpg",
      "https://raw.githubusercontent.com/Eler3096/eler3096.github.io/main/Screenshot_5_Universal%20Bible.jpg",
      "https://raw.githubusercontent.com/Eler3096/eler3096.github.io/main/Screenshot_6_Universal%20Bible.jpg"
    ];

    capturas.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.loading = "lazy";
      detailScreens.appendChild(img);
    });
  }

  installBtn.onclick = () => {
    if (app.apk) {
      db.collection("apps")
        .doc(app.id)
        .update({
          descargas: firebase.firestore.FieldValue.increment(1)
        })
        .catch(console.error);

      window.open(app.apk, "_blank");
    }
  };

  likeBtn.textContent = myVote.liked ? "❤️ Ya te gusta" : "❤️ Me gusta";
  likeBtn.disabled = !!myVote.liked;

  likeBtn.onclick = () => handleLike(app);

  renderStars(app, myVote.stars || 0);
}

function closeDetails() {
  overlay.classList.add("hidden");
}

overlayBackdrop.addEventListener("click", closeDetails);
document.getElementById("detailClose").addEventListener("click", closeDetails);

// ====== Likes ======
function handleLike(app) {
  const votes = getVotes();
  const myVote = votes[app.id] || {};

  if (myVote.liked) return;

  db.collection("apps")
    .doc(app.id)
    .update({
      likes: firebase.firestore.FieldValue.increment(1)
    })
    .then(() => {
      myVote.liked = true;
      votes[app.id] = myVote;
      saveVotes(votes);

      currentApp.likes = (currentApp.likes || 0) + 1;

      detailStats.textContent = `Descargas: ${
        currentApp.descargas || 0
      } • Likes: ${currentApp.likes}`;

      likeBtn.textContent = "❤️ Ya te gusta";
      likeBtn.disabled = true;

      renderApps();
    })
    .catch(console.error);
}

// ====== Estrellas ======
function renderStars(app, myStars) {
  starsRow.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.className = "star-btn";
    btn.textContent = i <= myStars ? "★" : "☆";
    btn.disabled = myStars > 0;

    btn.addEventListener("click", () => handleStarClick(app, i));

    starsRow.appendChild(btn);
  }
}

function handleStarClick(app, stars) {
  const votes = getVotes();
  const myVote = votes[app.id] || {};

  if (myVote.stars) return;

  const prevAvg = app.ratingAvg || 0;
  const prevCount = app.ratingCount || 0;

  const newCount = prevCount + 1;
  const newAvg = (prevAvg * prevCount + stars) / newCount;

  const breakdown = app.starsBreakdown || {1:0,2:0,3:0,4:0,5:0};
  breakdown[stars] = (breakdown[stars] || 0) + 1;

  db.collection("apps")
    .doc(app.id)
    .update({
      ratingAvg: newAvg,
      ratingCount: newCount,
      starsBreakdown: breakdown
    })
    .then(() => {
      myVote.stars = stars;
      votes[app.id] = myVote;
      saveVotes(votes);

      currentApp.ratingAvg = newAvg;
      currentApp.ratingCount = newCount;
      currentApp.starsBreakdown = breakdown;

      ratingLabel.textContent = `Valoración: ${newAvg.toFixed(
        1
      )} (${newCount} votos)`;

      renderStars(app, stars);
      renderApps();
      openDetails(currentApp); // refresca gráfico y datos
    })
    .catch(console.error);
}
