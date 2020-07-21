require('dotenv').config();
const http = require('http');
const url = require('url');
const httpApp = require('./lib/http-app');
const wss = require('./lib/wss');
const OCPPLib = require('./lib/ocpplib');
const connected_cps = require('./lib/connected-cps');

const port = process.env.PORT || 9000;
const server = http.createServer(httpApp);
server.listen(port, () => console.log(`Central system running on port ${port}`));

// Handling Websocket connections
server.on('upgrade', async function (request, socket, head) {
    try {
        const pathname = url.parse(request.url).pathname;
        const cpid = pathname.split('/').reverse()[0];
        const cp = new OCPPLib(cpid);

        // Check if the CP is valid (registered)
        await cp.valid(/* Need to provide the password from basic auth header */)
        wss.handleUpgrade(request, socket, head, async function (ws) {
            cp.connection = ws;
            wss.emit('connection', ws, request, cp);

            // Determining OCPP version
            var wsprotocol = request.headers['sec-websocket-protocol'] || request.headers['Sec-WebSocket-Protocol'] || request.headers['Sec-Websocket-Protocol'];
            wsprotocol = wsprotocol.split(',').filter(p => p.trim().length > 0).map(p => p.trim().toLowerCase());
            cp.ocppVersions = wsprotocol;

            // Save the cp
            connected_cps.put(cpid, cp);

            ws.on('close', (code, reason) => {
                console.error(cpid, 'closed connection', `${code} - ${reason}`);
                connected_cps.delete(cpid);
            });
        });
    } catch (error) {
        console.error(error);
        socket.destroy();
    }
});
