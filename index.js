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
const reviewsList = document.getElementById("reviewsList");
const sendReviewBtn = document.getElementById("sendReviewBtn");
const reviewText = document.getElementById("reviewText");
const reviewStarsContainer = document.getElementById("reviewStars");

// Info de la app (bloque extra)
const infoIdioma = document.getElementById("infoIdioma");
const infoVersion = document.getElementById("infoVersion");
const infoTipo = document.getElementById("infoTipo");
const infoSO = document.getElementById("infoSO");
const infoReq = document.getElementById("infoReq");
const infoFechaAct = document.getElementById("infoFechaAct");
const infoEdad = document.getElementById("infoEdad");
const infoAnuncios = document.getElementById("infoAnuncios");
const infoPrivacidad = document.getElementById("infoPrivacidad");
const infoTamañoApk = document.getElementById("infoTamañoApk");
const infoDescargas = document.getElementById("infoDescargas");
const shareBtn = document.getElementById("shareBtn");

let allApps = [];
let currentCat = "all";
let currentApp = null;
let reviewStarsSelected = 0;

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
      data.id = d.id;
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

  let list = [...allApps];

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

  list.sort((a, b) => {
    const ra = a.ratingAvg || 0;
    const rb = b.ratingAvg || 0;
    if (rb !== ra) return rb - ra;
    const ca = a.ratingCount || 0;
    const cb = b.ratingCount || 0;
    return cb - ca;
  });

  if (!list.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  const votes = getVotes();

  list.forEach(app => {
    const card = document.createElement("article");
    card.className = "play-card";

    const ratingAvg = app.ratingAvg || 0;
    const ratingCount = app.ratingCount || 0;
    const likes = app.likes || 0;
    const descargas = app.descargasReales ?? app.descargas ?? 0;
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
    const active = document.querySelector(".chip.active");
    if (active) active.classList.remove("active");
    chip.classList.add("active");
    currentCat = chip.dataset.cat;
    renderApps();
  });
});

// ====== Detalle ======
function openDetails(app) {
  currentApp = app;

  overlay.classList.remove("hidden");

  detailIcon.src = app.imagen;
  detailName.textContent = app.nombre;
  detailCategory.textContent = app.categoria || "";

  detailSize.textContent =
    app.size && app.size.length > 0 ? `📦 Tamaño: ${app.size}` : "📦 Tamaño: —";

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

  const descReal = app.descargasReales ?? app.descargas ?? 0;
  detailStats.textContent = `Descargas: ${descReal.toLocaleString(
    "es-ES"
  )} • Likes: ${(app.likes || 0).toLocaleString("es-ES")}`;

  // ===== GRAFICO =====
  let breakdown = app.starsBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  if (!total && ratingCount) {
    breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: ratingCount };
    total = ratingCount;
  }

  ratingBig.textContent = ratingAvg.toFixed(1);
  ratingTotal.textContent = `${total} reseñas`;

  [5, 4, 3, 2, 1].forEach(star => {
    const percent = total ? (breakdown[star] / total) * 100 : 0;
    const el = document.getElementById(`bar${star}`);
    if (el) el.style.width = percent + "%";
  });

  // ================================
  // ⚠️ CORRECCIÓN: DATOS QUE SALÍAN "—"
  // ================================

  function fix(v) {
    return v && String(v).trim() !== "" ? v : "—";
  }

  infoIdioma.textContent = fix(app.idioma);
  infoVersion.textContent = fix(app.version);
  infoTipo.textContent = fix(app.tipo);
  infoSO.textContent = fix(app.sistemaOperativo);
  infoReq.textContent = fix(app.requisitos);
  infoEdad.textContent = fix(app.edad);

  let anunciosTexto = "—";
  if (app.anuncios === "si") anunciosTexto = "Sí";
  if (app.anuncios === "no") anunciosTexto = "No";
  infoAnuncios.textContent = anunciosTexto;

  const ts = app.fechaActualizacion || app.fecha;
  infoFechaAct.textContent = ts ? new Date(ts).toLocaleDateString("es-ES") : "—";

  infoTamañoApk.textContent = fix(app.size);
  infoDescargas.textContent = descReal.toLocaleString("es-ES");

  if (app.privacidadUrl && app.privacidadUrl.trim() !== "") {
    infoPrivacidad.href = app.privacidadUrl;
    infoPrivacidad.textContent = "Ver";
  } else {
    infoPrivacidad.removeAttribute("href");
    infoPrivacidad.textContent = "No disponible";
  }

  // ===== CAPTURAS =====
  detailScreens.innerHTML = "";

  if (Array.isArray(app.imgSecundarias) && app.imgSecundarias.length) {
    app.imgSecundarias.forEach(url => {
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

  // Likes
  const votes = getVotes();
  const myVote = votes[app.id] || {};

  likeBtn.textContent = myVote.liked ? "❤️ Ya te gusta" : "❤️ Me gusta";
  likeBtn.disabled = !!myVote.liked;
  likeBtn.onclick = () => handleLike(app);

  renderStars(app, myVote.stars || 0);

  renderReviewStars();
  reviewText.value = "";
  reviewStarsSelected = 0;
  loadReviews(app.id);

  sendReviewBtn.onclick = handleSendReview;
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

      likeBtn.textContent = "❤️ Ya te gusta";
      likeBtn.disabled = true;

      renderApps();
    });
}

