import { Logger } from "../utils/logger";
import {
  ParsedMessage,
  ParsedUrl,
  MessageParseError,
} from "../types/messageParser";
import { SlackAppMentionEvent } from "../types/slack";

export class MessageParserService {
  private static URL_REGEX =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  private static CONTEXT_CHARS = 100; // Number of characters to capture before and after URL
  private static BOT_MENTION_REGEX = /<@[A-Z0-9]+>\s*/;

  /**
   * Extracts URLs and context from a Slack message
   * @param event The Slack app mention event
   * @returns Parsed message data including URLs and context
   * @throws MessageParseError if no valid URLs are found or parsing fails
   */
  public static parseMessage(event: SlackAppMentionEvent): ParsedMessage {
    Logger.info({
      message: "Starting message parsing",
      text: event.text,
      functionName: "MessageParserService.parseMessage",
    });

    try {
      // Remove bot mention and clean whitespace from text
      const cleanText = event.text.replace(this.BOT_MENTION_REGEX, "").trim();

      // Extract URLs from the clean text
      const urlMatches = Array.from(cleanText.matchAll(this.URL_REGEX));

      if (urlMatches.length === 0) {
        const error = new Error(
          "No URLs found in message"
        ) as MessageParseError;
        error.code = "NO_URLS";
        throw error;
      }

      // Check for multiple URLs - throw error if more than one URL is found
      if (urlMatches.length > 1) {
        Logger.warn({
          message: "Multiple URLs found in message",
          urlCount: urlMatches.length,
          functionName: "MessageParserService.parseMessage",
        });

        const error = new Error(
          "Multiple URLs found in message"
        ) as MessageParseError;
        error.code = "MULTIPLE_URLS";
        error.details = { urlCount: urlMatches.length };
        throw error;
      }

      // Process each URL match
      const urls: ParsedUrl[] = [];
      for (const match of urlMatches) {
        const url = match[0];
        const startIndex = match.index!;
        const endIndex = startIndex + url.length;

        try {
          // Validate URL
          new URL(url);

          // Get context before URL
          const contextStartIndex = Math.max(
            0,
            startIndex - this.CONTEXT_CHARS
          );
          const contextBefore = cleanText
            .slice(contextStartIndex, startIndex)
            .trim();

          // Get context after URL
          const contextEndIndex = Math.min(
            cleanText.length,
            endIndex + this.CONTEXT_CHARS
          );
          const contextAfter = cleanText
            .slice(endIndex, contextEndIndex)
            .trim();

          urls.push({
            url,
            contextBefore,
            contextAfter,
          });

          Logger.debug({
            message: "Extracted URL with context",
            url,
            contextBefore,
            contextAfter,
            functionName: "MessageParserService.parseMessage",
          });
        } catch (error) {
          Logger.warn({
            message: "Invalid URL found",
            url,
            error: error instanceof Error ? error.message : "Unknown error",
            functionName: "MessageParserService.parseMessage",
          });

          const parseError = new Error(
            "Invalid URL detected"
          ) as MessageParseError;
          parseError.code = "INVALID_URL";
          parseError.details = { url };
          throw parseError;
        }
      }

      return {
        urls,
        fullText: cleanText,
        mentionId: event.type,
        channelId: event.channel,
        userId: event.user,
        timestamp: event.ts,
        threadTs: event.thread_ts,
      };
    } catch (error) {
      if ((error as MessageParseError).code) {
        throw error;
      }

      const parseError = new Error(
        "Failed to parse message"
      ) as MessageParseError;
      parseError.code = "PARSING_ERROR";
      parseError.details = { originalError: error };
      throw parseError;
    }
  }
}
