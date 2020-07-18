const WebSocket = require('ws');

// The websocket server that will handle wesocket connections
const wss = new WebSocket.Server({ noServer: true });

// When a connection is established, we define how to handle the connection
wss.on('connection', async function (ws, req, cp) {
    console.log('Connection succesfull with', cp.cpid);

    // Use cp.on() to listen to CALLS

    cp.on('BootNotification', (msg, response) => {
        console.log(msg);
        response.success({
            currentTime: (new Date()).toISOString(),
            interval: 90,
            status: 'Accepted'
        });
    })
});

module.exports = wss;
