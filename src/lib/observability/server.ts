import "server-only";

import {
  createStructuredLogRecord,
  type LogLevel,
} from "./core";

interface ServerLogInput {
  readonly correlationId?: string | null;
  readonly context?: Record<string, unknown>;
  readonly error?: unknown;
}

function emit(level: LogLevel, event: string, input: ServerLogInput = {}): void {
  const record = createStructuredLogRecord({ level, event, ...input });
  const line = JSON.stringify(record);

  switch (level) {
    case "error":
      console.error(line);
      return;
    case "warn":
      console.warn(line);
      return;
    case "debug":
      console.debug(line);
      return;
    default:
      console.info(line);
  }
}

export const serverLogger = Object.freeze({
  debug(event: string, input?: ServerLogInput) {
    emit("debug", event, input);
  },
  info(event: string, input?: ServerLogInput) {
    emit("info", event, input);
  },
  warn(event: string, input?: ServerLogInput) {
    emit("warn", event, input);
  },
  error(event: string, input?: ServerLogInput) {
    emit("error", event, input);
  },
});
