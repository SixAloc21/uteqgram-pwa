
/* =========================================
   UTEQGRAM - FEED.JS
   Firebase + IndexedDB + Camara
   Publicaciones online y offline
   ========================================= */

// ========================================
// 1. ELEMENTOS HTML
// ========================================

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

var postButton =
  document.querySelector('#post-btn');

// ========================================
// 2. ELEMENTOS DE CAMARA
// ========================================

var postImageInput =
  document.querySelector('#post-image');

var imagePreview =
  document.querySelector('#image-preview');

var imagePreviewContainer =
  document.querySelector('#image-preview-container');

var removeImageButton =
  document.querySelector('#remove-image-btn');

var selectedImage = null;
var previewObjectUrl = null;

// ========================================
// 3. FIREBASE
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
// 4. MENSAJES
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
    console.log('[UTEQGram]', message);
  }
}

// ========================================
// 5. LIMPIAR FOTOGRAFIA
// ========================================

function clearSelectedImage() {

  selectedImage = null;

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  if (postImageInput) {
    postImageInput.value = '';
  }

  if (imagePreview) {
    imagePreview.removeAttribute('src');
  }

  if (imagePreviewContainer) {
    imagePreviewContainer.hidden = true;
  }
}

// ========================================
// 6. CAPTURAR O SELECCIONAR IMAGEN
// ========================================

if (postImageInput) {

  postImageInput.addEventListener(
    'change',
    function(event) {

      var file = event.target.files[0];

      if (!file) {
        return;
      }

      var allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      ];

      if (!allowedTypes.includes(file.type)) {

        alert(
          'Selecciona una imagen JPG, PNG, WEBP o GIF.'
        );

        clearSelectedImage();
        return;
      }

      if (file.size > 5 * 1024 * 1024) {

        alert(
          'La fotografia no debe superar los 5 MB.'
        );

        clearSelectedImage();
        return;
      }

      selectedImage = file;

      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }

      previewObjectUrl =
        URL.createObjectURL(file);

      if (imagePreview) {
        imagePreview.src = previewObjectUrl;
      }

      if (imagePreviewContainer) {
        imagePreviewContainer.hidden = false;
      }

      console.log(
        '[UTEQGram] Fotografia seleccionada:',
        file.name,
        file.size,
        'bytes'
      );

      showMessage(
        'Fotografia capturada correctamente'
      );
    }
  );
}

// ========================================
// 7. QUITAR FOTOGRAFIA
// ========================================

if (removeImageButton) {

  removeImageButton.addEventListener(
    'click',
    function() {

      if (submitting) {
        return;
      }

      clearSelectedImage();

      showMessage(
        'Fotografia quitada'
      );
    }
  );
}

// ========================================
// 8. SUBIR FOTO A FIREBASE STORAGE
// ========================================

function subirFotografia(file, postId) {

  if (!file) {
    return Promise.reject(
      new Error('No hay fotografia seleccionada')
    );
  }

  var extensiones = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };

  var extension = extensiones[file.type];

  if (!extension) {
    return Promise.reject(
      new Error('Formato de imagen no compatible')
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return Promise.reject(
      new Error('La imagen supera los 5 MB')
    );
  }

  if (!navigator.onLine) {
    return Promise.reject(
      new Error(
        'Se necesita Internet para subir fotografias'
      )
    );
  }

  if (
    typeof obtenerUsuarioFirebase !== 'function' ||
    typeof firebaseStorage === 'undefined'
  ) {
    return Promise.reject(
      new Error(
        'Firebase Storage no esta disponible'
      )
    );
  }

  return obtenerUsuarioFirebase()
    .then(function(usuario) {

      var ruta =
        'posts/' +
        usuario.uid +
        '/' +
        postId +
        '.' +
        extension;

      console.log(
        '[UTEQGram] Subiendo a Storage:',
        ruta
      );

      var referencia =
        firebaseStorage.ref().child(ruta);

      return referencia.put(file, {
        contentType: file.type
      });
    })
    .then(function(snapshot) {

      console.log(
        '[UTEQGram] Foto subida a Storage'
      );

      return snapshot.ref.getDownloadURL();
    })
    .then(function(downloadURL) {

      if (
        !downloadURL ||
        typeof downloadURL !== 'string'
      ) {
        throw new Error(
          'Storage no devolvio una URL valida'
        );
      }

      console.log(
        '[UTEQGram] URL REAL obtenida:',
        downloadURL
      );

      return downloadURL;
    });
}

