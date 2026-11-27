
var shareImageButton =
  document.querySelector('#share-image-button');

var createPostArea =
  document.querySelector('#create-post');

var closeCreatePostModalButton =
  document.querySelector('#close-create-post-modal-btn');

var sharedMomentsArea =
  document.querySelector('#shared-moments');

var form =
  document.querySelector('#create-post form');

var titleInput =
  document.querySelector('#title');

var locationInput =
  document.querySelector('#location');

// ========================================
// CONFIGURACION FIREBASE
// ========================================

var url =
  'https://uteqgram-gael-default-rtdb.firebaseio.com/post.json';

var firebaseBase =
  'https://uteqgram-gael-default-rtdb.firebaseio.com/post';

var imageUrl =
  'https://firebasestorage.googleapis.com/v0/b/uteqgram-gael.firebasestorage.app/o/main-image.jpg?alt=media&token=4fdb63e9-7b31-40e2-aa7d-b94b2ec98f69';

var currentPosts = [];
var submitting = false;

// ========================================
// MENSAJES
// ========================================

function showMessage(message) {
  var snackbar =
    document.querySelector('#confirmation-toast');

  if (snackbar && snackbar.MaterialSnackbar) {
    snackbar.MaterialSnackbar.showSnackbar({
      message: message,
      timeout: 3500
    });
  } else {
    console.log(message);
  }
}

// ========================================
// ABRIR FORMULARIO
// ========================================

function openCreatePostModal() {
  createPostArea.style.transform =
    'translateY(0)';

  createPostArea.style.pointerEvents =
    'auto';
}

// ========================================
// CERRAR FORMULARIO
// ========================================

function closeCreatePostModal() {
  createPostArea.style.transform =
    'translateY(100vh)';

  createPostArea.style.pointerEvents =
    'none';
}

shareImageButton.addEventListener(
  'click',
  openCreatePostModal
);

closeCreatePostModalButton.addEventListener(
  'click',
  closeCreatePostModal
);

// ========================================
// LIMPIAR TARJETAS
// ========================================

function clearCards() {
  sharedMomentsArea.innerHTML = '';
}

// ========================================
// CREAR TARJETA
// ========================================

function createCard(data) {
  var cardWrapper =
    document.createElement('div');

  cardWrapper.className =
    'shared-moment-card mdl-card mdl-shadow--2dp';

  var cardTitle =
    document.createElement('div');

  cardTitle.className = 'mdl-card__title';

  var imagenPublicacion =
    data.image || imageUrl;

  if (imagenPublicacion.indexOf('sf-boat.jpg') !== -1) {
    imagenPublicacion = imageUrl;
  }

  cardTitle.style.backgroundImage =
    'url("' + imagenPublicacion + '")';

  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.backgroundPosition = 'center';
  cardTitle.style.height = '180px';

  var titleElement =
    document.createElement('h2');

  titleElement.className =
    'mdl-card__title-text';

  titleElement.style.color = 'white';
  titleElement.textContent =
    data.title || 'Sin titulo';

  cardTitle.appendChild(titleElement);
  cardWrapper.appendChild(cardTitle);

  var supportingText =
    document.createElement('div');

  supportingText.className =
    'mdl-card__supporting-text';

  supportingText.textContent =
    data.location || data['location:'] || '';

  supportingText.style.textAlign = 'center';

  cardWrapper.appendChild(supportingText);

  if (data.pending) {
    var pendingText =
      document.createElement('div');

    pendingText.textContent =
      'Pendiente de sincronizar';

    pendingText.style.padding = '8px';
    pendingText.style.textAlign = 'center';
    pendingText.style.color = '#e91e63';

    cardWrapper.appendChild(pendingText);
  }

  sharedMomentsArea.appendChild(cardWrapper);

  if (typeof componentHandler !== 'undefined') {
    componentHandler.upgradeElement(cardWrapper);
  }
}

// ========================================
// ACTUALIZAR INTERFAZ
// ========================================

