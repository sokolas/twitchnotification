const axios = require("axios");
const express = require("express");

module.exports = (User, cfg) => {
    async function authTwitch (req, res) {
        const code = req.query.code;
        if (code == null) {
            res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${cfg.clientId}&redirect_uri=${cfg.redirectUri}&response_type=code`);
        } else {
            try {
                // get tokens
                const tokenResponse = await axios.post("https://id.twitch.tv/oauth2/token",
                {},
                {
                    params: {
                        client_id: cfg.clientId,
                        client_secret: cfg.secret,
                        code: code,
                        grant_type: "authorization_code",
                        redirect_uri: cfg.redirectUri
                    }
                });
                // console.log(tokenResponse);
                const {access_token, refresh_token} = tokenResponse.data;
                // get user info
                const userResponse = await axios.get("https://api.twitch.tv/helix/users",
                {
                    headers: {
                        "Accept": "application/json",
                        "Client-Id": cfg.clientId,
                        "Authorization": `Bearer ${access_token}`
                    }
                });
                // console.log(userResponse.data.data[0]);
                const {display_name, id, profile_image_url} = userResponse.data.data[0];
                
                // check if the user already exists
                console.log("check if the user already exists");
                let user = await User.findOne({userId: id});
                if (!user) {
                    console.log(`New user ${id}:${display_name}`);
                    user = new User({
                        userId: id,
                        name: display_name
                    });
                    let users = await User.countDocuments({});
                    if (users == 0) {
                        console.log("No users found");
                        user.isAdmin = true;
                        console.log("Saved admin");
                    } else {
                        user.isAdmin = false;
                    }
                    user = await user.save();
                    console.log("Saved user");
                    console.log(user);
                } else {
                    console.log(`Found user ${user.userId}:${user.name}`);
                }
                

                req.session.accessToken = access_token;
                req.session.refreshToken = refresh_token;
                req.session.name = display_name;
                req.session.userId = id;
                req.session.avatar = profile_image_url;
                req.session.authorized = true;
                // TODO check for streamer and admin collections
                req.session.role = {user: true};
                if (user.isAdmin) {
                    req.session.role.admin = true;
                    console.log(`${display_name} is admin`);
                }
    
                console.log(`${display_name} signed in`);
    
                res.redirect("/user");
            } catch(error) {
                console.log(error);
                res.status(500).send({"error": "error"});
            }
        }
    }
    
    const authRouter = express.Router();
    authRouter.get("/", authTwitch);

    return authRouter;
}