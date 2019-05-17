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
const axios = require('axios');

const apps = require('./lib/apps');
const logs = require('./lib/logs');
const common = require('./lib/common');
const regex = require('./lib/regex');

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
    */

    // This must be sent regardless of whether or not it was a valid command
    res.status(200).send({
      response_type: 'in_channel',
    });

    // Get user time zone information
    let userinfo = {};
    try {
      const info = await axios.get(`https://slack.com/api/users.info?token=${process.env.BOT_USER_TOKEN}&user=${req.body.user_id}`);
      userinfo.tz = info.user.tz;
    } catch (err) {
      console.log('Could not fetch user info. Using default locale.');
      userinfo.tz = 'America/Denver';
    }

    const meta = {
      channelID: req.body.channel_id,
      channelName: req.body.channel_name,
      replyTo: req.body.response_url,
      token: req.tokens[0].common_auth_tokens.access_token,
      userName: req.body.user_name,
      tz: userinfo.tz,
    };

    // Make sure the bot can send a message to the appropriate channel
    if (!(await common.isMember(pg, meta.channelID))) {
      common.sendError(meta.replyTo, `Please add the bot to the ${meta.channelName} channel.`)
      return;
    }

    // Parse command
    const input = req.body.text.trim();

    if (regex.allApps.test(input)) {
      apps.getApps(meta);
    } else if (regex.appName.test(input)) {
      apps.getAppInfo(meta, input)
    } else if (regex.logs.test(input)) {
      logs.getLogs(meta, input);
    } else {
      common.sendError(meta.replyTo, `Unrecognized Command: ${input}`);
    }
  }

  // Placeholder for user interaction with commands
  async function interact(req, res) {
    res.status(200).send({
      response_type: 'in_channel',
    });
    console.log(req.body.payload);
  }

  return {
    do_command,
    interact
  }
}




