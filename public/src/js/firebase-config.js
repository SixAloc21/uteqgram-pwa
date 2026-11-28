
/* =========================================
   UTEQGRAM - FIREBASE CONFIG
   Authentication + Storage
   ========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDHV1sT7tDbMTJsi8iUcBTJIEnT2rFNFqU",
  authDomain: "uteqgram-gael.firebaseapp.com",
  databaseURL: "https://uteqgram-gael-default-rtdb.firebaseio.com",
  projectId: "uteqgram-gael",
  storageBucket: "uteqgram-gael.firebasestorage.app",
  messagingSenderId: "38717832048",
  appId: "1:38717832048:web:f301babb1208b085c0adb5"
};

// Inicializar Firebase una sola vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var firebaseAuth = firebase.auth();
var firebaseStorage = firebase.storage();

// Obtener una sesión anónima para subir fotos
function obtenerUsuarioFirebase() {

  if (firebaseAuth.currentUser) {
    return Promise.resolve(firebaseAuth.currentUser);
  }

  return firebaseAuth.signInAnonymously()
    .then(function(resultado) {

      console.log(
        '[UTEQGram] Usuario autenticado:',
        resultado.user.uid
      );

      return resultado.user;
    });
}

console.log(
  '[UTEQGram] Firebase Auth y Storage configurados'
);
