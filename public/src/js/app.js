
/* =========================================
   UTEQGRAM - APP.JS
   Service Worker y notificaciones
   ========================================= */

var swRegistration = null;

// =========================================
// REGISTRAR SERVICE WORKER
// =========================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker
      .register('/sw.js')
      .then(function(registration) {
        swRegistration = registration;
        console.log('Service Worker registered');
      })
      .catch(function(error) {
        console.error(
          'Error al registrar Service Worker:',
          error
        );
      });
  });
}

// =========================================
// MOSTRAR NOTIFICACION
// =========================================

function mostrarNotificacion(titulo, mensaje) {
  if (!('Notification' in window)) {
    console.log('Notificaciones no compatibles');
    return Promise.resolve(false);
  }

  if (Notification.permission !== 'granted') {
    console.log('Permiso de notificaciones no concedido');
    return Promise.resolve(false);
  }

  if (!('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker.ready
    .then(function(registration) {
      return registration.showNotification(titulo, {
        body: mensaje,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'uteqgram-notificacion',
        vibrate: [100, 50, 100],
        data: {
          url: '/'
        }
      });
    })
    .then(function() {
      console.log('Notificación enviada');
      return true;
    })
    .catch(function(error) {
      console.error(
        'Error al mostrar notificación:',
        error
      );
      return false;
    });
}

// =========================================
// SOLICITAR PERMISOS
// =========================================

function habilitarNotificaciones() {
  if (!('Notification' in window)) {
    alert('Este navegador no admite notificaciones.');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    alert('Este navegador no admite Service Workers.');
    return;
  }

  if (Notification.permission === 'denied') {
    alert(
      'Las notificaciones están bloqueadas. ' +
      'Habilítalas desde la configuración del navegador.'
    );
    return;
  }

  function probarNotificacion() {
    mostrarNotificacion(
      'UTEQGram',
      '¡Las notificaciones están habilitadas!'
    );
  }

  if (Notification.permission === 'granted') {
    probarNotificacion();
    return;
  }

  Notification.requestPermission()
    .then(function(permission) {
      if (permission === 'granted') {
        probarNotificacion();
      } else {
        console.log(
          'Permiso de notificaciones no concedido'
        );
      }
    })
    .catch(function(error) {
      console.error(
        'Error solicitando permiso:',
        error
      );
    });
}

// =========================================
// BOTONES DE NOTIFICACIONES
// =========================================

var notificationButtons = document.querySelectorAll(
  '.enable-notifications'
);

notificationButtons.forEach(function(button) {
  button.addEventListener(
    'click',
    habilitarNotificaciones
  );
});