function updateUI(data) {
  clearCards();

  if (!Array.isArray(data)) {
    return;
  }

  // Nuevas publicaciones primero.
  var sorted = data.slice().sort(function(a, b) {
    var timeA = Date.parse(a.id) || 0;
    var timeB = Date.parse(b.id) || 0;

    return timeB - timeA;
  });

  sorted.forEach(function(post) {
    createCard(post);
  });
}

// ========================================
// CONVERTIR RESPUESTA DE FIREBASE
// ========================================

function normalizePosts(data) {
  if (!data) {
    return [];
  }

  return Object.keys(data).map(function(key) {
    var post = Object.assign({}, data[key]);

    if (!post.id) {
      post.id = key;
    }

    return post;
  });
}

// ========================================
// UNIR POSTS Y PUBLICACIONES PENDIENTES
// ========================================

function mergePosts(posts, pendingPosts) {
  var result = [];
  var ids = new Set();

  posts.concat(pendingPosts).forEach(function(post) {
    if (!post || !post.id) {
      return;
    }

    if (ids.has(post.id)) {
      return;
    }

    ids.add(post.id);
    result.push(post);
  });

  return result;
}

// ========================================
// CARGAR PUBLICACIONES LOCALES
// ========================================

function loadLocalPosts() {
  if (!('indexedDB' in window)) {
    return Promise.resolve([]);
  }

  return Promise.all([
    readAllData('posts'),
    readAllData('sync-posts')
  ])
  .then(function(results) {
    var posts = results[0] || [];

    var pendingPosts = (results[1] || [])
      .map(function(post) {
        return Object.assign({}, post, {
          pending: true
        });
      });

    return mergePosts(posts, pendingPosts);
  });
}

// ========================================
// ACTUALIZAR FEED
// ========================================

function refreshFeed() {

  // Mostrar primero los datos locales.
  var localPromise = loadLocalPosts()
    .then(function(posts) {
      currentPosts = posts;
      updateUI(posts);
    })
    .catch(function(error) {
      console.log(
        'Error leyendo datos locales:',
        error
      );
    });

  // Consultar Firebase.
  return localPromise.then(function() {
    return fetch(url, {
      cache: 'no-store'
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error(
          'Firebase no disponible: ' +
          response.status
        );
      }

      return response.json();
    })
    .then(function(data) {
      var posts = normalizePosts(data);

      // Guardar las publicaciones recibidas.
      var savePromise = Promise.resolve();

      if ('indexedDB' in window) {
        savePromise = Promise.all(
          posts.map(function(post) {
            return writeData('posts', post);
          })
        ).catch(function(error) {
          console.log(
            'Error guardando publicaciones:',
            error
          );
        });
      }

      return savePromise.then(function() {
        return loadLocalPosts();
      })
      .then(function(localPosts) {
        // Incluir publicaciones pendientes,
        // sin duplicar las recibidas de Firebase.
        var pending = localPosts.filter(function(post) {
          return post.pending;
        });

        currentPosts = mergePosts(posts, pending);

        updateUI(currentPosts);

        console.log(
          'Feed actualizado:',
          currentPosts.length
        );
      });
    })
    .catch(function(error) {
      console.log(
        'Utilizando publicaciones locales:',
        error
      );

      return loadLocalPosts()
        .then(function(posts) {
          currentPosts = posts;
          updateUI(posts);
        })
        .catch(function(err) {
          console.error(err);
        });
    });
  });
}

// ========================================
// URL DE UNA PUBLICACION
// ========================================

function firebasePostUrl(id) {
  var safeId = String(id)
    .replace(/[.#$[\]/]/g, '_');

  return firebaseBase +
    '/' + encodeURIComponent(safeId) +
    '.json';
}

// ========================================
// ENVIAR PUBLICACION A FIREBASE
// ========================================

function sendData(post) {
  return fetch(firebasePostUrl(post.id), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: post.id,
      title: post.title,
      location: post.location,
      image: post.image
    })
  })
  .then(function(response) {
    if (!response.ok) {
      var error = new Error(
        'Firebase respondio: ' + response.status
      );

      error.serverError = true;
      throw error;
    }

    return response.json();
  });
}

