import { App } from "@slack/bolt";
import { Logger } from "../utils/logger";
import { SlackAppMentionEvent } from "../types/slack";
import { MessageParserService } from "../services/messageParser";
import { MessageParseError } from "../types/messageParser";
import { OpenAIService } from "../services/openai";
import {
  ArticleFetcherService,
  ArticleFetchError,
} from "../services/articleFetcher";

export class SlackEventsController {
  private openaiService: OpenAIService;
  private articleFetcher: ArticleFetcherService;

  constructor(private app: App) {
    this.openaiService = OpenAIService.getInstance();
    this.articleFetcher = ArticleFetcherService.getInstance();
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

        // Process each URL (though we currently only support one)
        for (const urlInfo of parsedMessage.urls) {
          try {
            // Fetch article content
            const content = await this.articleFetcher.fetchArticleContent(
              urlInfo.url
            );

            // Generate response using OpenAI
            const response = await this.openaiService.generateResponse(content);

            // Format and post the response

            await say({
              text: response,
              thread_ts: mentionEvent.thread_ts || mentionEvent.ts,
              reply_broadcast: true,
            });
          } catch (error) {
            let errorMessage =
              "I encountered an error while processing the article.";

            if (error instanceof ArticleFetchError) {
              switch (error.code) {
                case "PAYWALL_DETECTED":
                  errorMessage =
                    "Sorry, but this article appears to be behind a paywall. I can't access its content.";
                  break;
                case "FETCH_ERROR":
                  errorMessage =
                    "I couldn't fetch the article. Please make sure the URL is accessible.";
                  break;
                case "EMPTY_CONTENT":
                  errorMessage =
                    "I couldn't find any meaningful content in the article. The page might be empty or require JavaScript to load.";
                  break;
              }
            }

            await say({
              text: errorMessage,
              thread_ts: mentionEvent.thread_ts || mentionEvent.ts,
            });
          }
        }
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
          } else if ((error as MessageParseError).code === "MULTIPLE_URLS") {
            errorMessage =
              "I found multiple URLs in your message. For now, I can only summarize one article at a time. Please send me one URL at a time!";
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
