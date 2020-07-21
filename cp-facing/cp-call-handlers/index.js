const fs = require('fs');
const path = require('path');

const myName = path.basename(__filename);
const files = fs.readdirSync(__dirname, { withFileTypes: true });

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
      module.exports[file.name] = require(fullFileName);
    }
  } else if (file.name.endsWith('.js')) { // only .js files
    module.exports[file.name.slice(0, -3)] = require(fullFileName);
  }
}
