const fs = require('fs');
const path = require('path');

const myName = path.basename(__filename);
const files = fs.readdirSync(__dirname, { withFileTypes: true });

const handlers = {};

for (let file of files) {
  // Don't require myself
  if (file.name === myName) {
    break;
  }

  const fullFileName = path.join(__dirname, file.name);

  // Only require javascript files and directories with index.js
  if (file.isDirectory()) {
    // Check if it contains index.js
    if (fs.existsSync(path.join(__dirname, file.name, 'index.js'))) {
      handlers[file.name] = require(fullFileName);
    }
  } else if (file.name.endsWith('.js')) { // only .js files
    handlers[file.name.slice(0, -3)] = require(fullFileName);
  }
}

// Checking if all handlers are exporting valid functions
for (let call in handlers) {
  if (typeof handlers[call] !== 'function') {
    throw new TypeError(`Handler for CALL "${call}" isn't exporting a function`);
  }
}

module.exports = handlers;
