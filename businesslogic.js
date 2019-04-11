/**
 * These are responsible for sending back responses from /slash_commands on slack,
 * these will only execute after they have been authorized as coming from slack,
 * and that the user has a token issued by the oauth2 systme, and has been parsed.
 *
 * See https://api.slack.com/slash-commands,
 * and https://api.slack.com/docs/message-attachments 
 * for what you should send back for content
 *
 * In the req object passed in req.body has a mapping of key=value pairs from the slack command,
 * in addition it has req.tokens of the users linked oauth2 system response
 */

const axios = require('axios')

module.exports = function(pg) {

  async function do_command(req, res) {
    /*
      req.tokens.common_auth_tokens: {
        access_token, token_type, expires_in, refresh_token, scope
      }

      req.body: {
        channel_id, channel_name, command, response_url, team_domain, team_id, text, token,
        trigger_id, user_id, user_name
      }

      command + text = /aka command
    */

    const apps = await axios.get(`${process.env.AKKERIS_API}/apps`);
    const appNames = apps.map(a => a.name);
    res.status(200).json({
      "response_type": "in_channel",
      "text": "Results for '/aka apps'",
      "attachments": [
        {
          "text": appNames,
          "ts": Date.now(),
        }
      ]
    });
    
    // res.json({
    //   "attachments": [
    //     {
    //       "fallback": `Run Akkeris command!`,
    //       "color": "#36a64f",
    //       "pretext": "Some other functionality",
    //       "title": "Some other functionality",
    //       "title_link": `https://asdf`,
    //       "text": "Some other functionality",
    //       "footer": "Your App",
    //       "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
    //       "ts": Date.now()
    //     }
    //   ]
    // })

    // res.sendStatus(200);
  }

  return {
    do_command
  }
}
