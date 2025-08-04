const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
  const { method, originalUrl } = req;
  const timestamp = new Date().toISOString();

  logger.info(`[${timestamp}] ${method} ${originalUrl}`);

  next();
};

module.exports = requestLogger;
