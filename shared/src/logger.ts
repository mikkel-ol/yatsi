import chalk from "chalk";

export const logger = {
  info: (message: string) => {
    console.log(`${chalk.bgWhite(" INFO ")} ${message}`);
  },
  error: (message: string) => {
    console.log(`${chalk.bgRed(" ERROR ")} ${message}`);
  },
  warn: (message: string) => {
    console.log(`${chalk.bgYellow(" WARN ")} ${message}`);
  },
  success: (message: string) => {
    console.log(`${chalk.bgGreen(" SUCCESS ")} ${message}`);
  },
};
