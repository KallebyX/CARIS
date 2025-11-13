/**
 * Instrumentation - Next.js 15+ Initialization
 *
 * This file is automatically loaded by Next.js before the application starts.
 * It's the recommended place to initialize Sentry and other instrumentation.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import and initialize Sentry server configuration
    await import("./sentry.server.config")
  }

  // Only run on the Edge Runtime
  if (process.env.NEXT_RUNTIME === "edge") {
    // Import and initialize Sentry edge configuration
    await import("./sentry.server.config")
  }
}

/**
 * Called when instrumentation is finished
 * This is called after all initialization is complete
 */
export async function onRequestError(
  err: Error,
  request: Request,
  context: {
    routerKind: "Pages Router" | "App Router"
    routePath: string
    routeType: "render" | "route" | "action" | "middleware"
  }
) {
  // This is automatically handled by Sentry's Next.js integration
  // But you can add custom logic here if needed

  // Example: Log to external service
  if (process.env.NODE_ENV === "production") {
    console.error("Request error:", {
      error: err.message,
      route: context.routePath,
      type: context.routeType,
      router: context.routerKind,
    })
  }
}
