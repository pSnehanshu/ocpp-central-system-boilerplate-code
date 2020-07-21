const WebSocket = require('ws');
const callHandlers = require('./cp-call-handlers');

// The websocket server that will handle wesocket connections
const wss = new WebSocket.Server({ noServer: true });

// When a connection is established, we define how to handle the connection
wss.on('connection', async function (ws, req, cp) {
    console.log('Connection succesfull with', cp.cpid);

    for (let call in callHandlers) {
        let handler = callHandlers[call];

        if (typeof handler === 'function') {
            cp.on(call, (msg, response) => handler(msg, response, cp));
        } else {
            throw new TypeError(`Handler for CALL "${call}" isn't exporting a function`);
        }
    }
});

module.exports = wss;
