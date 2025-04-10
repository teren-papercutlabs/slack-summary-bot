import winston from "winston";
import chalk from "chalk";
import path from "path";

// Helper to get caller location for VSCode links
const getCallerLocation = () => {
  const error = new Error();
  const stack = error.stack?.split("\n")[3];
  const match = stack?.match(/\((.*):(\d+):(\d+)\)/);
  return match
    ? {
        file: path.relative(process.cwd(), match[1]),
        line: match[2],
        column: match[3],
      }
    : { file: "unknown", line: "0", column: "0" };
};

// Helper to truncate large arrays
const truncateArrays = (obj: any, maxLength = 10): any => {
  if (Array.isArray(obj)) {
    return obj.length > maxLength
      ? [...obj.slice(0, maxLength), `... ${obj.length - maxLength} more items`]
      : obj;
  }
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, truncateArrays(value)])
    );
  }
  return obj;
};

// Format for colorized JSON output
const colorizedJson = winston.format((info) => {
  const { message, ...metadata } = info;
  const stringified = JSON.stringify(truncateArrays(metadata), null, 2);
  info.formattedMetadata = stringified.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let color = chalk.white;
      if (/^"/.test(match)) {
        color = /:$/.test(match) ? chalk.cyan : chalk.green;
      } else if (/true|false/.test(match)) {
        color = chalk.yellow;
      } else if (/null/.test(match)) {
        color = chalk.dim;
      }
      return color(match);
    }
  );
  return info;
})();

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }), // ISO 8601
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf((info) => {
          const { timestamp, level, message, formattedMetadata } = info;
          const location = getCallerLocation();
          const locationStr = `[${location.file}:${location.line}:${location.column}]`;
          return `${timestamp} ${level}: ${locationStr} ${message}${
            formattedMetadata ? "\n" + formattedMetadata : ""
          }`;
        }),
        colorizedJson
      ),
    }),
  ],
});

// Type for log entry
type LogEntry = {
  message: string;
  [key: string]: any;
};

// Export wrapper with type-safe methods
export const Logger = {
  info: (entry: LogEntry) => logger.info(entry),
  error: (entry: LogEntry) => logger.error(entry),
  warn: (entry: LogEntry) => logger.warn(entry),
  debug: (entry: LogEntry) => logger.debug(entry),
};
