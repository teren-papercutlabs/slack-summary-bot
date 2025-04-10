import { App } from "@slack/bolt";
import { Logger } from "../utils/logger";

// Validate required environment variables
const requiredEnvVars = [
  "SLACK_BOT_TOKEN",
  "SLACK_SIGNING_SECRET",
  "SLACK_APP_TOKEN",
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    Logger.error({
      message: "Missing required environment variable",
      envVar,
      functionName: "slackConfig",
    });
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize Slack app with environment variables
export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  customRoutes: [
    {
      path: "/slack/events",
      method: ["POST"],
      handler: async (req, res) => {
        // This route will be handled by our custom middleware and controller
        res.writeHead(200);
        res.end();
      },
    },
  ],
});

// Log when the app is ready
slackApp
  .start()
  .then((port) => {
    Logger.info({
      message: "Slack app is running",
      port,
      functionName: "slackApp.start",
    });
  })
  .catch((error) => {
    Logger.error({
      message: "Failed to start Slack app",
      error: error.message,
      stack: error.stack,
      functionName: "slackApp.start",
    });
    process.exit(1);
  });
