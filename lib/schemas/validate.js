// Import all schema validator files
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const _ = require('lodash');

const ajv = new Ajv({ schemaId: 'id' });

// https://github.com/ajv-validator/ajv/issues/1254
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

const myName = path.basename(__filename);
const files = fs.readdirSync(__dirname, { withFileTypes: true });

const RESPONSE = 'Response';

const REQ_VALIDATORS = {};
const CONF_VALIDATORS = {};

for (let file of files) {
  // Don't require myself
  if (file.name === myName) {
    break;
  }

  const fullFileName = path.join(__dirname, file.name);
  const ocppVersion = file.name;

  if (!REQ_VALIDATORS[ocppVersion]) REQ_VALIDATORS[ocppVersion] = {};
  if (!CONF_VALIDATORS[ocppVersion]) CONF_VALIDATORS[ocppVersion] = {};

  // Only require folders
  if (file.isDirectory()) {
    // Require all the JSON files inside this directory
    const schemaFiles = fs.readdirSync(fullFileName);
    schemaFiles.forEach(file => {
      // If it is a json file
      if (file.endsWith('.json')) {
        const schemaValidator = ajv.compile(require(path.join(fullFileName, file)));
        const fileNameWithoutExtension = file.split('.')[0];

        // Check if it is a req or a conf
        if (fileNameWithoutExtension.endsWith(RESPONSE)) {
          // CONF
          const schemaName = fileNameWithoutExtension.slice(0, fileNameWithoutExtension.length - RESPONSE.length);
          CONF_VALIDATORS[ocppVersion][schemaName] = schemaValidator;
        } else {
          // REQ
          REQ_VALIDATORS[ocppVersion][fileNameWithoutExtension] = schemaValidator;
        }
      }
    });
  }
}

module.exports = function validateOcppPayload(
  version = 'ocpp1.6j',
  action = 'Heartbeat',
  payload = {},
  isResponse = false
) {
  const validator = _.get(isResponse ? CONF_VALIDATORS : REQ_VALIDATORS, `['${version}']['${action}']`, () => true);
  return validator(payload);
}
