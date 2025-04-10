import { App, AnyMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { Logger } from "../utils/logger";
import { SlackAppMentionEvent } from "../types/slack";

export class SlackEventsController {
  constructor(private app: App) {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Log all incoming events
    this.app.use(async ({ body, context, next }) => {
      Logger.info({
        message: "Received Slack event",
        eventType: body.type,
        teamId: context.teamId,
        functionName: "SlackEventsController.middleware",
      });
      await next();
    });

    // Handle app_mention events
    this.app.event("app_mention", async ({ event, say, context }) => {
      const mentionEvent = event as SlackAppMentionEvent;

      try {
        Logger.info({
          message: "Processing app_mention event",
          eventId: context.eventId,
          channelId: mentionEvent.channel,
          text: mentionEvent.text,
          functionName: "SlackEventsController.handleAppMention",
        });

        // Acknowledge receipt of the mention
        await say({
          text: "👋 I received your mention! I'm processing your request...",
          thread_ts: mentionEvent.thread_ts || mentionEvent.ts,
        });

        // TODO: Add actual message processing logic here
        // This will be implemented in a separate ticket
      } catch (error) {
        Logger.error({
          message: "Error processing app_mention event",
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          eventId: context.eventId,
          functionName: "SlackEventsController.handleAppMention",
        });

        // Notify the user of the error
        await say({
          text: "Sorry, I encountered an error while processing your request. Please try again later.",
          thread_ts: mentionEvent.thread_ts || mentionEvent.ts,
        });
      }
    });
  }
}
