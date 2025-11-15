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

// ====== Cargar apps ======
db.collection("apps").orderBy("fecha", "desc").onSnapshot(
  snap => {
    allApps = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    renderApps();
  },
  () => {
    emptyState.style.display = "block";
    emptyState.textContent = "Error cargando apps.";
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
    list = list.filter(a =>
      (a.nombre || "").toLowerCase().includes(q) ||
      (a.descripcion || "").toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));

  if (!list.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  list.forEach(app => {
    const card = document.createElement("article");
    card.className = "play-card";

    const avg = app.ratingAvg || 0;
    const cnt = app.ratingCount || 0;

    const stars = cnt
      ? `⭐ ${avg.toFixed(1)} (${cnt})`
      : "⭐ Sin valoraciones";

    card.innerHTML = `
      <img class="play-icon" src="${app.imagen}">
      <div class="play-info">
        <h3>${app.nombre}</h3>
        <p>${app.internet === "offline" ? "📴 Sin Internet" : "🌐 Con Internet"}</p>
        <p>${stars} • ❤️ ${app.likes || 0}</p>
      </div>
    `;

    card.onclick = () => openDetails(app);
    appsGrid.appendChild(card);
  });
}

// ====== Detalle ======
function openDetails(app) {
  currentApp = app;
  overlay.classList.remove("hidden");

  // datos principales
  detailIcon.src = app.imagen;
  detailName.textContent = app.nombre;
  detailCategory.textContent = app.categoria || "";
  detailDesc.textContent = app.descripcion || "";

  const avg = app.ratingAvg || 0;
  const cnt = app.ratingCount || 0;

  ratingLabel.textContent = cnt
    ? `Valoración: ${avg.toFixed(1)} (${cnt} votos)`
    : "Sin valoraciones";

  // GRAFICO CORREGIDO
  let breakdown = app.starsBreakdown || {1:0,2:0,3:0,4:0,5:0};
  const total = Object.values(breakdown).reduce((a,b)=>a+b,0);

  ratingBig.textContent = avg.toFixed(1);
  ratingTotal.textContent = `${total} reseñas`;

  [5,4,3,2,1].forEach(st => {
    const bar = document.getElementById("bar"+st);

    let pct = total ? (breakdown[st] / total) * 100 : 0;

    // 🔥 CORRECCIÓN IMPORTANTE:
    // aunque una valoración no tenga votos, la barra debe quedar visible
    bar.style.width = pct + "%";
    bar.style.minWidth = "4px";
  });

  // estrellas rápidas
  const votes = getVotes();
  const my = votes[app.id] || {};
  renderStars(app, my.stars || 0);

  // reseñas
  renderReviewStars();
  loadReviews(app.id);
  reviewText.value = "";
}

// ====== Estrellas rápidas ======
function renderStars(app, myStars) {
  starsRow.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.className = "star-btn";
    btn.textContent = i <= myStars ? "★" : "☆";
    btn.disabled = myStars > 0;
    btn.onclick = () => handleStarClick(app, i);
    starsRow.appendChild(btn);
  }
}

function handleStarClick(app, stars) {
  const votes = getVotes();
  const my = votes[app.id] || {};

  if (my.stars) return;

  const oldAvg = app.ratingAvg || 0;
  const oldCount = app.ratingCount || 0;

  const newCount = oldCount + 1;
  const newAvg = (oldAvg * oldCount + stars) / newCount;

  const breakdown = app.starsBreakdown || {1:0,2:0,3:0,4:0,5:0};
  breakdown[stars]++;

  db.collection("apps")
    .doc(app.id)
    .update({
      ratingAvg: newAvg,
      ratingCount: newCount,
      starsBreakdown: breakdown
    })
    .then(() => {
      my.stars = stars;
      votes[app.id] = my;
      saveVotes(votes);

      currentApp.ratingAvg = newAvg;
      currentApp.ratingCount = newCount;
      currentApp.starsBreakdown = breakdown;

      openDetails(currentApp);
      renderApps();
    });
}

// ====== Reseñas ======
function renderReviewStars() {
  reviewStarsContainer.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.className = "star-btn";
    b.textContent = "☆";
    b.onclick = () => setReviewStars(i);
    reviewStarsContainer.appendChild(b);
  }
}

function setReviewStars(n) {
  reviewStarsSelected = n;
  reviewStarsContainer.querySelectorAll("button").forEach((b,i)=>{
    b.textContent = i < n ? "★" : "☆";
  });
}

function loadReviews(appId) {
  reviewsList.innerHTML = "<p>Cargando reseñas...</p>";

  db.collection("apps")
    .doc(appId)
    .collection("reviews")
    .orderBy("timestamp","desc")
    .get()
    .then(snap=>{
      reviewsList.innerHTML = "";

      if (snap.empty) {
        reviewsList.innerHTML = "<p>No hay reseñas aún.</p>";
        return;
      }

      snap.forEach(doc=>{
        const r = doc.data();
        const item = document.createElement("div");
        item.className = "review-item";

        const stars = "★".repeat(r.stars) + "☆".repeat(5-r.stars);

        item.innerHTML = `
          <div class="review-stars">${stars}</div>
          <div class="review-text">${r.comment}</div>
          <div class="review-time">${new Date(r.timestamp).toLocaleDateString()}</div>
        `;

        reviewsList.appendChild(item);
      });
    });
}

sendReviewBtn.onclick = function() {
  if (!currentApp) return;

  const tx = reviewText.value.trim();
  if (tx.length < 3) return alert("Escribe un comentario más largo.");
  if (!reviewStarsSelected) return alert("Selecciona estrellas.");

  const app = currentApp;
  const oldAvg = app.ratingAvg || 0;
  const oldCnt = app.ratingCount || 0;

  const newCnt = oldCnt + 1;
  const newAvg = (oldAvg * oldCnt + reviewStarsSelected) / newCnt;

  const breakdown = app.starsBreakdown || {1:0,2:0,3:0,4:0,5:0};
  breakdown[reviewStarsSelected]++;

  const ref = db.collection("apps").doc(app.id);
  const rev = ref.collection("reviews").doc();

  const batch = db.batch();
  batch.set(rev, {
    stars: reviewStarsSelected,
    comment: tx,
    timestamp: Date.now()
  });
  batch.update(ref, {
    ratingAvg: newAvg,
    ratingCount: newCnt,
    starsBreakdown: breakdown
  });

  batch.commit().then(()=>{
    reviewText.value = "";
    reviewStarsSelected = 0;
    renderReviewStars();

    currentApp.ratingAvg = newAvg;
    currentApp.ratingCount = newCnt;
    currentApp.starsBreakdown = breakdown;

    loadReviews(app.id);
    renderApps();
    openDetails(app);
  });
};

