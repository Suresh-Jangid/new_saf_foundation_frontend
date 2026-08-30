/**
 * Logger utility that respects the REMOVE_CONSOLE_LOGS environment variable
 * Use this instead of console.log/error/warn for runtime control
 */

const isConsoleDisabled = process.env.REMOVE_CONSOLE_LOGS === 'true';

/**
 * Conditional logger that only logs when REMOVE_CONSOLE_LOGS is not set to 'true'
 */
export const logger = {
  log: (...args: any[]) => {
    if (!isConsoleDisabled) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (!isConsoleDisabled) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (!isConsoleDisabled) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (!isConsoleDisabled) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (!isConsoleDisabled) {
      console.debug(...args);
    }
  },
};

