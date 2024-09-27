import { del, entries } from "/modules/idb-keyval/dist/index.js";
const filesToCache = [
    "/",
    "manifest.json",
    "index.html",
    "offline.html",
    "404.html",
    "https://fonts.googleapis.com/css2?family=Fira+Sans:wght@100&family=Roboto+Slab&display=swap",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css",
];

const staticCacheName = "static-cache";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(staticCacheName).then((cache) => {
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener("activate", (event) => {
    const cacheWhitelist = [staticCacheName];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches
            .match(event.request)
            .then(async () => {
                const response = await fetch(event.request);

                if (response.status === 404) {
                    return caches.match("404.html");
                }
                if (response.status === 206) {
                    return response;
                }
                const cache = await caches.open(staticCacheName);
                cache.put(event.request.url, response.clone());
                return response;
            })
            .catch((error) => {
                console.log("Error", event.request.url, error);
                return caches.match("offline.html");
            })
    );
});

self.addEventListener("sync", function (event) {
    if (event.tag === "sync-records") {
        event.waitUntil(syncRecords());
    }
});

let syncRecords = async function () {
    entries().then((entries) => {
        entries.forEach((entry) => {
            let record = entry[1];
            let formData = new FormData();
            formData.append("id", record.id);
            formData.append("ts", record.ts);
            formData.append("title", record.title);
            formData.append("audio", record.audio, record.id + ".mp3");
            fetch("/upload", {
                method: "POST",
                body: formData,
            })
                .then(function (res) {
                    if (res.ok) {
                        res.json().then(function (data) {
                            del(data.id);
                        });
                    } else {
                        console.log(res);
                    }
                })
                .catch(function (error) {
                    console.log(error);
                });
        });
    });
};

self.addEventListener("notificationclick", function (event) {
    let notification = event.notification;
    event.waitUntil(
        clients.matchAll().then(function (clis) {
            clis.forEach((client) => {
                client.navigate(notification.data.redirectUrl);
                client.focus();
            });
            notification.close();
        })
    );
});

self.addEventListener("notificationclose", function (event) {
});

self.addEventListener("push", function (event) {

    var data = { title: "title", body: "body", redirectUrl: "/" };

    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.body,
        icon: "assets/img/android/android-launchericon-96-96.png",
        badge: "assets/img/android/android-launchericon-96-96.png",
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
            redirectUrl: data.redirectUrl,
        },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});
