module.exports = {
    checkUserSession: function(req, res, next) {
        if (req.session.authorized) {
            next();
        } else {
            console.log("Unauthorized access to " + req.originalUrl);
            res.redirect("/twitch/");
        }
    },

    getCurrentUser: function(req, res) {
        res.send({
            id: req.session.userId,
            name: req.session.name,
            avatar: req.session.avatar,
            admin: req.session.role.admin
        });
    }
}