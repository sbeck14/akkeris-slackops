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
const FormData = require('form-data');
// const ChartjsNode = require('chartjs-node');

// start-failure, stopping, stopped, waiting, pending, starting, probe-failure, running, app-crashed
function state_map(ps) {
  switch(ps.state.toLowerCase()) {
    case 'start-failure':
      return {
        "state":"crashed",
        "warning": true,
      }
    case 'app-crashed':
      return {
        "state":"crashed", 
        "warning": true,
      }
    case 'waiting':
      return {
        "state":"starting",
      }
    case 'probe-failure':
      let started = new Date(Date.parse(ps.created_at))
      let now = new Date()
      if((now.getTime() - started.getTime()) > 1000 * 90) {
        return {
          "state":"unhealthy", 
          "warning": true,
        }
      } else {
        return {
          "state":"starting", 
        }

      }
    default:
      return {
        "state":ps.state.toLowerCase(),
      }
  }
}

function format_dyno(ps) {
  let info = state_map(ps)
  info.dyno_name = `${ps.type}.${ps.name}`;
  info.spacing  = (dyno_name.length > 30) ? "  " : (" ".repeat(32 - (dyno_name.length + 2)));
  info.updated_at = ps.updated_at;
  return info;
}

async function uploadFile(channelID, data, filename, filetype, title) {
  const form = new FormData();
  form.append('channels', channelID);
  form.append('content', data);
  form.append('filename', filename);
  form.append('filetype', filetype);
  form.append('title', title)
  
  return axios.post('https://slack.com/api/files.upload', form, {
    headers: {
      Authorization: `Bearer ${process.env.BOT_USER_TOKEN}`, 
      ...form.getHeaders(),
    }
  });
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

async function isMember(pg, channelID) {
  const { rows: channels } = await pg.query(`select channel_id, is_member from channels`);
  return channels.find(c => c.channel_id === channelID).is_member;
}

async function getApps(meta) {
  try {
    const opts = { headers: { 'Authorization': `Bearer ${meta.token}` } };
    const { data: apps } = await axios.get(`${process.env.AKKERIS_API}/apps`, opts);

    const output = apps.reduce((acc, app) => (
      `${acc}⬢ ${app.name} ${app.preview ? '- preview' : ''}\n\tUrl: ${app.web_url}\n\t${app.git_url ? ("GitHub: " + app.git_url + ' \n\n') : '\n'}`
    ), '');
    
    const res = await uploadFile(
      meta.channelID,
      output,
      `aka-apps_${Date.now() / 1000}.txt`,
      'text',
      `*Result of* \`aka apps\` (${apps.length})`
    );
    if (res.data.ok === false) {
      throw new Error(res.data.error);
    }
  } catch (err) {
    console.error(err);
    sendError(meta.replyTo, "Error retrieving list of apps. Please try again later.");
  }
}

async function getAppInfo(meta, appName) {
  try {
    const opts = { headers: { 'Authorization': `Bearer ${meta.token}` } };
    const { data: app } = await axios.get(`${process.env.AKKERIS_API}/apps/${appName}`, opts);
    const { data: formations } = await axios.get(`${process.env.AKKERIS_API}/apps/${appName}/formation`, opts);
    const { data: dynos } = await axios.get(`${process.env.AKKERIS_API}/apps/${appName}/dynos`, opts);

    let formation_info = '';
    let warn = false;

    formations.forEach((f) => {
      const f_dynos = dynos.filter(x => x.type === f.type).map((d) => {
        if(d.updated_at === '0001-01-01T00:00:00Z') {
          d.updated_at = 'unknown';
        } else {
          d.updated_at = new Date(dyno.updated_at);
          d.updated_at = dyno.updated_at.toLocaleString();
        }
        return format_dyno(d);
      });
      if (!warn) {
        warn = f_dynos.some(x => x.warning);
      }
      formation_info = `${formation_info}[${f.quantity}] ${f.type} (${f.size}): ${warn && ":warning:"}\n`;
      f_dynos.forEach(d => {
        formation_info = `${formation_info}${d.dyno_name}:${d.spacing}${d.info.state} (${d.updated_at})\n`
      })
    });


    const message = [
      {
        "type": "section",
        "text": {
          "text": `Info for *${appName}*`,
          "type": "mrkdwn",
        }
      },
      {
        "type": "section",
        "text": {
          "text": `*Dynos* ${warn && ":warning:"}\n${formation_info}`,
          "type": "mrkdwn",
        }
      },
      {
        "type": "section",
        "text": {
          "text": `*Git Repo*\n${app.git_url} (${app.git_branch})`,
          "type": "mrkdwn",
        }
      },
    ]

    console.log(message);

    await axios.post(meta.replyTo, {
      "response_type": "in_channel",
      "blocks": message,
    })
  } catch (err) {
    console.error(err);
    sendError(meta.replyTo, "Error retrieving app info. Please try again later.");
  }
}

async function appsCommand(meta, options) {
  console.log(`appsCommand requested by ${meta.userName} with options ${options.join(' ')}`)

  if (options.length === 0) {
    getApps(meta);
  } else if (options.length === 2 && options[0] === "info") {
    getAppInfo(meta, options[1]);
  } else {
    sendError(meta.replyTo, `Invalid argument(s) for /aka apps.\nUsage: /aka apps [info APPNAME]`);
  }
}

async function psCommand(meta, options) {
  console.log(`psCommand requested by ${meta.userName}`)
  sendError(meta.replyTo, `Not implemented. Options: ${options}`);
}

async function logsCommand(meta, options) {
  console.log(`logsCommand requested by ${meta.userName}`)
  sendError(meta.replyTo, `Not implemented. Options: ${options}`);
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
    */

    // Recieved command, regardless of whether or not it worked
    res.status(200).send({
      response_type: 'in_channel',
    });

    const meta = {
      channelID: req.body.channel_id,
      channelName: req.body.channel_name,
      replyTo: req.body.response_url,
      token: req.tokens[0].common_auth_tokens.access_token,
      userName: req.body.user_name,
    };

    if (!(await isMember(pg, meta.channelID))) {
      sendError(meta.replyTo, `Please add the bot to the ${meta.channelName} channel.`)
      return;
    }

    // Parse options

    const input = req.body.text.split(' ');
    if (input.length === 0) {
      // invalid input
      sendError(meta.replyTo, 'Invalid Input');
    }

    const [command, ...options] = input;

    switch(command) {
      case "apps":
        appsCommand(meta, options);
        break;
      case "ps":
        psCommand(meta, options);
        break;
      case "logs":
        logsCommand(meta, options);
        break;
      default:
        sendError(meta.replyTo, `Unrecognized Command: ${command}`);
        break;
    }
  }

  return {
    do_command
  }
}




