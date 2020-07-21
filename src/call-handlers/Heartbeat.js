module.exports = (msg, { success, error }, cp) => {
  success({ time: (new Date()).toISOString() });
};
