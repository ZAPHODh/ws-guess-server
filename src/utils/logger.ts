type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  socketId?: string;
  lobbyId?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context
    };

    const consoleMethod = level === 'debug' ? 'log' : level;
    console[consoleMethod](JSON.stringify(logEntry));

    // Here you can integrate with monitoring services:
    // - Sentry: Sentry.captureMessage(message, { level, extra: context });
    // - DataDog: datadogLogs.logger.log(message, context);
    // - CloudWatch: cloudwatch.putLogEvents(...)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();
