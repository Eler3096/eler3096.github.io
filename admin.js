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
let editId = null; // null = nueva app | id = editar app


// =======================
// MOSTRAR / OCULTAR LISTA
// =======================
function toggleApps() {
  const box = document.getElementById("appsContainer");
  const btn = document.getElementById("toggleBtn");

  box.classList.toggle("hidden");

  if (box.classList.contains("hidden")) {
    btn.textContent = "📦 Mostrar Apps Subidas";
  } else {
    btn.textContent = "📦 Ocultar Apps Subidas";
  }
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}


// =======================
// ELIMINAR APP COMPLETA
// =======================
function eliminarApp(id) {

  if (!confirm("¿Eliminar esta aplicación? Esta acción no se puede deshacer.")) return;

  const ref = db.collection("apps").doc(id);

  ref.get().then(doc => {
    if (!doc.exists) return alert("No existe la app.");

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
// GUARDAR (CREAR / EDITAR)
// =======================
function guardarApp() {

  const nombre = document.getElementById("nombre").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const version = document.getElementById("version").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const idioma = document.getElementById("idioma").value.trim();
  const tipo = document.getElementById("tipo").value.trim();
  const internet = document.getElementById("internet").value;

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

  let docRef;
  let id;

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

  let promesaImg = imgFile ? upload(storage.ref(`imagenes/${id}.jpg`), imgFile) : Promise.resolve(null);
  let promesaApk = apkFile ? upload(storage.ref(`apks/${id}.apk`), apkFile) : Promise.resolve(null);

  Promise.all([promesaImg, promesaApk])
  .then(([imgURL, apkURL]) => {

    return db.collection("apps").doc(id).get().then(docOld => {

      const old = docOld.data() || {};

      const data = {
        id,
        nombre,
        descripcion,
        version,
        categoria,
        idioma,
        tipo,
        internet,
        fecha: Date.now()
      };

      if (imgURL) data.imagen = imgURL;

      if (apkURL) {
        data.apk = apkURL;
        data.size = (apkFile.size / 1024 / 1024).toFixed(1) + " MB";
      } else {
        data.size = old.size || data.size;
      }

      return docRef.set(data, { merge: true });
    });

  })
  .then(() => {

    estado.textContent = "Guardado ✔";
    btn.disabled = false;

    if (editId !== null) {
      editId = null;
      document.getElementById("formTitle").textContent = "➕ Nueva Aplicación";
      document.getElementById("subirBtn").textContent = "SUBIR APP";
    }

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
  document.getElementById("apk").value = "";
  document.getElementById("imagen").value = "";
}
