const baseUrl = process.env["BASE_URL"];
const port = process.env["PORT"];

module.exports = {
    baseUrl: baseUrl,
    port: port,
    redirectUri: `${baseUrl}/twitch/`,
    corsOptions: {
        origin: `${baseUrl}`
    }
}

