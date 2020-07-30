const _ = require('lodash');
const async = require('async');

class Hook {
  constructor() {
    this.hooks = {
      /* hookName: {
        before: [], // List of functions, signature: function (info:Object) {}
        after: [], // List of functions, signature: function (info:Object, result:Any) {}
      } */
    };
  }
  getBeforeKey(hookName = '') {
    return `["${hookName}"].before`;
  }
  getAfterKey(hookName = '') {
    return `["${hookName}"].after`;
  }
  getBefore(hookName = '') {
    const key = this.getBeforeKey(hookName);
    let hooks = _.get(this.hooks, key, []);
    if (!Array.isArray(hooks)) hooks = [hooks];
    return hooks;
  }
  getAfter(hookName = '') {
    const key = this.getAfterKey(hookName);
    let hooks = _.get(this.hooks, key, []);
    if (!Array.isArray(hooks)) hooks = [hooks];
    return hooks;
  }
  before(hookName, hookFn = () => { }) {
    let exsiting = this.getBefore(hookName);
    _.set(this.hooks, this.getBeforeKey(hookName), [...exsiting, hookFn]);
  }
  after(hookName, hookFn = () => { }) {
    let exsiting = this.getAfter(hookName);;

    _.set(this.hooks, this.getAfterKey(hookName), [...exsiting, hookFn]);
  }
  async execute(hookName, task = () => { }, info) {
    /*
    1. Execute "beforeHooks" in serial manner
    2. Execute "afterHooks" in serial manner
    */

    await this.executeBefore(hookName, info);
    const result = await task();
    return await this.executeAfter(hookName, info, result);
  }
  executeBefore(hookName, info) {
    return new Promise((resolve, reject) => {
      if (!hookName) return reject(new Error('Falsy hookname not allowed'));

      const hookFns = this.getBefore(hookName);

      async.eachLimit(hookFns, 1, async (fn) => {
        if (typeof fn === 'function') {
          return await fn(info);
        }
        throw new TypeError('Invalid hook handler defined, these should always be functions.');
      }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  executeAfter(hookName, info, result) {
    return new Promise((resolve, reject) => {
      if (!hookName) return reject(new Error('Falsy hookname not allowed'));

      const hookFns = this.getAfter(hookName);

      async.eachLimit(hookFns, 1, async (fn, cb) => {
        if (typeof fn === 'function') {
          return await fn(info, result);
        }
        throw new TypeError('Invalid hook handler defined, these should always be functions.');
      }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
};

module.exports = Hook;
