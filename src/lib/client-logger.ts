/**
 * Client-side structured logging utility
 * Provides consistent logging format for browser environments
 */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  time: string;
  level: LogLevel;
  msg: string;
  module: string;
  [key: string]: unknown;
}

class ClientLogger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private createLogEntry(level: LogLevel, msg: string, obj?: Record<string, unknown>): LogEntry {
    return {
      time: new Date().toISOString(),
      level,
      msg,
      module: this.module,
      ...obj
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // In development, show all logs
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // In production, only show warn and above
    const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevel = logLevels.indexOf(level);
    const minLevel = logLevels.indexOf('warn');
    
    return currentLevel >= minLevel;
  }

  trace(msg: string, obj?: Record<string, unknown>) {
    if (this.shouldLog('trace')) {
      console.log(JSON.stringify(this.createLogEntry('trace', msg, obj)));
    }
  }

  debug(msg: string, obj?: Record<string, unknown>) {
    if (this.shouldLog('debug')) {
      console.log(JSON.stringify(this.createLogEntry('debug', msg, obj)));
    }
  }

  info(msg: string, obj?: Record<string, unknown>) {
    if (this.shouldLog('info')) {
      console.log(JSON.stringify(this.createLogEntry('info', msg, obj)));
    }
  }

  warn(msg: string, obj?: Record<string, unknown>) {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify(this.createLogEntry('warn', msg, obj)));
    }
  }

  error(msg: string, obj?: Record<string, unknown>) {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify(this.createLogEntry('error', msg, obj)));
    }
  }

  fatal(msg: string, obj?: Record<string, unknown>) {
    if (this.shouldLog('fatal')) {
      console.error(JSON.stringify(this.createLogEntry('fatal', msg, obj)));
    }
  }
}

// Pre-configured client loggers for different modules
export const clientUploadLogger = new ClientLogger('CLIENT_UPLOAD');
export const clientExifLogger = new ClientLogger('CLIENT_EXIF');
export const clientTestLogger = new ClientLogger('CLIENT_TEST'); 