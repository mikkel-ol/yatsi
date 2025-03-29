import chalk from "chalk";

export enum LOG_LEVEL {
  DEBUG = "0",
  INFO = "1",
  ERROR = "2",
  WARN = "3",
  SUCCESS = "4",
  DISABLED = "99",
}

export const logger = {
  debug: (...messages: any) => {
    log(LOG_LEVEL.DEBUG, messages);
  },
  info: (...messages: any) => {
    log(LOG_LEVEL.INFO, messages);
  },
  error: (...messages: any) => {
    log(LOG_LEVEL.ERROR, messages);
  },
  warn: (...messages: any) => {
    log(LOG_LEVEL.WARN, messages);
  },
  success: (...messages: any) => {
    log(LOG_LEVEL.SUCCESS, messages);
  },
};

function log(level: LOG_LEVEL, messages: any) {
  const minimumLogLevel = parseInt(process.env.LOG_LEVEL || "0", 10);
  const currentLogLevel = parseInt(level, 10);

  if (currentLogLevel < minimumLogLevel) {
    return;
  }

  let prefix = "";

  switch (level) {
    case LOG_LEVEL.DEBUG:
      prefix = chalk.bgBlue(" DEBUG ");
      break;
    case LOG_LEVEL.INFO:
      prefix = chalk.bgWhite(" INFO ");
      break;
    case LOG_LEVEL.ERROR:
      prefix = chalk.bgRed(" ERROR ");
      break;
    case LOG_LEVEL.WARN:
      prefix = chalk.bgYellow(" WARN ");
      break;
    case LOG_LEVEL.SUCCESS:
      prefix = chalk.bgGreen(" SUCCESS ");
      break;
    default:
      break;
  }

  console.log(prefix, ...messages);
}
