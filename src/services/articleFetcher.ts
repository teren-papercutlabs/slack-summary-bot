import { Logger } from "../utils/logger";
import axios from "axios";

export class ArticleFetchError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "PAYWALL_DETECTED"
      | "FETCH_ERROR"
      | "INVALID_CONTENT"
      | "EMPTY_CONTENT"
  ) {
    super(message);
    this.name = "ArticleFetchError";
  }
}

export class ArticleFetcherService {
  private static instance: ArticleFetcherService;

  private constructor() {}

  public static getInstance(): ArticleFetcherService {
    if (!ArticleFetcherService.instance) {
      ArticleFetcherService.instance = new ArticleFetcherService();
    }
    return ArticleFetcherService.instance;
  }

  /**
   * Fetches and extracts the main content from an article URL
   * @param url The URL of the article to fetch
   * @returns The extracted article content
   * @throws ArticleFetchError if content cannot be fetched or processed
   */
  public async fetchArticleContent(url: string): Promise<string> {
    try {
      Logger.info({
        message: "Fetching article content",
        url,
        functionName: "ArticleFetcherService.fetchArticleContent",
      });

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SlackSummaryBot/1.0; +https://github.com/your-repo/slack-summary-bot)",
        },
        // Add reasonable timeout
        timeout: 10000,
        // Follow redirects
        maxRedirects: 5,
      });

      const html = response.data;

      // Check for common paywall indicators
      if (this.isPaywalled(html)) {
        throw new ArticleFetchError(
          "This article appears to be behind a paywall",
          "PAYWALL_DETECTED"
        );
      }

      const content = this.extractContent(html);

      if (!content) {
        throw new ArticleFetchError(
          "Could not extract meaningful content from the article",
          "EMPTY_CONTENT"
        );
      }

      Logger.info({
        message: "Successfully fetched article content",
        url,
        contentLength: content.length,
        functionName: "ArticleFetcherService.fetchArticleContent",
      });

      return content;
    } catch (error) {
      if (error instanceof ArticleFetchError) {
        throw error;
      }

      Logger.error({
        message: "Error fetching article content",
        url,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        functionName: "ArticleFetcherService.fetchArticleContent",
      });

      // Handle axios specific errors
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new ArticleFetchError(
            "Request timed out while fetching the article",
            "FETCH_ERROR"
          );
        }
        if (error.response) {
          throw new ArticleFetchError(
            `Failed to fetch article: ${error.response.status} ${error.response.statusText}`,
            "FETCH_ERROR"
          );
        }
        if (error.request) {
          throw new ArticleFetchError(
            "Failed to reach the article URL",
            "FETCH_ERROR"
          );
        }
      }

      // For any other type of error
      throw new ArticleFetchError(
        error instanceof Error
          ? error.message
          : "Failed to fetch article content",
        "FETCH_ERROR"
      );
    }
  }

  /**
   * Checks if the article content indicates a paywall
   */
  private isPaywalled(html: string): boolean {
    // Specific phrases that indicate paywalls
    const paywallPhrases = [
      "subscribe to continue reading",
      "subscription required",
      "premium content",
      "premium article",
      "subscribers only",
      "paid subscribers",
      "premium access",
      "membership required",
      "for subscribers",
      "premium members",
      "subscribe to read",
      "premium subscription",
      "paid membership",
      "register to continue",
      "sign up to read more",
      "subscribe for full access",
    ];

    const lowerHtml = html.toLowerCase();

    // Check for any paywall phrase
    const matchedPhrase = paywallPhrases.find((phrase) =>
      lowerHtml.includes(phrase)
    );

    if (matchedPhrase) {
      Logger.info({
        message: "Paywall detected",
        matchedPhrase,
        functionName: "ArticleFetcherService.isPaywalled",
      });
      return true;
    }

    return false;
  }

  /**
   * Extracts the main content from the HTML
   * This is a basic implementation that could be enhanced with libraries like 'readability'
   */
  private extractContent(html: string): string {
    // Remove script tags and their content
    html = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    // Remove style tags and their content
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

    // Remove all HTML tags
    html = html.replace(/<[^>]+>/g, " ");

    // Replace multiple spaces/newlines with single space
    html = html.replace(/\s+/g, " ");

    // Trim the content
    html = html.trim();

    // Return empty string if the content is too short (likely not meaningful)
    if (html.length < 50) {
      // Reduced minimum length for testing
      return "";
    }

    return html;
  }
}
