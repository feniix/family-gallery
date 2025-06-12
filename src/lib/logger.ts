/**
 * Structured logging utility for the family gallery application
 * Provides consistent JSON logging for server and client environments
 */

type TraceFunction = (msg: string, obj?: Record<string, unknown>) => void;
type DebugFunction = (msg: string, obj?: Record<string, unknown>) => void;
type InfoFunction = (msg: string, obj?: Record<string, unknown>) => void;
type WarnFunction = (msg: string, obj?: Record<string, unknown>) => void;
type ErrorFunction = (msg: string, obj?: Record<string, unknown>) => void;
type FatalFunction = (msg: string, obj?: Record<string, unknown>) => void;

interface Logger {
  trace: TraceFunction;
  debug: DebugFunction;
  info: InfoFunction;
  warn: WarnFunction;
  error: ErrorFunction;
  fatal: FatalFunction;
}

interface LogEntry {
  time: string;
  level: string;
  msg: string;
  module: string;
  [key: string]: unknown;
}

function createLogEntry(level: string, msg: string, module: string, obj?: Record<string, unknown>): LogEntry {
  return {
    time: new Date().toISOString(),
    level,
    msg,
    module,
    ...obj
  };
}

// Development environment logger (console with JSON structure)
function shouldLog(level: string): boolean {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  const currentLevel = levels.indexOf(level);
  const minLevel = levels.indexOf(logLevel);
  return currentLevel >= minLevel;
}

function createConsoleLogger(module: string): Logger {
  return {
    trace: (msg: string, obj?: Record<string, unknown>) => {
      if (shouldLog('trace')) console.log(JSON.stringify(createLogEntry('trace', msg, module, obj)));
    },
    debug: (msg: string, obj?: Record<string, unknown>) => {
      if (shouldLog('debug')) console.log(JSON.stringify(createLogEntry('debug', msg, module, obj)));
    },
    info: (msg: string, obj?: Record<string, unknown>) => {
      if (shouldLog('info')) console.log(JSON.stringify(createLogEntry('info', msg, module, obj)));
    },
    warn: (msg: string, obj?: Record<string, unknown>) => {
      if (shouldLog('warn')) console.warn(JSON.stringify(createLogEntry('warn', msg, module, obj)));
    },
    error: (msg: string, obj?: Record<string, unknown>) => {
      if (shouldLog('error')) console.error(JSON.stringify(createLogEntry('error', msg, module, obj)));
    },
    fatal: (msg: string, obj?: Record<string, unknown>) => {
      if (shouldLog('fatal')) console.error(JSON.stringify(createLogEntry('fatal', msg, module, obj)));
    }
  };
}

function createLogger(module: string): Logger {
  // Use console-based structured logging for all environments
  // This ensures compatibility with Edge Runtime and other environments
  return createConsoleLogger(module);
}

// Pre-configured loggers for different modules
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('DB');
export const uploadLogger = createLogger('UPLOAD');
export const videoLogger = createLogger('VIDEO');
export const indexLogger = createLogger('INDEX');
export const duplicateLogger = createLogger('DUPLICATE');
export const exifLogger = createLogger('EXIF');
export const r2Logger = createLogger('R2');
export const authLogger = createLogger('AUTH');

// Export createLogger function for custom loggers
export { createLogger }; 