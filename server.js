const express = require('express');
const multer = require('multer');
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra")
const webpush = require('web-push');
require("dotenv").config();
const app = express();

app.use(express.json());

// app.use((req, res, next) => {
//     console.log(new Date().toLocaleString() + " " + req.url);
//     next();
// });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

  
app.use(express.static(path.join(__dirname, "public")));
app.use('/modules', express.static(path.join(__dirname, 'node_modules')));

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
  

const UPLOAD_PATH = path.join(__dirname, "public", "uploads");
var uploadAudio = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, UPLOAD_PATH);
        },
        filename: function (req, file, cb) {
            let fn = file.originalname.replaceAll(":", "-");
            cb(null, fn);
        }
    })
}).single('audio');
  

app.post('/upload', function (req, res) {
    uploadAudio(req, res, async function (err) {
        if(err) {
            console.log(err);
            res.json({
                success: false,
                error: {
                    message: 'Upload failed' + JSON.stringify(err)
                }
            })
        } else {
            res.json({
                success: true,
                id: req.body.id
            });
            await sendPushNotifications(req.body.title);
        }
    });
});

app.get('/records', function (req, res) {
    let files = fse.readdirSync(UPLOAD_PATH);
    files = files.reverse().slice(0, 10);
    console.log("In", UPLOAD_PATH, "there are", files);
    res.json({
        files
    }); 
});


let subscriptions = [];
const SUBS_FILENAME = 'subscriptions.json';
try {
    if(!fs.existsSync(SUBS_FILENAME)) fs.writeFileSync(SUBS_FILENAME, '');
    subscriptions = JSON.parse(fs.readFileSync(SUBS_FILENAME));
} catch (error) {
    console.error(error);    
}

app.post("/saveSubscription", function(req, res) {
    console.log(req.body);
    let sub = req.body.sub;
    subscriptions.push(sub);
    fs.writeFileSync(SUBS_FILENAME, JSON.stringify(subscriptions));
    res.json({
        success: true
    });
});

async function sendPushNotifications(recordTitle) {
    webpush.setVapidDetails('mailto:luka.slugecic@gmail.com',
    'BEec4ImACUxKI_WPUNLmTKoD8IkVrG11A4JQE_vR2GCorHj43CKTz5eTxV49FyNovFzRUo0tDs48-Po5PtLk7As',
    'R5Ng0awQwl9n3bX8KepBv55pMByf4Ei9jwVXXEKkx-Q'
    );

    subscriptions.forEach(async sub => {
        try {
            console.log("Sending notif to", sub);
            await webpush.sendNotification(sub, JSON.stringify({
                title: 'New record!',
                body: 'Somebody just recorded new audio: ' + recordTitle,
                redirectUrl: '/index.html'
              }));    
        } catch (error) {
            console.error(error);
        }
    });
}


const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 5001;

if(externalUrl){
  const hostname = '0.0.0.0';
  app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ and from outside on ${externalUrl}`);
  });
} else {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
}