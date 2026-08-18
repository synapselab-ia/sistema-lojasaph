import { type Instrumentation } from "next";
import { correlationIdFromHeaders } from "@/lib/observability/core";
import { serverLogger } from "@/lib/observability/server";

function pathWithoutQuery(path: string): string {
  const queryIndex = path.indexOf("?");
  return queryIndex >= 0 ? path.slice(0, queryIndex) : path;
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const correlationId = correlationIdFromHeaders(request.headers);

  serverLogger.error("runtime.request.error", {
    correlationId,
    error,
    context: {
      method: request.method,
      path: pathWithoutQuery(request.path),
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  });
};
