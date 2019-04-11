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

async function getApps(token, replyTo) {
  try {
    const opts = { headers: { 'Authorization': `Bearer ${token}` } };
    const { data: apps } = await axios.get(`${process.env.AKKERIS_API}/apps`, opts);
    // Format app names
    const formattedApps = apps.reduce((acc, curr) => {
      acc = `${acc}\n• ${curr.name}`;
    }, `Apps (${apps.length}):`);
    

    const response = {
      "response_type": "in_channel",
      "text": "Results for '/aka apps'",
      "attachments": [
        {
          "text": formattedApps,
          "ts": Date.now(),
        }
      ]
    };
    await axios.post(replyTo, response);
  } catch (err) {
    console.error(err);
    await axios.post(replyTo, {
      "response_type": "ephemeral",
      "text": "Error retrieving list of apps. Please try again later."
    });
  }
}

async function sendError(replyTo, message) {
  try {
    await axios.post(replyTo, {
      "response_type": "ephemeral",
      "text": message,
    });
  } catch (err) {
    console.error(err);
  }
}


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

    res.status(200);
    const token = req.tokens[0].common_auth_tokens.access_token;
    const replyTo = req.body.response_url;

    // Parse options
    const options = req.body.text;

    switch (options) {
      case 'apps': {
        getApps(token, replyTo);
      }
      default: {
        sendError(replyTo, `Unrecognized Command: ${options}`);
      }
    }
  }

  return {
    do_command
  }
}
