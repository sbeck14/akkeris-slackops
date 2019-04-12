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

const slackOpts = { 
  headers: { Authorization: `Bearer ${process.env.BOT_USER_TOKEN}`}
};

const chunkArray = (arr, size) => {
  let results = [];
  while (arr.length) {
    results.push(arr.splice(0, size));
  }
  return results;
}

async function getApps(token, channelID) {
  try {
    const opts = { headers: { 'Authorization': `Bearer ${token}` } };
    const { data: apps } = await axios.get(`${process.env.AKKERIS_API}/apps`, opts);

    const formattedApps = apps.map(a => `• ${a.name}`);
    const chunks = chunkArray(formattedApps, 100);
    // console.log(chunks);
    
    let blocks = [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Result of* \`aka apps\` (${apps.length})`,
        }
      },
      {
        "type": "divider"
      }
    ].concat(chunks.map((chunk) => ({
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": chunk.join('\n'),
      }
    })));

    await axios.post('https://slack.com/api/chat.postMessage', {
      channel: channelID,
      as_user: true,
      blocks,
    }, slackOpts);
  } catch (err) {
    console.error(err);
    sendError(replyTo, "Error retrieving list of apps. Please try again later.");
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

async function isMember(channelID) {
  const { rows: channels } = await pg.query(`select channel_id, is_member from channels`);
  return channels.find(c => c.channel_id === channelID).is_member;
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

    // Recieved command, regardless of whether or not it worked
    res.status(200);

    const channelID = req.body.channel_id;
    if (!(await isMember(channelID))) {
      sendError(replyTo, `Please add the bot to the ${req.body.channel_name} channel.`)
      return;
    }

    const token = req.tokens[0].common_auth_tokens.access_token;
    const replyTo = req.body.response_url;

    // Parse options
    const options = req.body.text;

    switch (options) {
      case 'apps': {
        getApps(token, channelID);
        break;
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
