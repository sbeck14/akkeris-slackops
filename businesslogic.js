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
const ChartjsNode = require('chartjs-node');

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
      'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
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
    
    await uploadFile(
      meta.channelID,
      output,
      `aka-apps_${Date.now() / 1000}.txt`,
      'text',
      `*Result of* \`aka apps\` (${apps.length})`
    );
  } catch (err) {
    console.error(err);
    sendError(meta.replyTo, "Error retrieving list of apps. Please try again later.");
  }
}

async function getAppInfo(meta, options) {
  sendError(meta.replyTo, `Not implemented. Options: ${options}`);
}

async function getLogs(meta, options) {
  sendError(meta.replyTo, `Not implemented. Options: ${options}`);
}

// async function getMetrics(token, channelID, app, replyTo) {
//   try {
//     const { data: metrics } = await axios.get(`${process.env.AKKERIS_API}/apps/${app}/metrics`, {
//       headers: { 'Authorization': `Bearer ${token}` },
//     });

//     const chartOptions = {
//       type: 'line',
//       data: {
//         labels: metrics.web.network_receive_bytes_total.keys().map(k => (new Date(k)*1000).toISOString()),
//         datasets: [{
//           label: 'Network Receive Bytes Total',
//           data: metrics.web.network_receive_bytes_total.values(),
//         }],
//       },
//       options: {
//         scales: {
//           yAxes: [{
//               ticks: {
//                 beginAtZero: true
//               },
//           }],
//         },
//       },
//     };


//     const chartNode = new ChartjsNode(800, 600);
//     chartNode.drawChart(chartOptions)
//     .then(() => {
//       return chartNode.getImageBuffer('image/png');
//     })
//     .then((buffer) => {
//       return chartNode.getImageStream('image/png');
//     })
//     .then(async (streamResult) => {
//       const { data: resp } = await uploadFile(
//         channelID,
//         streamResult.stream,
//         `aka-metrics_${Date.now() / 1000}.png`,
//         'png',
//         `*Result of* \`aka metrics\``,
//       );
//       console.log(resp);
//       chartNode.destroy();
//     });

// //    console.log(metrics);

//   } catch (err) {
//     console.error(err);
//     sendError(replyTo, `Error retrieving metrics for ${app}. Please try again later.`);
//   }
// }


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
        getApps(meta);
        break;
      case "ps":
        getAppInfo(meta, options);
        break;
      case "logs":
        getLogs(meta, options);
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




