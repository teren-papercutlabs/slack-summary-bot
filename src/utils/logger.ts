import winston from "winston";
import chalk from "chalk";
import path from "path";

// Helper to get caller location for VSCode links
const getCallerLocation = () => {
  const error = new Error();
  const stackLines = error.stack?.split("\n") || [];

  // Find the first line that's not from node_modules, winston, or our logger
  const callerLine = stackLines.find((line) => {
    return (
      line.includes("at ") &&
      !line.includes("node_modules") &&
      !line.includes("/winston/") &&
      !line.includes("/utils/logger.ts")
    );
  });

  const match =
    callerLine?.match(/at.*\((.*):(\d+):(\d+)\)/) ||
    callerLine?.match(/at\s+(.*):(\d+):(\d+)/);

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

  // Pre-process stack traces to preserve newlines
  const processedMetadata = Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if (key === "stack" && typeof value === "string") {
        // Split the stack trace by newlines and indent each line
        const formattedStack = value
          .split("\n")
          .map((line, i) => (i === 0 ? line : `      ${line.trim()}`))
          .join("\n");
        return [key, formattedStack];
      }
      return [key, value];
    })
  );

  const stringified = JSON.stringify(truncateArrays(processedMetadata), null, 2)
    // Preserve actual newlines in stack traces
    .replace(/\\n/g, "\n");

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
        colorizedJson,
        winston.format.printf((info) => {
          const { timestamp, level, message, formattedMetadata } = info;
          const location = getCallerLocation();
          const locationStr = `[${location.file}:${location.line}:${location.column}]`;

          // Use the pre-colorized metadata from our colorizedJson formatter
          const metadataStr =
            formattedMetadata && formattedMetadata !== "{}"
              ? `\n${formattedMetadata}`
              : "";

          // Add colors to the base log elements
          const colorizedTimestamp = chalk.gray(timestamp);
          const colorizedLevel =
            level === "error"
              ? chalk.red(level)
              : level === "warn"
              ? chalk.yellow(level)
              : level === "info"
              ? chalk.blue(level)
              : chalk.gray(level);
          const colorizedLocation = chalk.gray(locationStr);

          return `${colorizedTimestamp} ${colorizedLevel}: ${colorizedLocation} ${message}${metadataStr}`;
        })
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
