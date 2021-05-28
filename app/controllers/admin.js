const axios = require("axios");

module.exports = (User, Streamer, cfg, tokenSupplier) => {
    return {
        findUsers: function(req, res) {
            User.find({})
                .then(data => {
                    res.send(data);
                })
                .catch(err => {
                    res.status(500).send({
                        message: err.message || "Some error"
                    });
                });
        },

        findStreamers: function(req, res) {
            Streamer.find({})
                .then(data => {
                    res.send(data);
                })
                .catch(err => {
                    res.status(500).send({
                        message: err.message || "Some error"
                    });
                });
        },

        checkAdmin: function(req, res, next) {
            // console.log(req.session.role);
            if (req.session.role && req.session.role.admin) {
                next();
            } else {
                res.status(401).send({error: "Unauthorized"});
            }
        },

        findChannels: function(req, res) {
            const token = tokenSupplier();
            const name = req.query.name;
            axios.get("https://api.twitch.tv/helix/search/channels", {
                params: {query: name},
                headers: {
                    "Accept": "application/json",
                    "Client-Id": cfg.clientId,
                    "Authorization": `Bearer ${token}`
                }
            })
            .then(response => response.data)
            .then(data => {
                var channels = [];
                data.data.forEach(channel => {
                    channels.push({
                        id: channel.id,
                        name: channel.display_name,
                        webhook: ''
                    });
                });
                res.json({channels: channels});
            })
            .catch(err => {
                console.log(err);
                res.json({error: err.message, channels: []});
            });
        },

        addStreamer: async function(req, res) {
            console.log(req.body);
            const id = req.body.id;
            const name = req.body.name;
            const webhook = req.body.webhook;
            if (!webhook.startsWith("https://discord.com/api/webhooks/")) {
                res.status(500).send({"error": "invalid webhook"});
            } else {
                let streamer = await Streamer.findOne({userId: id});
                if (streamer == null) {
                    streamer = new Streamer();
                }
                streamer.name = name;
                streamer.webhook = webhook;
                
                streamer = await streamer.save();
                console.log(streamer);
                res.send({"result": "ok"});
            }
        },

        deleteStreamer: async function(req, res) {
            const id = req.body.id;
            let streamer = await Streamer.deleteOne({userId: id});
            console.log(streamer);
            res.send({"result": "ok"});
        },

        addAdmin: async function(req, res) {
            console.log(req.body);
            const id = req.body.id;
            
            let user = await User.findOne({userId: id});
            if (user != null) {
                user.isAdmin = true;
                user = await user.save();
                console.log(user);
            }
            res.send({"result": "ok"});        
        },

        deleteAdmin: async function(req, res) {
            console.log(req.body);
            const id = req.body.id;
            
            let user = await User.findOne({userId: id});
            if (user != null) {
                user.isAdmin = false;
                user = await user.save();
                console.log(user);
            }
            res.send({"result": "ok"});        
        },
    }
}