const OCPPLib = require('../lib/ocpplib');

module.exports = function attachHooks(cp) {
  if (!(cp instanceof OCPPLib)) {
    throw new TypeError('Only an instance of OCPPLib can be passed to apply hooks onto');
  }

  // attach any hooks
  cp.hooks.before('messageReceived', (info) => console.log(`<<< Message received from CP #${cp.cpid}`, info.rawMsg));
  cp.hooks.after('sendWsMsg', (info) => console.log(`>>> Message sent to CP #${cp.cpid}`, info.rawMsg));

  return cp;
}
