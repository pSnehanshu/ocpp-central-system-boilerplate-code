const shortid = require('shortid');

// This class handles the generation and sending of OCPP messages
class OCPP {
  constructor(cpid, wsConnection) {
    /* Structure of CallResult Handlers
        {
            <UniqueId>: [
                {
                    success: <cb>,
                    error: <err_cb>
                },
                .
                .
                .
            ],
            .
            .
            .
        }
    */
    this.callResultHandlers = {};

    /* Structure of CallHandlers
        {
            <Action>: <cb>,
            .
            .
            .
        }
    */
    this.callHandlers = {};

    this.cpid = cpid;
    this.connection = wsConnection;

    // OCPP versions supported the current CP
    this.ocppVersions = undefined;
  }

  // Check if the CP is registered with the backend
  valid(password) {
    return new Promise((resolve, reject) => {
      // Checking if the cp is valid or not
      // if (password is correct) {
      resolve();
      // } else {
      //  reject();
      //}
    });
  }

  // Handle Calls
  on(action, cb) {
    // Finally add the callback
    this.callHandlers[action] = cb;
  }

  // Send CALLS
  send(action, payload = {}, userInitiated = true) {
    console.log(`Sending "${action}" to ${this.cpid}...`);

    return new Promise((resolve, reject) => {
      const msgTypeId = 2;
      const uniqueId = 'msg_' + shortid.generate();
      const msg = JSON.stringify([msgTypeId, uniqueId, action, payload]);
      this.sendWsMsg(msg);
      this.registerCall(uniqueId, resolve, reject);
    });
  }

  get connection() {
    return this._connection;
  }
  set connection(v) {
    if (!v) return;

    this._connection = v;
    // Handle upcoming messages
    // Define logic to handle messages
    this.connection.on('message', message => this.handleMessages(message));
  }
  callRespond(msg) {
    const self = this;
    const msgId = msg[1];
    const NO_CONNECTION_ERROR = 'Connection with the backend has not yet been established.';

    function respond() {
      this.success = function (payload = {}) {
        if (!self.connection) {
          throw new Error(NO_CONNECTION_ERROR);
        }

        var response = JSON.stringify([3, msgId, payload]);
        self.sendWsMsg(response);
        console.log(`Response sent for "${msgId}" to ${self.cpid}`);
      }

      this.error = function (ErrorCode = "GenericError", ErrorDescription = "", ErrorDetails = {}) {
        if (!self.connection) {
          throw new Error(NO_CONNECTION_ERROR);
        }

        var response = JSON.stringify([4, msgId, ErrorCode, ErrorDescription, ErrorDetails]);
        self.sendWsMsg(response);
        console.log(`ErrorResponse sent for "${msgId}" to ${self.cpid}`);
      }
    }

    return new respond;
  }
  registerCall(id, cb, err_cb) {
    // Create entry if new ID
    if (!this.callResultHandlers[id]) {
      this.callResultHandlers[id] = [];
    }
    // Check if it is array, if not make it one
    if (!Array.isArray(this.callResultHandlers[id])) {
      this.callResultHandlers[id] = [this.callResultHandlers[id]];
    }

    // Finally push the callback
    this.callResultHandlers[id].push({
      success: cb,
      error: err_cb,
    });
  }
  handleMessages(message) {
    try {
      // Parse the received messages
      console.log(`Message received from ${this.cpid}`, message);

      const msg = JSON.parse(message);
      const type = msg[0];
      const id = msg[1];

      // Look for handlers to handle the message
      if (type == 2) { // This is a CALL message
        const action = msg[2];
        const fn = this.callHandlers[action];
        const response = this.callRespond(msg);

        // Check if handlers are registered for the call
        if (typeof fn == 'function') {
          fn(msg[3], response);
        } else {
          // If handler isn't defined
          response.error('NotImplemented', `Action "${action}" isn't supported yet`);
        }
      } else { // This is either a CALLRESULT or a CALLERROR message
        // Check if callbacks are registered for the response
        if (this.callResultHandlers[id]) {
          if (!Array.isArray(this.callResultHandlers[id])) {
            this.callResultHandlers[id] = [this.callResultHandlers[id]];
          }
          this.callResultHandlers[id].forEach(handlers => {
            // Get the correct handler based on the message type
            let cb = null; // This message may be invalid (Neither CALLRESULT nor CALLERROR)
            let args = msg;

            if (type == 3) { // CALLRESULT
              cb = handlers.success;
              args = msg[2]; // Only passing the payload
            } else if (type == 4) { // CALLERROR
              cb = handlers.error;
              args = {
                code: msg[2],
                message: msg[3],
                info: msg[4],
              };
            }

            typeof cb == 'function' && cb(args);
          });

          // After all response handled, removed the handlers
          delete this.callResultHandlers[id];
        }
      }
    } catch (error) {
      console.error('Bad message avoided', error.message);
    }
  }
  sendWsMsg(msg) {
    this.connection.send(msg);
  }
};

module.exports = OCPP;
