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

module.exports = function(pg) {

  async function update_channels(req, res) {
    try {
      const { data } = await axios.get(`https://slack.com/api/channels.list`, slackOpts);
      
      await Promise.all(data.channels.map(async (channel) => (
        pg.query(`
          insert into channels
            (channel_id, is_member, updated)
          values
            ($1, $2, now())
          on conflict (channel_id)
          do update set
            is_member = $2
            updated = now()
        `, [channel.id, channel.is_member])
      )));
      console.log('Updated channel list.');
    } catch (err) {
      console.error(err);
    }
  }

  return {
    update_channels
  }
}