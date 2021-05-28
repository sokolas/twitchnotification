var app = new Vue({
    el: '#app',
    data: {
        message: 'Hello',
        users: [],
        streamers: [],
        channels: [],
        name: ""
    },
    methods: {
        refreshUsers: function() {
            fetch("/api/admin/users")
            .then(response => response.json())
            .then(json => {
                console.log(json);
                this.users = json;
            })
            .catch(err => console.log(err));
        },
        refreshStreamers: function() {
            fetch("/api/admin/streamers")
            .then(response => response.json())
            .then(json => {
                console.log(json);
                this.streamers = json;
            })
            .catch(err => console.log(err));
        },
        findChannel: function() {
            fetch(`/api/admin/channels?name=${this.name}`)
                .then(response => response.json())
                .then(json => {
                    this.channels = json.channels;
                })
        },
        addChannel: function(id, name, webhook) {
            console.log(JSON.stringify({id: id, name: name, webhook: webhook}));
            fetch(`/api/admin/streamers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({id: id, name: name, webhook: webhook})
            })
            .then(response => this.refreshStreamers())
            .catch(e => console.log(e));
        },
        deleteChannel: function(id) {
            fetch(`/api/admin/streamers`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({id: id})
            })
            .then(response => this.refreshStreamers());
            console.log(id);
        },
        addAdmin: function(id) {
            fetch(`/api/admin/admins/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({id: id})
            })
            .then(response => this.refreshUsers())
            .catch(e => console.log(e));
        },
        deleteAdmin: function(id) {
            fetch(`/api/admin/admins/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({id: id})
            })
            .then(response => this.refreshUsers())
            .catch(e => console.log(e));
        }

    },
    created: function() {
            this.refreshUsers();
            this.refreshStreamers();
        }
});