// ====== Estrellas rápidas ======
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

  const breakdown = app.starsBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
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

      renderApps();
      openDetails(currentApp);
    });
}

// ====== Reseñas ======
function renderReviewStars() {
  reviewStarsContainer.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.textContent = "☆";
    btn.className = "star-btn";
    btn.onclick = () => setReviewStars(i);
    reviewStarsContainer.appendChild(btn);
  }
}

function setReviewStars(n) {
  reviewStarsSelected = n;
  const btns = reviewStarsContainer.querySelectorAll(".star-btn");
  btns.forEach((b, i) => {
    b.textContent = i < n ? "★" : "☆";
  });
}

function loadReviews(appId) {
  reviewsList.innerHTML = "<p>Cargando reseñas...</p>";

  db.collection("apps")
    .doc(appId)
    .collection("reviews")
    .orderBy("timestamp", "desc")
    .get()
    .then(snap => {
      reviewsList.innerHTML = "";

      if (snap.empty) {
        reviewsList.innerHTML =
          "<p>No hay reseñas todavía. Sé el primero en comentar.</p>";
        return;
      }

      snap.forEach(doc => {
        const r = doc.data();

        const item = document.createElement("div");
        item.className = "review-item";

        const starsStr = "★".repeat(r.stars) + "☆".repeat(5 - r.stars);

        item.innerHTML = `
          <div class="review-stars">${starsStr}</div>
          <div class="review-text">${r.comment}</div>
          <div class="review-time">${new Date(
            r.timestamp
          ).toLocaleDateString()}</div>
        `;

        reviewsList.appendChild(item);
      });
    });
}

function handleSendReview() {
  if (!currentApp) return;

  const text = reviewText.value.trim();

  if (reviewStarsSelected === 0) {
    alert("Selecciona una puntuación.");
    return;
  }

  if (text.length < 5) {
    alert("Escribe un comentario un poco más largo.");
    return;
  }

  const app = currentApp;
  const prevAvg = app.ratingAvg || 0;
  const prevCount = app.ratingCount || 0;
  const newCount = prevCount + 1;
  const newAvg = (prevAvg * prevCount + reviewStarsSelected) / newCount;

  const breakdown = app.starsBreakdown || {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };
  breakdown[reviewStarsSelected] =
    (breakdown[reviewStarsSelected] || 0) + 1;

  const appRef = db.collection("apps").doc(app.id);
  const reviewRef = appRef.collection("reviews").doc();

  const batch = db.batch();
  batch.set(reviewRef, {
    stars: reviewStarsSelected,
    comment: text,
    timestamp: Date.now()
  });
  batch.update(appRef, {
    ratingAvg: newAvg,
    ratingCount: newCount,
    starsBreakdown: breakdown
  });

  batch.commit().then(() => {
    reviewText.value = "";
    reviewStarsSelected = 0;
    renderReviewStars();

    currentApp.ratingAvg = newAvg;
    currentApp.ratingCount = newCount;
    currentApp.starsBreakdown = breakdown;

    loadReviews(currentApp.id);
    renderApps();
    openDetails(currentApp);

    alert("¡Tu reseña fue publicada!");
  });
}
