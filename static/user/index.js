var app = new Vue({
    el: '#app',
    data: {
        username: "username",
        avatar: "avatar.jpg",
        admin: false
    },
    created: function() {
        fetch("/api/user")
            .then(response => response.json())
            .then(json => {
                this.username = json.name;
                this.avatar = json.avatar;
                this.admin = json.admin;
            })
    }
});