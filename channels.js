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
            is_member = $2,
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