const axios = require('axios');
const Fuse = require('fuse.js');

const sendError = require('./common').sendError;
const regex = require('./regex');

// Parse state from dyno
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
  info.spacing  = (info.dyno_name.length > 26) ? "  " : (" ".repeat(28 - (info.dyno_name.length + 2)));
  info.updated_at = ps.updated_at;
  return info;
}

async function sendAppSuggestion(meta, appName) {
  // Get all apps
  const { data: apps } = await axios.get(`${process.env.AKKERIS_API}/apps`, { headers: { 'Authorization': `Bearer ${meta.token}` } });

  // Fuzzy suggest
  const fuse = new Fuse(apps, { keys: ['name'] });
  const results = fuse.search(appName);

  if (results.length === 0) {
    // We have nothing to suggest
    sendError(meta.replyTo, "Error retrieving app info. Please try again later.");
    return;
  }

  const message = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Did you mean _${results[0].name}_?`
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `Get info for ${results[0].name}`,
            emoji: false
          }
        }
      ]
    }
  ];

  try {
    await axios.post(meta.replyTo, {
      "response_type": "in_channel",
      "blocks": message,
    });
  } catch (err) {
    console.error(err);
    sendError(meta.replyTo, "Oops! Something went wrong. Please try again later");
  }
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

async function getAppInfo(meta, input) {
  const parse = input.match(regex.appName);
  const appName = parse[4];

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
          d.updated_at = new Date(d.updated_at).toLocaleString('en-us', { timeZone: meta.tz });
        }
        return format_dyno(d);
      });
      if (!warn) {
        warn = f_dynos.some(x => x.warning);
      }
      formation_info = `${formation_info}${f.type} [${f.quantity}] (${f.size}): ${warn ? ":warning:" : ''}\n`;
      f_dynos.forEach(d => {
        formation_info = `${formation_info}\t- ${d.warning ? ":warning: " : ''}${d.dyno_name}:${d.spacing}${d.state} (${d.updated_at})\n`
      })
    });

    const ui_url = `${process.env.AKKERIS_UI}/apps/${appName}/info`;

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
          "text": `:cpu: *Dynos* ${warn ? ":warning:" : ''}\n${formation_info}`,
          "type": "mrkdwn",
        }
      },
      {
        "type": "section",
        "text": {
          "text": `:github: *Git Repo*\t${app.git_url}#${app.git_branch}`,
          "type": "mrkdwn",
        }
      },
      {
        "type": "divider",
      },
      {
        "type": "context",
        "elements": [
          {
            "type": "mrkdwn",
            "text": `Last Release: ${new Date(app.released_at).toLocaleString('en-us', { timeZone: meta.tz })}\nMore Info: ${ui_url}`
          }
        ]
      }
    ]

    await axios.post(meta.replyTo, {
      "response_type": "in_channel",
      "blocks": message,
    })
  } catch (err) {
    if (err.response.status === 404) {
      sendAppSuggestion(meta, parse[4]);
      return;
    }
    console.error(err);
    sendError(meta.replyTo, "Error retrieving app info. Please try again later.");
  }
}

module.exports = {
  getAppInfo,
  getApps
}