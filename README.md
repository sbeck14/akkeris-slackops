# Akkeris SlackOps

A Slack App that provides Akkeris functionality.

## Slack Setup

Create a new App with Slack and associate a Bot User. Register the slash command `/aka` with a request URL of `$VANITY_URL/aka`. Enable interactivity, and set the Request URL to `$VANITY_URL/interact`. This should get you all of the environment variables you need to proceed!

## Environment Variables

* `AKKERIS_API` - Akkeris Controller API URL
* `AKKERIS_UI` - Akkeris UI URL
* `BOT_USER_TOKEN` - Obtained from Slack
* `DATABASE_URL` - URL of a Postgres database
* `SLACK_SIGNING_SECRET` - Obtained from Slack
* `PORT` - Port to listen on (optional)

*OAuth 2 Variables*

* `SESSION_COOKIE_SECRET` - A random secret you choose, changing this will invalidate all of your oauth2 flows.
* `ENCRYPTION_SECRET` - A random secret you choose, do not change this, if you do you'll invalidate all your tokens stored.
* `VANITY_URL` - The url (https://www.google.com) where this app is being hosted (just the base), it's used to prompt the user to login and access resources for your app.
* `OAUTH2_AUTHORIZE_URL` - The full URL where to begin an authorize/authorization process. 
* `OAUTH2_TOKEN_URL` - The full URL where tokens for `refresh_token` and `authorization_code` exchanges happen.
* `OAUTH2_CLIENT_ID` - The oauth2 client id received
* `OAUTH2_CLIENT_SECRET` - The oauth2 client secret received
* `OAUTH2_REDIRECT_URI` - This should be `$VANITY_URL/auth/callback` its a seperate value (rather than derived from vanity url) to help ease testing, as sometimes the redirect uri is not the same as the vanity url when working locally.

## Running

Assuming `config.env` contains all of the appropriate environment variables:

```bash
source config.env
node main.js
```

or

```bash
docker build -t akkeris-slackops .
docker run --rm -p 9000:9000 --env-file config.env akkeris-slackops
```

## Notes

Adapted from @trevorlinton's oauth2 template - https://github.com/trevorlinton/slackbot-oauth2