// ========================================
// 9. NOTIFICACIONES
// ========================================

function notifySuccessfulPost(post) {

  if (
    typeof mostrarNotificacion !== 'function'
  ) {
    console.warn(
      '[UTEQGram] Notificaciones no disponibles'
    );

    return Promise.resolve(false);
  }

  try {

    return Promise.resolve(
      mostrarNotificacion(
        'UTEQGram - Publicacion exitosa',
        'Tu publicacion "' +
          post.title +
          '" se guardo correctamente.'
      )
    )
    .then(function(result) {

      console.log(
        '[UTEQGram] Notificacion:',
        result
      );

      return result;
    })
    .catch(function(error) {

      console.warn(
        '[UTEQGram] Notificacion fallida:',
        error
      );

      return false;
    });

  } catch (error) {

    console.warn(
      '[UTEQGram] Error de notificacion:',
      error
    );

    return Promise.resolve(false);
  }
}

// ========================================
// 10. ABRIR Y CERRAR FORMULARIO
// ========================================

function openCreatePostModal() {

  createPostArea.style.transform =
    'translateY(0)';

  createPostArea.style.pointerEvents =
    'auto';
}

function closeCreatePostModal() {

  createPostArea.style.transform =
    'translateY(100vh)';

  createPostArea.style.pointerEvents =
    'none';
}

// ========================================
// 11. REINICIAR FORMULARIO
// ========================================

function resetPostForm() {

  form.reset();

  clearSelectedImage();

  var fields =
    form.querySelectorAll('.mdl-textfield');

  fields.forEach(function(field) {

    if (field.MaterialTextfield) {
      field.MaterialTextfield.checkDirty();
      field.MaterialTextfield.checkValidity();
    }
  });
}

// ========================================
// 12. EVENTOS DE APERTURA Y CIERRE
// ========================================

if (shareImageButton) {

  shareImageButton.addEventListener(
    'click',
    openCreatePostModal
  );
}

if (closeCreatePostModalButton) {

  closeCreatePostModalButton.addEventListener(
    'click',
    function() {

      if (submitting) {
        showMessage(
          'Espera a que termine la publicacion'
        );
        return;
      }

      closeCreatePostModal();
      resetPostForm();
    }
  );
}

// ========================================
// 13. LIMPIAR TARJETAS
// ========================================

function clearCards() {

  sharedMomentsArea.innerHTML = '';
}

// ========================================
// 14. CREAR TARJETA
// ========================================

function createCard(data) {

  var cardWrapper =
    document.createElement('div');

  cardWrapper.className =
    'shared-moment-card mdl-card mdl-shadow--2dp';

  var cardTitle =
    document.createElement('div');

  cardTitle.className =
    'mdl-card__title';

  // Utilizar la URL real de cada post
  var imagenPublicacion =
    data.image || imageUrl;

  if (
    imagenPublicacion.indexOf('sf-boat.jpg') !== -1
  ) {
    imagenPublicacion = imageUrl;
  }

  cardTitle.style.backgroundImage =
    'url("' + imagenPublicacion + '")';

  cardTitle.style.backgroundSize =
    'cover';

  cardTitle.style.backgroundPosition =
    'center';

  cardTitle.style.height =
    '180px';

  var titleElement =
    document.createElement('h2');

  titleElement.className =
    'mdl-card__title-text';

  titleElement.style.color =
    'white';

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

  supportingText.style.textAlign =
    'center';

  cardWrapper.appendChild(supportingText);

  if (data.pending) {

    var pendingText =
      document.createElement('div');

    pendingText.textContent =
      'Pendiente de sincronizar';

    pendingText.style.padding =
      '8px';

    pendingText.style.textAlign =
      'center';

    pendingText.style.color =
      '#e91e63';

    cardWrapper.appendChild(pendingText);
  }

  sharedMomentsArea.appendChild(cardWrapper);

  if (
    typeof componentHandler !== 'undefined'
  ) {
    componentHandler.upgradeElement(
      cardWrapper
    );
  }
}

