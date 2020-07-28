module.exports = (msg, { success, error }, cp) => {
  success({ currentTime: (new Date()).toISOString() });
};
