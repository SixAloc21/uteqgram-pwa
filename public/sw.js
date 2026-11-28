
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

// ========================================
// CONFIGURACION
// ========================================

var CACHE_STATIC_NAME = 'static-v22';
var CACHE_DYNAMIC_NAME = 'dynamic-v9';

var FIREBASE_URL =
  'https://uteqgram-gael-default-rtdb.firebaseio.com/post.json';

var FIREBASE_BASE =
  'https://uteqgram-gael-default-rtdb.firebaseio.com/post';

var IMAGE_URL =
  'https://firebasestorage.googleapis.com/v0/b/uteqgram-gael.firebasestorage.app/o/main-image.jpg?alt=media&token=4fdb63e9-7b31-40e2-aa7d-b94b2ec98f69';

var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/404.html',
  '/manifest.json',

  '/icons/icon-192.png',
  '/icons/icon-512.png',

  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/utility.js',

  '/src/css/app.css',
  '/src/css/feed.css',

  '/src/images/main-image.jpg'
];

// ========================================
// INSTALL
// ========================================

self.addEventListener('install', function(event) {
  console.log('[SW] Instalando Service Worker');

  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function(cache) {
        return cache.addAll(STATIC_FILES);
      })
      .then(function() {
        console.log('[SW] Archivos guardados');
        return self.skipWaiting();
      })
  );
});

// ========================================
// ACTIVATE
// ========================================

self.addEventListener('activate', function(event) {
  console.log('[SW] Activando Service Worker');

  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.map(function(key) {
            if (
              key !== CACHE_STATIC_NAME &&
              key !== CACHE_DYNAMIC_NAME
            ) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// ========================================
// UTILIDADES
// ========================================

function isInArray(requestUrl, files) {
  var pathname = new URL(requestUrl).pathname;

  return files.indexOf(pathname) !== -1;
}

function firebaseKey(id) {
  return String(id).replace(/[.#$[\]/]/g, '_');
}

function firebasePostUrl(id) {
  return FIREBASE_BASE +
    '/' + encodeURIComponent(firebaseKey(id)) +
    '.json';
}

// ========================================
// GUARDAR PUBLICACIONES EN INDEXEDDB
// ========================================

function saveFirebasePosts(data) {
  return clearAllData('posts')
    .then(function() {
      if (!data) {
        return [];
      }

      var promises = [];

      Object.keys(data).forEach(function(key) {
        var post = data[key];

        if (post && post.id) {
          promises.push(
            writeData('posts', post)
          );
        }
      });

      return Promise.all(promises);
    });
}

// ========================================
// FETCH
// ========================================

self.addEventListener('fetch', function(event) {
  var request = event.request;

  // No interceptar solicitudes de escritura.
  if (request.method !== 'GET') {
    return;
  }

  // ======================================
  // FIREBASE: NETWORK FIRST
  // ======================================

  if (request.url.startsWith(FIREBASE_URL)) {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          if (!response.ok) {
            return response;
          }

          return response.clone().json()
            .then(function(data) {
              return saveFirebasePosts(data);
            })
            .catch(function(error) {
              console.error(
                '[SW] Error guardando IndexedDB:',
                error
              );
            })
            .then(function() {
              return response;
            });
        })
        .catch(function(error) {
          console.log(
            '[SW] Firebase sin conexión:',
            error
          );

          // feed.js recuperará IndexedDB.
          return new Response(
            JSON.stringify({
              offline: true
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
        })
    );

    return;
  }

  // ======================================
  // ARCHIVOS ESTATICOS
  // ======================================

  if (isInArray(request.url, STATIC_FILES)) {
    event.respondWith(
      caches.match(request)
        .then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request);
        })
    );

    return;
  }

  // ======================================
  // CACHE DINAMICO
  // ======================================

  event.respondWith(
    caches.match(request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(function(response) {
            if (!response.ok) {
              return response;
            }

            var copy = response.clone();

            return caches.open(CACHE_DYNAMIC_NAME)
              .then(function(cache) {
                return cache.put(request, copy);
              })
              .catch(function(error) {
                console.log(
                  '[SW] No se pudo guardar cache:',
                  error
                );
              })
              .then(function() {
                return response;
              });
          })
          .catch(function(error) {
            var acceptsHTML =
              request.headers.get('accept') || '';

            if (
              request.mode === 'navigate' ||
              acceptsHTML.includes('text/html')
            ) {
              return caches.match('/offline.html');
            }

            return Response.error();
          });
      })
  );
});

// ========================================
// ENVIAR PUBLICACION A FIREBASE
// ========================================

function sendQueuedPost(post) {
  return fetch(firebasePostUrl(post.id), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: post.id,
      title: post.title,
      location: post.location,
      image: post.image || IMAGE_URL
    })
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error(
        'Firebase respondio: ' + response.status
      );
    }

    return deleteItemFromData(
      'sync-posts',
      post.id
    ).then(function() {
      return writeData('posts', post);
    });
  });
}

// ========================================
// BACKGROUND SYNC
// ========================================

self.addEventListener('sync', function(event) {
  if (event.tag !== 'sync-new-posts') {
    return;
  }

  console.log('[SW] Sincronizando publicaciones');

  event.waitUntil(
    readAllData('sync-posts')
      .then(function(posts) {
        return Promise.all(
          posts.map(function(post) {
            return sendQueuedPost(post);
          })
        );
      })
      .then(function() {
        console.log(
          '[SW] Sincronizacion completada'
        );
      })
      .catch(function(error) {
        console.error(
          '[SW] Sincronizacion pendiente:',
          error
        );

        // Permite que el navegador reintente.
        throw error;
      })
  );
});
