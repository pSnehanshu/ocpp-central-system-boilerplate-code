const Express = require('express');

const cproutes = Express.Router();
module.exports = cproutes;

// Write all the API endpoints here

cproutes.get('/test', (req, res) => res.send(req.cp.ocppVersions));
