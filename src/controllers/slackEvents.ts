import { App, AnyMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { Logger } from "../utils/logger";
import { SlackAppMentionEvent } from "../types/slack";
import { MessageParserService } from "../services/messageParser";
import { MessageParseError } from "../types/messageParser";

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

        // Parse the message to extract URLs and context
        const parsedMessage = MessageParserService.parseMessage(mentionEvent);

        Logger.info({
          message: "Successfully parsed message",
          urls: parsedMessage.urls.map((u) => u.url),
          functionName: "SlackEventsController.handleAppMention",
        });

        // TODO: Pass the parsed message to the article fetching and summarization service
        // This will be implemented in a separate ticket

        // Temporary response until summarization is implemented
        const urlList = parsedMessage.urls.map((u) => `• ${u.url}`).join("\n");

        await say({
          text: `I found the following URLs in your message:\n${urlList}\n\nI'll be able to summarize these articles once the summarization feature is implemented!`,
          thread_ts: mentionEvent.thread_ts || mentionEvent.ts,
        });
      } catch (error) {
        Logger.error({
          message: "Error processing app_mention event",
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          eventId: context.eventId,
          functionName: "SlackEventsController.handleAppMention",
        });

        // Provide user-friendly error messages based on error type
        let errorMessage =
          "Sorry, I encountered an error while processing your request. Please try again later.";

        if (error instanceof Error) {
          if ((error as MessageParseError).code === "NO_URLS") {
            errorMessage =
              "I couldn't find any URLs in your message. Please mention me along with the URL you'd like me to summarize!";
          } else if ((error as MessageParseError).code === "INVALID_URL") {
            errorMessage =
              "I found a URL in your message, but it doesn't seem to be valid. Please check the URL and try again!";
          }
        }

        await say({
          text: errorMessage,
          thread_ts: mentionEvent.thread_ts || mentionEvent.ts,
        });
      }
    });
  }
}
