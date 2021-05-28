const baseUrl = process.env["BASE_URL"];
const port = process.env["PORT"];

module.exports = {
    baseUrl: baseUrl,
    port: port,
    redirectUri: `${baseUrl}:${port}/twitch/`,
    corsOptions: {
        origin: `${baseUrl}:${port}`
    }
}