// ========================================
// 15. ORDENAR Y ACTUALIZAR FEED
// ========================================

function getPostTime(post) {

  var parts =
    String(post.id || '').split('_');

  var timestamp = Number(parts[1]);

  if (timestamp && Number.isFinite(timestamp)) {
    return timestamp;
  }

  return Date.parse(post.id) || 0;
}

function updateUI(data) {

  clearCards();

  if (!Array.isArray(data)) {
    return;
  }

  var sorted =
    data.slice().sort(function(a, b) {

      return getPostTime(b) - getPostTime(a);
    });

  sorted.forEach(function(post) {
    createCard(post);
  });
}

// ========================================
// 16. NORMALIZAR POSTS DE FIREBASE
// ========================================

function normalizePosts(data) {

  if (!data) {
    return [];
  }

  return Object.keys(data).map(
    function(key) {

      var post =
        Object.assign({}, data[key]);

      if (!post.id) {
        post.id = key;
      }

      return post;
    }
  );
}

// ========================================
// 17. UNIR POSTS SIN DUPLICADOS
// ========================================

function mergePosts(posts, pendingPosts) {

  var result = [];
  var ids = new Set();

  posts.concat(pendingPosts).forEach(
    function(post) {

      if (!post || !post.id) {
        return;
      }

      if (ids.has(post.id)) {
        return;
      }

      ids.add(post.id);
      result.push(post);
    }
  );

  return result;
}

// ========================================
// 18. CARGAR POSTS DE INDEXEDDB
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

    var pendingPosts =
      (results[1] || []).map(
        function(post) {

          return Object.assign({}, post, {
            pending: true
          });
        }
      );

    return mergePosts(
      posts,
      pendingPosts
    );
  });
}

// ========================================
// 19. ACTUALIZAR FEED
// ========================================

