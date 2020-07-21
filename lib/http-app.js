const Express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const cproutes = require('../src/cp-app-routes');
const connected_cps = require('./connected-cps');

const app = Express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/cp/:cpid', (req, res, next) => {
  let cp = connected_cps.get(req.params.cpid);
  if (!cp) {
    return res.status(404).send(`CP #${req.params.cpid} isn't connected`);
  }

  // Setting CP in req to be accessed later on
  req.cp = cp;
  next();
}, cproutes);

module.exports = app;

app.all('*', (req, res) => res.sendStatus(404));
