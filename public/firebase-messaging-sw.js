importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBjs-atkLON7zhMS363sEhP-AmI6dwm1-I",
  authDomain: "comida-familiar.firebaseapp.com",
  projectId: "comida-familiar",
  storageBucket: "comida-familiar.firebasestorage.app",
  messagingSenderId: "133743597694",
  appId: "1:133743597694:web:8a39542b85a18bfb1de02f",
});

const messaging = firebase.messaging();

// Push en background (app cerrada / pestaña sin foco).
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, tag } = payload.notification ?? payload.data ?? {};
  self.registration.showNotification(title ?? "Comida Familiar", {
    body: body ?? "",
    icon: icon ?? "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag,
    data: payload.data ?? {},
  });
});

// Tap en la notificación → abrir/enfocar la ruta.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.includes(url));
      if (open) return open.focus();
      return clients.openWindow(url);
    })
  );
});
