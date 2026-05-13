import {
  defineEventHandler,
  readBody,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from "h3";

interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
  url?: string;
  userAgent?: string;
  stacks?: string[];
  extra?: any;
}

interface ClientLogRequest {
  logs: LogEntry[];
}

export default defineEventHandler(async (event: H3Event) => {
  if (event.node.req.method !== "POST") {
    setResponseStatus(event, 405);
    return "Method not allowed";
  }

  try {
    const body = (await readBody(event)) as ClientLogRequest;

    if (!body.logs || !Array.isArray(body.logs)) {
      setResponseStatus(event, 400);
      return "Invalid request body";
    }

    // Forward each log to the server console
    body.logs.forEach((log) => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const location = log.url ? ` (${log.url})` : "";
      const prefix = `[browser] [${timestamp}]`;

      let message = `${prefix} [${log.level}] ${log.message}${location}`;

      // Add stack traces if available
      if (log.stacks && log.stacks.length > 0) {
        message +=
          "\n" +
          log.stacks
            .map((stack) =>
              stack
                .split("\n")
                .map((line) => `    ${line}`)
                .join("\n"),
            )
            .join("\n");
      }

      // Add extra data if available
       
      if (log.extra) {
        message +=
          "\n    Extra data: " +
          JSON.stringify(log.extra, null, 2)
            .split("\n")
            .map((line, i) => (i === 0 ? line : `    ${line}`))
            .join("\n");
      }

      // Log to server console based on level
      switch (log.level) {
        case "error":
          console.error(message);
          break;
        case "warn":
          console.warn(message);
          break;
        case "info":
          console.info(message);
          break;
        case "debug":
          console.log(message);
          break;
        default:
          console.log(message);
      }
    });

    setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");
    return JSON.stringify({ success: true });
  } catch (error) {
    console.error("Error processing client logs:", error);
    setResponseStatus(event, 400);
    setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");
    return JSON.stringify({ error: "Invalid JSON" });
  }
});
