const shortid = require('shortid');
const validateOCPP = require('./schemas/validate');
const Hooks = require('./hooks');

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

    // Initializing hooks
    this.hooks = new Hooks();
  }

  // Check if the CP is registered with the backend
  valid(password) {
    return this.hooks.executeBefore('checkCpValidity', password);
  }

  // Handle Calls
  on(action, cb) {
    // Finally add the callback
    this.callHandlers[action] = cb;
  }

  // Send CALLS
  send(action, payload = {}, userInitiated = true) {
    return new Promise((resolve, reject) => {
      // Validating outgoing calls
      if (!validateOCPP(this.ocppVersions, action, payload)) {
        return reject(new TypeError(`Tried to send invalid ocpp payload for CALL ${action}`));
      }

      const msgTypeId = 2;
      const uniqueId = 'msg_' + shortid.generate();
      const msg = JSON.stringify([msgTypeId, uniqueId, action, payload]);

      this.hooks.execute('sendCall', async () => {
        await this.sendWsMsg(msg);
        this.registerCall(uniqueId, resolve, reject, action);
      }, { msg });
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
    const action = msg[2];
    const NO_CONNECTION_ERROR = 'Connection with the backend has not yet been established.';

    function respond() {
      function callRespond(payload = {}) {
        if (!self.connection) {
          throw new Error(NO_CONNECTION_ERROR);
        }

        // Verify if payload is valid
        if (!validateOCPP(self.ocppVersions, action, payload, true)) {
          // send a CALLERROR
          callError('InternalError');

          throw new TypeError(`Tried to send invalid ocpp payload for msgid: ${msgId}, action: ${action}`);
        }

        let msg = [3, msgId, payload];

        self.hooks.execute('sendCallRespond', () => {
          let responseString = JSON.stringify(msg);
          self.sendWsMsg(responseString);
        }, { msg: msg });
      }

      function callError(ErrorCode = "GenericError", ErrorDescription = "", ErrorDetails = {}) {
        if (!self.connection) {
          throw new Error(NO_CONNECTION_ERROR);
        }

        let msg = JSON.stringify([4, msgId, ErrorCode, ErrorDescription, ErrorDetails]);

        self.hooks.execute('sendCallError', () => {
          let responseString = JSON.stringify(msg);
          self.sendWsMsg(responseString);
        }, { msg });
      }

      this.success = callRespond;
      this.error = callError;
    }

    return new respond;
  }
  registerCall(id, cb, err_cb, action) {
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
      action,
    });
  }
  handleMessages(message) {
    try {
      this.hooks.execute('messageReceived', () => {
        // Parse the received messages
        const msg = JSON.parse(message);
        const type = msg[0];
        const id = msg[1];

        // Look for handlers to handle the message
        if (type == 2) { // This is a CALL message
          const action = msg[2];
          const payload = msg[3];
          const fn = this.callHandlers[action];
          const response = this.callRespond(msg);

          // Check if payload is valid OCPP
          if (validateOCPP(this.ocppVersions, action, payload)) {
            // Check if handlers are registered for the call
            if (typeof fn == 'function') {
              this.hooks.execute('executeCallHandler', () => fn(payload, response), { msg, res: response });
            } else {
              // If handler isn't defined
              response.error('NotImplemented', `Action "${action}" isn't supported yet`);
            }
          } else {
            // Malformed message
            response.error('FormationViolation', `Please provide valid payload according to ${this.ocppVersions} specs`);
          }
        } else { // This is either a CALLRESULT or a CALLERROR message
          // Check if callbacks are registered for the response
          if (this.callResultHandlers[id]) {
            if (!Array.isArray(this.callResultHandlers[id])) {
              this.callResultHandlers[id] = [this.callResultHandlers[id]];
            }
            this.callResultHandlers[id].forEach(handlers => {
              // Get the correct handler based on the message type

              if (type == 3) { // CALLRESULT
                let args = msg[2]; // Only passing the payload

                // if action is provided, then validate payload
                if (handlers.action) {
                  if (!validateOCPP(this.ocppVersions, handlers.action, args, true)) {
                    return handlers.error(new TypeError('Invalid payload format was received'));
                  }
                }

                if (typeof handlers.success === 'function') {
                  this.hooks.execute('executeCallResultHandler', () => handlers.success(args), { msg });
                }
              } else if (type == 4) { // CALLERROR
                if (typeof handlers.error === 'function') {
                  this.hooks.execute('executeCallErrorHandler', () => handlers.error({
                    code: msg[2],
                    message: msg[3],
                    info: msg[4],
                  }), { msg });
                }
              }
            });

            // After all response handled, removed the handlers
            delete this.callResultHandlers[id];
          }
        }
      }, { rawMsg: message });
    } catch (error) {
      console.error('Bad message avoided', error.message);
    }
  }
  sendWsMsg(msg) {
    return this.hooks.execute('sendWsMsg', () => this.connection.send(msg), { rawMsg: msg })
  }
};

module.exports = OCPP;
