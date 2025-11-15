// =======================
// PROTECCIÓN DE ACCESO
// =======================
auth.onAuthStateChanged(user => {
  if (!user) location.href = "admin-login.html";
});
function logout() { auth.signOut(); }

// =======================
// VARIABLES GLOBALES
// =======================
let editId = null; 
let prevSize = null; 

// =======================
// MOSTRAR / OCULTAR LISTA
// =======================
function toggleApps() {
  const box = document.getElementById("appsContainer");
  const btn = document.getElementById("toggleBtn");

  box.classList.toggle("hidden");
  btn.textContent = box.classList.contains("hidden")
    ? "📦 Apps Subidas"
    : "📦 Ocultar Apps";
}

// =======================
// LISTADO DE APPS
// =======================
const appsList = document.getElementById("appsList");

db.collection("apps").orderBy("fecha", "desc").onSnapshot(snap => {
  appsList.innerHTML = "";

  snap.forEach(doc => {
    const a = doc.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><img src="${a.imagen}" class="table-icon"></td>
      <td>${a.nombre}</td>
      <td>${a.categoria}</td>
      <td>${a.version}</td>
      <td>
        <button class="btn-edit" onclick="cargarParaEditar('${a.id}')">✏️ Editar</button>
        <button class="btn-delete" onclick="eliminarApp('${a.id}')">🗑 Eliminar</button>
      </td>
    `;

    appsList.appendChild(tr);
  });
});

// =======================
// CARGAR APP PARA EDITAR
// =======================
function cargarParaEditar(id) {
  editId = id;

  document.getElementById("formTitle").textContent = "✏️ Editar Aplicación";
  document.getElementById("subirBtn").textContent = "GUARDAR";

  db.collection("apps").doc(id).get().then(doc => {
    const a = doc.data();

    document.getElementById("nombre").value = a.nombre;
    document.getElementById("descripcion").value = a.descripcion;
    document.getElementById("version").value = a.version;
    document.getElementById("categoria").value = a.categoria;
    document.getElementById("idioma").value = a.idioma;
    document.getElementById("tipo").value = a.tipo;
    document.getElementById("internet").value = a.internet;

    document.getElementById("sistema").value = a.sistemaOperativo || "";
    document.getElementById("requisitos").value = a.requisitos || "";
    document.getElementById("fechaAct").value = a.fechaActualizacion || "";
    document.getElementById("edad").value = a.edad || "";
    document.getElementById("anuncios").value = a.anuncios || "no";
    document.getElementById("privacidad").value = a.privacidadUrl || "";

    prevSize = a.size || null;

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// =======================
// ELIMINAR APP
// =======================
function eliminarApp(id) {
  if (!confirm("¿Eliminar esta aplicación?")) return;

  const ref = db.collection("apps").doc(id);

  ref.get().then(doc => {
    if (!doc.exists) return;

    const imgRef = storage.ref(`imagenes/${id}.jpg`);
    const apkRef = storage.ref(`apks/${id}.apk`);

    imgRef.delete().catch(() => {});
    apkRef.delete().catch(() => {});

    return ref.delete();
  })
  .then(() => alert("Aplicación eliminada ✔"))
  .catch(err => alert("Error: " + err.message));
}

// =======================
// GUARDAR / EDITAR APP
// =======================
function guardarApp() {

  const nombre = document.getElementById("nombre").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const version = document.getElementById("version").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const idioma = document.getElementById("idioma").value.trim();
  const tipo = document.getElementById("tipo").value.trim();
  const internet = document.getElementById("internet").value;

  // ❗ IDs corregidos
  const sistema = document.getElementById("sistema").value.trim();
  const requisitos = document.getElementById("requisitos").value.trim();
  const fechaAct = document.getElementById("fechaAct").value;
  const edad = document.getElementById("edad").value.trim();
  const anuncios = document.getElementById("anuncios").value;
  const privacidad = document.getElementById("privacidad").value.trim();

  const capturas = document.getElementById("capturas").files;

  const apkFile = document.getElementById("apk").files[0];
  const imgFile = document.getElementById("imagen").files[0];

  const estado = document.getElementById("estado");
  const btn = document.getElementById("subirBtn");

  if (!nombre || !descripcion || !version) {
    alert("Completa los campos requeridos");
    return;
  }

  btn.disabled = true;
  estado.textContent = "Procesando…";

  let docRef, id;

  if (editId === null) {
    docRef = db.collection("apps").doc();
    id = docRef.id;
  } else {
    docRef = db.collection("apps").doc(editId);
    id = editId;
  }

  function upload(ref, file) {
    return new Promise(res => {
      ref.put(file).then(() => ref.getDownloadURL().then(url => res(url)));
    });
  }

  // Imagen principal
  let promesaImg = imgFile ? upload(storage.ref(`imagenes/${id}.jpg`), imgFile) : Promise.resolve(null);

  // APK
  let promesaApk;

  if (apkFile) {
    promesaApk = upload(storage.ref(`apks/${id}.apk`), apkFile).then(url => ({
      url,
      size: (apkFile.size / 1024 / 1024).toFixed(1) + " MB"
    }));
  } else {
    const ref = storage.ref(`apks/${id}.apk`);
    promesaApk = ref
      .getMetadata()
      .then(meta => ({
        url: null,
        size: (meta.size / 1024 / 1024).toFixed(1) + " MB"
      }))
      .catch(() => ({
        url: null,
        size: prevSize
      }));
  }

  // Capturas
  let capturasURLS = [];

  const promisesCapturas = [];

  for (let i = 0; i < capturas.length; i++) {
    const file = capturas[i];
    const ref = storage.ref(`screens/${id}-${i}.jpg`);
    promisesCapturas.push(
      upload(ref, file).then(url => capturasURLS.push(url))
    );
  }

  Promise.all([promesaImg, promesaApk, ...promisesCapturas]).then(([imgURL, apkData]) => {

    const data = {
      id,
      nombre,
      descripcion,
      version,
      categoria,
      idioma,
      tipo,
      internet,

      sistemaOperativo: sistema,
      requisitos,
      fechaActualizacion: fechaAct,
      edad,
      anuncios,
      privacidadUrl: privacidad,

      fecha: Date.now()
    };

    if (capturasURLS.length > 0) data.imgSecundarias = capturasURLS;
    if (imgURL) data.imagen = imgURL;
    if (apkData.url) data.apk = apkData.url;
    if (apkData.size) data.size = apkData.size;

    if (!editId) {
      data.ratingAvg = 0;
      data.ratingCount = 0;
      data.starsBreakdown = {1:0,2:0,3:0,4:0,5:0};
      data.descargasReales = 0;
    }

    return docRef.set(data, { merge: true });
  })
  .then(() => {
    estado.textContent = "Guardado ✔";
    btn.disabled = false;

    editId = null;
    prevSize = null;

    document.getElementById("formTitle").textContent = "➕ Nueva Aplicación";
    document.getElementById("subirBtn").textContent = "SUBIR APP";

    limpiarFormulario();
  })
  .catch(err => {
    estado.textContent = "Error: " + err.message;
    btn.disabled = false;
  });
}

// =======================
// LIMPIAR FORMULARIO
// =======================
function limpiarFormulario() {
  document.getElementById("nombre").value = "";
  document.getElementById("descripcion").value = "";
  document.getElementById("version").value = "";
  document.getElementById("categoria").value = "Educación";
  document.getElementById("idioma").value = "";
  document.getElementById("tipo").value = "Gratis";
  document.getElementById("internet").value = "offline";

  document.getElementById("sistema").value = "";
  document.getElementById("requisitos").value = "";
  document.getElementById("fechaAct").value = "";
  document.getElementById("edad").value = "";
  document.getElementById("anuncios").value = "no";
  document.getElementById("privacidad").value = "";

  document.getElementById("apk").value = "";
  document.getElementById("imagen").value = "";
  document.getElementById("capturas").value = "";
}
