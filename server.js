'use strict'
const dotenv = require("dotenv").config();
const {port, redirectUri, corsOptions} = process.env.PROD ? require("./app/prod.js") : require("./app/dev.js");
const mongoBase = process.env["MONGO_BASE"]
const dbUrl = `${mongoBase}/twitch`;
const agendaDb = `${mongoBase}/twitch_agenda`;
const cfg = {
    clientId: process.env["CLIENT_ID"],
    secret: process.env["CLIENT_SECRET"],
    redirectUri: redirectUri
};

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const axios = require("axios");

const app = express();

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(
    session({
        secret: process.env["SESSION_SECRET"],
        cookie: {
            maxAge: 600000
        }
    })
)

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const User = require("./app/models/user.js")(mongoose);
const Streamer = require("./app/models/streamer.js")(mongoose);
const Clip = require("./app/models/clip.js")(mongoose);

mongoose
    .connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    })
    .then(() => {
        console.log("Connected to the db");
    })
    .catch(err => {
        console.log("Cannot connect to the db", err);
        process.exit();
    })

// users
const userController = require("./app/controllers/user.js");
app.use("/user/", userController.checkUserSession);
var userRouter = express.Router();
userRouter.get("/", userController.getCurrentUser);
app.use('/api/user', userRouter);

// auth
const authRouter = require("./app/controllers/auth.js")(User, cfg);
app.use("/twitch/", authRouter);

// server tokens
let token = null;
let expires = 0;

// admin
const adminController = require("./app/controllers/admin.js")(User, Streamer, cfg, () => token);
app.use("/api/admin", adminController.checkAdmin);
app.use("/devki", adminController.checkAdmin);
const adminRouter = express.Router();
adminRouter.get("/users", adminController.findUsers);
adminRouter.get("/streamers", adminController.findStreamers);
adminRouter.get("/channels", adminController.findChannels);
adminRouter.post("/streamers", adminController.addStreamer);
adminRouter.delete("/streamers", adminController.deleteStreamer);
adminRouter.post("/admins", adminController.addAdmin);
adminRouter.delete("/admins", adminController.deleteAdmin);
app.use("/api/admin", adminRouter);

// static
app.use(express.static("static"));

// agenda
const Agenda = require("agenda");
const agenda = new Agenda({db: {address: agendaDb}});
    
async function getClips(reject) {
    const from = new Date(Date.now() - 1000 * 3600 * 24);
    if (token) {
        try {
            const streamersWithClips = await Streamer.find({}).exec();
            streamersWithClips.forEach(async streamer => {
                console.log(`Getting clips for ${streamer.name}`);
                const response = await axios.get("https://api.twitch.tv/helix/clips", {
                    params: {
                        broadcaster_id: streamer.userId,
                        first: "100",
                        started_at: from.toJSON()
                    },
                    headers: {
                        "Accept": "application/json",
                        "Client-Id": cfg.clientId,
                        "Authorization": `Bearer ${token}`
                    }
                });
                const data = response.data.data;
                console.log(data);
                data.forEach(async clipData => {
                    const dbClip = await Clip.findOne({url: clipData.url});
                    if (!dbClip) {
                        const clip = new Clip({
                            userId: clipData.broadcaster_id,
                            userName: clipData.broadcaster_name,
                            title: clipData.title,
                            url: clipData.url,
                            creator: clipData.creator_name,
                            creation: clipData.created_at,
                            thumbnail: clipData.thumbnail_url,
                            posted: false
                        });
                        const saved = await clip.save();
                        console.log(saved);
                    }
                });
            });
        } catch (err) {
            reject(err);
        }
    }
}

async function postClips(reject) {
    const from = new Date(Date.now() - 1000 * 60 * 7);
    console.log(from.toJSON());
    try {
        const streamersWithClips = await Streamer.find({}).exec();
        streamersWithClips.forEach(async streamer => {
            console.log(`Posting clips for ${streamer.name}:${streamer.userId}`);
            const clips = await Clip.find({userId: streamer.userId, posted: false, creation: {"$lte": from}}).exec();
            clips.forEach(async clip => {
                console.log(clip);
                const response = await axios.post(streamer.webhook, 
                    {
                        "content": `Clip "${clip.title}" created by ${clip.creator} - ${clip.url}`
                    }
                );
                console.log(response);
                await Clip.update({_id: clip._id}, {posted: true}).exec();
                console.log("Updated");
            });
            console.log("Done posting");
        });
    } catch (err) {
        reject(err);
    }
}

async function getToken(accept, reject) {
    try {
        const response = await axios.post(`https://id.twitch.tv/oauth2/token`,
            {},
            {
                params: {
                    client_id: cfg.clientId,
                    client_secret: cfg.secret,
                    grant_type: "client_credentials"
                }
            }
        );
        const data = response.data;
        const token = data['access_token'];
        const expires = data['expires_in'];
        console.log(`Access token is ${token} expires in ${expires}`);
        accept(token, expires);
    } catch (err) {
        reject(err);
    }
}

async function acceptToken(newToken, newExpires) {
    token = newToken;
    expires = newExpires;
    try {
        const oneTimeJobs = await agenda.jobs({name: "get token"});
        console.log(`One-time jobs count: ${oneTimeJobs.length}`);
    } catch (err) {
        console.log(err);
    }
    try {
        const scheduledJobs = await agenda.jobs({name: "refresh token"});
        console.log(`Repeated: ${scheduledJobs.length}`);
        scheduledJobs.forEach(job => {
            job.remove();
            console.log(`scheduled 'refresh token' jobs removed`);
        });
        await agenda.schedule(`in ${expires} seconds`, 'refresh token');
        console.log(`Scheduled renewal in ${expires}`);
    } catch(err) {
        console.log(err);
    }
}

// define jobs
agenda.define('get token', async function() {
    await getToken(acceptToken, err => console.log(err));
});

agenda.define('refresh token', async function() {
    await getToken(acceptToken, err => console.log(err));
});

agenda.define('get clips', async function() {
    await getClips(err => console.log(err));
});

agenda.define('post clips', async function() {
    await postClips(err => console.log(err));
});

// start scheduling
(async function() {
    await agenda.start();
    console.log("Agenda started");
    // cleanup
    const tokenJobs = await agenda.jobs({name: "get token"});
    if (tokenJobs.length) {
        tokenJobs.forEach(job => {
            job.remove();
            console.log(`scheduled 'get token' job removed`);
        });
    }

    const clipJobs = await agenda.jobs({name: "get clips"});
    if (clipJobs.length) {
        clipJobs.forEach(job => {
            job.remove();
            console.log(`scheduled 'get clips' job removed`);
        });
    }
    
    const postClipJobs = await agenda.jobs({name: "post clips"});
    if (postClipJobs.length) {
        postClipJobs.forEach(job => {
            job.remove();
            console.log(`scheduled 'post clips' job removed`);
        });
    }
    
    // init jobs
    agenda.now('get token');
    agenda.every("5 minutes", "get clips");
    agenda.every("5 minutes", "post clips");
})();

async function graceful() {
    await agenda.stop();
    process.exit(0);
  }
   
process.on('SIGTERM', graceful);
process.on('SIGINT' , graceful);

// start
app.listen(port, () => {
    console.log(`Listening on ${port}`);
});