# twitchnotification

## prerequisites
Twitch app registration - https://dev.twitch.tv/console/apps
You should use http(s)://<server>:(port)/twitch/ redirect url!

Use Discord webhooks - https://discord.com/developers/docs/resources/webhook#create-webhook

MongoDB - https://docs.mongodb.com/manual/installation/


## installation
rename .env_example to .env
  
modify .env file, use your twitch client id and secret, use random string for SESSION_SECRET

  Only use PROD=true when you have a properly set up webserver on a 80 or 443 port!

`npm install`

## running
`node server.js`

## first setup
Log in with your twitch, you're now an admin and can search, add and delete webhooks for streamers.

Clips will appear ~5 minutes after creation!
  
# support me
  https://www.donationalerts.com/r/sokolas