// ========================================
// GUARDAR PUBLICACION PENDIENTE
// ========================================

function savePendingPost(post) {
  if (!('indexedDB' in window)) {
    return Promise.reject(
      new Error('IndexedDB no disponible')
    );
  }

  return writeData('sync-posts', post)
    .then(function() {
      if (!('serviceWorker' in navigator)) {
        return;
      }

      return navigator.serviceWorker.ready
        .then(function(registration) {
          if (!registration.sync) {
            console.log(
              'Background Sync no disponible'
            );
            return;
          }

          return registration.sync.register(
            'sync-new-posts'
          );
        });
    })
    .catch(function(error) {
      // Si falló únicamente el registro de Sync,
      // el post continúa en IndexedDB.
      console.log(
        'Revisar sincronizacion:',
        error
      );
    });
}

// ========================================
// SINCRONIZAR PUBLICACIONES PENDIENTES
// ========================================

function syncPendingPosts() {
  if (!navigator.onLine ||
      !('indexedDB' in window)) {
    return Promise.resolve();
  }

  return readAllData('sync-posts')
    .then(function(posts) {
      return Promise.all(
        posts.map(function(post) {
          return sendData(post)
            .then(function() {
              return deleteItemFromData(
                'sync-posts',
                post.id
              );
            })
            .then(function() {
              return writeData('posts', post);
            })
            .catch(function(error) {
              console.log(
                'Post pendiente:',
                error
              );
            });
        })
      );
    })
    .then(function() {
      return refreshFeed();
    });
}

// ========================================
// PUBLICAR
// ========================================

function publishPost(post) {

  // Intentar publicar inmediatamente.
  return sendData(post)
    .then(function() {
      console.log(
        'Publicacion enviada a Firebase'
      );

      if ('indexedDB' in window) {
        return writeData('posts', post);
      }
    })
    .then(function() {
      closeCreatePostModal();

      form.reset();

      showMessage(
        'Publicacion realizada correctamente'
      );

      return refreshFeed();
    })
    .catch(function(error) {
      console.log(
        'No se pudo publicar directamente:',
        error
      );

      // Errores de permisos o servidor:
      // informar, sin afirmar que se publicó.
      if (error.serverError) {
        showMessage(
          'Firebase rechazo la publicacion'
        );
        return;
      }

      // Sin conexión: guardar para sincronizar.
      return savePendingPost(post)
        .then(function() {
          closeCreatePostModal();

          form.reset();

          showMessage(
            'Guardada para sincronizar'
          );

          return refreshFeed();
        });
    });
}

// ========================================
// EVENTO DEL FORMULARIO
// ========================================

form.addEventListener('submit', function(event) {
  event.preventDefault();

  if (submitting) {
    return;
  }

  var title = titleInput.value.trim();
  var location = locationInput.value.trim();

  if (!title || !location) {
    alert(
      'Ingresa un titulo y una ubicacion.'
    );
    return;
  }

  var post = {
    id: 'post_' + Date.now() + '_' +
      Math.random().toString(36).slice(2, 10),

    title: title,
    location: location,
    image: imageUrl
  };

  submitting = true;

  var submitButton =
    document.querySelector('#post-btn');

  if (submitButton) {
    submitButton.disabled = true;
  }

  publishPost(post)
    .catch(function(error) {
      console.error(
        'Error publicando:',
        error
      );

      showMessage(
        'No se pudo guardar la publicacion'
      );
    })
    .finally(function() {
      submitting = false;

      if (submitButton) {
        submitButton.disabled = false;
      }
    });
});

// ========================================
// DETECTAR CONEXION
// ========================================

window.addEventListener('online', function() {
  console.log('Conexion recuperada');

  syncPendingPosts()
    .catch(function(error) {
      console.error(error);
    });
});

// ========================================
// CARGA INICIAL
// ========================================

refreshFeed()
  .then(function() {
    if (navigator.onLine) {
      return syncPendingPosts();
    }
  })
  .catch(function(error) {
    console.error(
      'Error cargando UTEQGram:',
      error
    );
  });
