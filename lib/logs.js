const sendError = require('common').sendError;

async function getLogs(meta, options) {
  console.log(`logsCommand requested by ${meta.userName}`)
  sendError(meta.replyTo, `Not implemented. Options: ${options}`);
}

module.exports = {
  getLogs
}