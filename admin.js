// Proteger página
auth.onAuthStateChanged(user=>{
  if(!user) location.href="admin-login.html";
});

function logout(){ auth.signOut(); }

// SUBIR APP
// SUBIR APP
function subirApp(ev){
  const nombre = document.getElementById("nombre").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const version = document.getElementById("version").value.trim();
  const idioma = document.getElementById("idioma").value.trim();
  const tipo = document.getElementById("tipo").value.trim();
  const internet = document.getElementById("internet").value; // nuevo

  const apkFile = document.getElementById("apk").files[0];
  const imgFile = document.getElementById("imagen").files[0];

  const estado = document.getElementById("estado");
  const btn = document.getElementById("subirBtn");

  if(!nombre || !descripcion || !version || !idioma){
    alert("Faltan datos");
    return;
  }

  if(!apkFile || !imgFile){
    alert("Debes subir imagen y APK");
    return;
  }

  // tamaño en MB
  const sizeMB = (apkFile.size / (1024 * 1024)).toFixed(1) + " MB";

  btn.disabled = true;
  estado.textContent = "Subiendo archivos...";

  const docRef = db.collection("apps").doc();
  const id = docRef.id;

  const imgRef = storage.ref(`imagenes/${id}.jpg`);
  const apkRef = storage.ref(`apks/${id}.apk`);

  function uploadFile(ref,file){
    return new Promise((resolve,reject)=>{
      ref.put(file).on("state_changed",
        snap=>{
          let p = (snap.bytesTransferred / snap.totalBytes * 100).toFixed(0);
          estado.textContent = `Progreso: ${p}%`;
        },
        reject,
        ()=> ref.getDownloadURL().then(resolve)
      );
    });
  }

  uploadFile(imgRef,imgFile)
  .then(imgURL=>{
    return uploadFile(apkRef,apkFile).then(apkURL=>({imgURL,apkURL}));
  })
  .then(({imgURL,apkURL})=>{
    return docRef.set({
      id,
      nombre,
      categoria,
      descripcion,
      version,
      idioma,
      tipo,
      internet,                 // nuevo
      size: sizeMB,             // nuevo
      imagen: imgURL,
      apk: apkURL,
      likes: 0,
      descargas: 0,
      ratingAvg: 0,             // para estrellas
      ratingCount: 0,
      fecha: Date.now()
    });
  })
  .then(()=>{
    estado.textContent = "APP subida correctamente ✔";
    btn.disabled = false;
  })
  .catch(e=>{
    estado.textContent = "Error: " + e.message;
    btn.disabled = false;
  });
}

