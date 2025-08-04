const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

// Crear transporte rotativo por día
const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: path.join(__dirname, "../logs", "autosplash-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: false,
  maxSize: "10m",
  maxFiles: "14d",
  level: "info",
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    ...(isProduction
      ? [
          dailyRotateFileTransport,
          new transports.File({ filename: "logs/error.log", level: "error" }),
        ]
      : [new transports.Console()]),
  ],
});

module.exports = logger;