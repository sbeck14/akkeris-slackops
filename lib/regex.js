// Command Regexes
const allApps = /^((apps)|(all apps)|(list))$/i;                    // (apps | all apps | list)       - get list of all apps
const appName = /^((apps)|(apps:info))?\s?((\w+)-((\w+-?)+))$/i;    // (apps | apps:info) app-space   - get info about an app
const logs = /^logs(.)*$/i;                                         //  logs                          - get logs (placeholder)

module.exports = {
  allApps,
  appName,
  logs
}