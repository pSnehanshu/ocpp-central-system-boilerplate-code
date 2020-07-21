module.exports = (msg, { success, error }, cp) => {
  success({
      currentTime: (new Date()).toISOString(),
      interval: 90,
      status: 'Accepted'
  });
}