function refreshFeed() {

  var localPromise =
    loadLocalPosts()
      .then(function(posts) {

        currentPosts = posts;
        updateUI(posts);
      })
      .catch(function(error) {

        console.warn(
          '[UTEQGram] Error local:',
          error
        );
      });

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

      var remotePosts =
        normalizePosts(data);

      var savePromise =
        Promise.resolve();

      if ('indexedDB' in window) {

        savePromise = Promise.all(
          remotePosts.map(function(post) {

            return writeData(
              'posts',
              post
            );
          })
        )
        .catch(function(error) {

          console.warn(
            '[UTEQGram] Error cache local:',
            error
          );
        });
      }

      return savePromise
        .then(function() {

          return loadLocalPosts();
        })
        .then(function(localPosts) {

          var pendingPosts =
            localPosts.filter(
              function(post) {
                return post.pending;
              }
            );

          currentPosts = mergePosts(
            remotePosts,
            pendingPosts
          );

          updateUI(currentPosts);

          console.log(
            '[UTEQGram] Feed actualizado:',
            currentPosts.length
          );
        });
    })
    .catch(function(error) {

      console.log(
        '[UTEQGram] Modo offline:',
        error.message
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
// 20. URL DE PUBLICACION EN DATABASE
// ========================================

function firebasePostUrl(id) {

  var safeId = String(id)
    .replace(/[.#$[\]/]/g, '_');

  return firebaseBase +
    '/' +
    encodeURIComponent(safeId) +
    '.json';
}

// ========================================
// 21. GUARDAR POST EN REALTIME DATABASE
// ========================================

function sendData(post) {

  if (!post.id || !post.image) {

    return Promise.reject(
      new Error(
        'La publicacion no tiene ID o imagen'
      )
    );
  }

  console.log(
    '[UTEQGram] Enviando post:',
    post.id
  );

  console.log(
    '[UTEQGram] Imagen enviada a Database:',
    post.image
  );

  var payload = {
    id: post.id,
    title: post.title,
    location: post.location,
    image: post.image
  };

  return fetch(firebasePostUrl(post.id), {

    method: 'PUT',

    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },

    body: JSON.stringify(payload)
  })
  .then(function(response) {

    if (!response.ok) {

      var error = new Error(
        'Firebase respondio: ' +
        response.status
      );

      error.serverError = true;
      throw error;
    }

    return response.json();
  })
  .then(function(data) {

    console.log(
      '[UTEQGram] Imagen confirmada por Database:',
      data.image
    );

    if (data.image !== post.image) {

      throw new Error(
        'La URL guardada no coincide con la enviada'
      );
    }

    return data;
  });
}

// ========================================
// 22. GUARDAR POST PENDIENTE
// ========================================

function savePendingPost(post) {

  if (!('indexedDB' in window)) {

    return Promise.reject(
      new Error(
        'IndexedDB no disponible'
      )
    );
  }

  return writeData(
    'sync-posts',
    post
  )
  .then(function() {

    if (!('serviceWorker' in navigator)) {
      return;
    }

    return navigator.serviceWorker.ready
      .then(function(registration) {

        if (!registration.sync) {

          console.log(
            '[UTEQGram] Background Sync no disponible'
          );

          return;
        }

        return registration.sync.register(
          'sync-new-posts'
        );
      })
      .catch(function(error) {

        console.warn(
          '[UTEQGram] Error registrando sync:',
          error
        );
      });
  });
}

// ========================================
// 23. SINCRONIZAR POSTS PENDIENTES
// ========================================

function syncPendingPosts() {

  if (
    !navigator.onLine ||
    !('indexedDB' in window)
  ) {
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

              return writeData(
                'posts',
                post
              );
            })
            .catch(function(error) {

              console.warn(
                '[UTEQGram] Post pendiente:',
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
// 24. PUBLICAR EN DATABASE
// ========================================

function publishPost(post, allowOffline) {

  // Intentar guardar primero en Firebase
  return sendData(post)
    .then(function(savedPost) {

      console.log(
        '[UTEQGram] Publicacion guardada:',
        savedPost.title
      );

      if (savedPost.image !== post.image) {

        throw new Error(
          'Error: imagen incorrecta en Database'
        );
      }

      // La notificacion no bloquea el post
      notifySuccessfulPost(post);

      var localSave = Promise.resolve();

      if ('indexedDB' in window) {

        localSave = writeData(
          'posts',
          savedPost
        )
        .catch(function(error) {

          console.warn(
            '[UTEQGram] Error guardando local:',
            error
          );
        });
      }

      return localSave
        .then(function() {

          closeCreatePostModal();
          resetPostForm();

          showMessage(
            'Publicacion realizada correctamente'
          );

          return refreshFeed();
        })
        .then(function() {

          return {
            published: true,
            pending: false
          };
        });
    })
    .catch(function(error) {

      // No convertir fallos de permisos
      // en publicaciones offline.
      if (error.serverError) {

        showMessage(
          'Firebase rechazo la publicacion'
        );

        throw error;
      }

      // Si hay foto, no enviarla a cola
      // porque el archivo no esta en IndexedDB.
      if (!allowOffline) {
        throw error;
      }

      // Si el POST ya se guardo pero fallo
      // el procesamiento local, no encolar
      // nuevamente como una publicacion offline.
      if (
        error.message ===
        'Error: imagen incorrecta en Database'
      ) {
        throw error;
      }

      console.log(
        '[UTEQGram] Guardando pendiente:',
        post.id
      );

      return savePendingPost(post)
        .then(function() {

          closeCreatePostModal();
          resetPostForm();

          showMessage(
            'Guardada para sincronizar'
          );

          return refreshFeed();
        })
        .then(function() {

          return {
            published: false,
            pending: true
          };
        });
    });
}

// ========================================
// 25. FORMULARIO - PUBLICACION
// ========================================

if (form) {

  form.addEventListener('submit', function(event) {

    event.preventDefault();

    if (submitting) {
      return;
    }

    var title =
      titleInput.value.trim();

    var location =
      locationInput.value.trim();

    if (!title || !location) {

      alert(
        'Ingresa un titulo y una ubicacion.'
      );

      return;
    }

    // Capturamos la foto antes
    // de iniciar el proceso
    var fotoParaPublicar = selectedImage;

    if (
      fotoParaPublicar &&
      !navigator.onLine
    ) {

      showMessage(
        'Conectate a Internet para subir la fotografia'
      );

      return;
    }

    // ID unico para foto y publicacion
    var post = {

      id:
        'post_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .slice(2, 10),

      title: title,
      location: location,

      // URL predeterminada si no hay foto
      image: imageUrl
    };

    submitting = true;

    if (postButton) {

      postButton.disabled = true;
      postButton.textContent = 'Publicando...';
    }

    if (postImageInput) {
      postImageInput.disabled = true;
    }

    if (removeImageButton) {
      removeImageButton.disabled = true;
    }

    // Crear la promesa que prepara
    // la imagen del post.
    var prepararImagen;

    if (fotoParaPublicar) {

      showMessage(
        'Subiendo fotografia a Firebase Storage...'
      );

      prepararImagen = subirFotografia(
        fotoParaPublicar,
        post.id
      );

    } else {

      prepararImagen =
        Promise.resolve(imageUrl);
    }

    prepararImagen
      .then(function(urlFotografia) {

        // IMPORTANTE:
        // Asignar la URL real ANTES de
        // enviar a Realtime Database.
        post.image = urlFotografia;

        console.log(
          '[UTEQGram] URL FINAL:',
          post.image
        );

        // Comprobar que una foto capturada
        // no use la imagen predeterminada.
        if (
          fotoParaPublicar &&
          post.image === imageUrl
        ) {
          throw new Error(
            'La fotografia real no fue asignada'
          );
        }

        // Solo las publicaciones sin foto
        // mantienen el modo offline actual.
        return publishPost(
          post,
          !fotoParaPublicar
        );
      })
      .catch(function(error) {

        console.error(
          '[UTEQGram] Error publicando:',
          error
        );

        showMessage(
          error.message ||
          'No se pudo publicar'
        );
      })
      .finally(function() {

        submitting = false;

        if (postButton) {

          postButton.disabled = false;
          postButton.textContent = 'Postear!';
        }

        if (postImageInput) {
          postImageInput.disabled = false;
        }

        if (removeImageButton) {
          removeImageButton.disabled = false;
        }
      });

  });

}

// ========================================
// 26. RECUPERACION DE INTERNET
// ========================================

window.addEventListener(
  'online',
  function() {

    console.log(
      '[UTEQGram] Conexion recuperada'
    );

    syncPendingPosts()
      .catch(function(error) {

        console.error(
          '[UTEQGram] Error de sync:',
          error
        );
      });
  }
);

// ========================================
// 27. CARGA INICIAL
// ========================================

refreshFeed()
  .then(function() {

    if (navigator.onLine) {
      return syncPendingPosts();
    }
  })
  .catch(function(error) {

    console.error(
      '[UTEQGram] Error cargando feed:',
      error
    );
  });
