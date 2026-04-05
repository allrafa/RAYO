const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatMessage(level: string, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export const logger = {
  error(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", context, message), ...args);
    }
  },

  warn(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", context, message), ...args);
    }
  },

  info(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("info")) {
      console.log(formatMessage("info", context, message), ...args);
    }
  },

  debug(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("debug")) {
      console.log(formatMessage("debug", context, message), ...args);
    }
  },
};
