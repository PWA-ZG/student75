import { set } from "/modules/idb-keyval/dist/index.js";

document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("form");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        var fileInput = document.getElementById("fileToUpload");
        var file = fileInput.files[0];

        if (file) {
            var formData = new FormData();
            formData.append("fileToUpload", file);
            var name = file.name.substring(0, file.name.lastIndexOf("."));

            try {
                if("serviceWorker" in navigator && "SyncManager" in window) {
                  let ts = new Date().toISOString();
                  let id = ts + name.replace(/\s/g, '_');
                  set(id,
                    { id,
                      ts,
                      title: name,
                      audio: file,
                  });
                  navigator.serviceWorker.ready.then((sw) => {
                    sw.sync.register("sync-records");
                  }).then(() => {
                    window.location.href = "/";
                  })
                  
                } else {
                  alert("Your browser does not support background sync, please use a different browser.");
                  return false;
                }
            } catch (error) {
                console.error('Error uploading file:', error);
            }
            
        } else {
            console.error("No file selected");
        }
    });
});