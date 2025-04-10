// Load environment variables first
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Configure dotenv to not fail if .env is missing
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

// Verify environment variables were loaded
const envVarInfo = {
  hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  openAIKeyLength: process.env.OPENAI_API_KEY?.length,
  openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 3),
  allEnvKeys: Object.keys(process.env).filter(
    (key) => !key.toLowerCase().includes("key")
  ),
  nodeEnv: process.env.NODE_ENV,
};
console.log("Environment variables loaded:", envVarInfo);

import { Logger } from "./utils/logger";
import { slackApp } from "./config/slack";
import { SlackEventsController } from "./controllers/slackEvents";

async function startApp() {
  try {
    Logger.info({
      message: "Starting Slack Summary Bot",
      nodeEnv: process.env.NODE_ENV,
      functionName: "startApp",
    });

    // Initialize Slack events controller
    new SlackEventsController(slackApp);

    // The app.start() is already called in the slack config
    // to ensure proper initialization order
  } catch (error) {
    Logger.error({
      message: "Failed to start application",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      functionName: "startApp",
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  Logger.error({
    message: "Uncaught exception",
    error: error.message,
    stack: error.stack,
    functionName: "uncaughtException",
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  Logger.error({
    message: "Unhandled promise rejection",
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    functionName: "unhandledRejection",
  });
  process.exit(1);
});

// Start the application
startApp();
