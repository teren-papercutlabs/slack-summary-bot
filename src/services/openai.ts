import OpenAI from "openai";
import { Logger } from "../utils/logger";

export class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI;

  private constructor() {
    // Detailed API key validation
    const apiKey = process.env.OPENAI_API_KEY;
    console.log("OpenAIService constructor - Validating API key");

    if (!apiKey) {
      Logger.error({
        message: "OPENAI_API_KEY environment variable is not set",
        envKeys: Object.keys(process.env).filter(
          (key) => !key.toLowerCase().includes("key")
        ),
        functionName: "OpenAIService.constructor",
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd(),
      });
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    // Validate API key format
    const trimmedKey = apiKey.trim();
    const keyValidation = {
      originalLength: apiKey.length,
      trimmedLength: trimmedKey.length,
      startsWithSk: trimmedKey.startsWith("sk-"),
      hasWhitespace: /\s/.test(apiKey),
      isExpectedLength: trimmedKey.length > 40, // OpenAI keys are typically longer than 40 chars
    };

    Logger.info({
      message: "OpenAI API key validation",
      validation: keyValidation,
      functionName: "OpenAIService.constructor",
    });

    if (!keyValidation.startsWithSk || !keyValidation.isExpectedLength) {
      Logger.error({
        message: "Invalid OpenAI API key format",
        validation: keyValidation,
        functionName: "OpenAIService.constructor",
      });
      throw new Error(
        "Invalid OpenAI API key format - must start with 'sk-' and be of sufficient length"
      );
    }

    this.client = new OpenAI({
      apiKey: trimmedKey,
    });

    // Test if client was initialized properly
    Logger.info({
      message: "OpenAI client initialized",
      clientExists: !!this.client,
      functionName: "OpenAIService.constructor",
    });
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Generates a response using GPT-4 for Slack output
   * @param content The article content to analyze
   * @returns The formatted response text
   */
  public async generateResponse(content: string): Promise<string> {
    try {
      Logger.info({
        message: "Generating GPT response",
        contentLength: content.length,
        functionName: "OpenAIService.generateResponse",
      });

      const prompt = `Analyze this article and provide a summary in Slack markdown format:

1. Format rules:
   - Use Slack markdown (*bold*, _italic_)
   - The title of the article should also be a link to the article. There should not be a separate link "Article Summary" title at the top of the summary.
   - Only use *bold* for the article title and for the key point headings (e.g. *Key points* and each numbered bullet title)
   - Don’t use [xx] style headers
   - Don’t start points with “This article…”

2. Summary guidelines:
   - Audience: Technical readers (engineers and developers, including those building AI tooling/products)
   - Prioritize concrete technical insights, implementation details, and any interesting engineering design decisions
   - Avoid overly broad or generic summaries—look for specific workflows, architecture choices, or quantitative outcomes that would matter to engineers
   - Include stats, percentages, success rates, or scoped metrics where relevant
   - Surface interesting uses of LLMs (e.g. how context is used, retry logic, pipeline structure)
   - Be concise but not shallow—focus on signal

3. End with a *Practical application:* section tailored for a small dev team using AI in their development workflow. Highlight actionable insights, implementation ideas, or principles they could adopt.

4. FOLLOW THIS EXACT FORMAT – NO DEVIATIONS:

<{article url}|*{article title}*>

*Summary:* {2–3 sentence summary with technical angle—e.g. what was done, why it was notable, and what technical choices made it work}

*Key points*

1. *{First technical insight}* {Description}
2. *{Second technical insight}* {Description}
3. *{Third technical insight}* {Description}
...

*Practical application:* {Tailored advice or ideas based on the article's engineering strategies}

Article content:
${content}`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // 4o is intended, do not fix this
        messages: [
          {
            role: "system",
            content:
              "You are a precise and insightful article summarizer. Create summaries in Slack markdown format, focusing on the most important information and interesting points. Be direct and concise, but be sure to point out if anything is particularly significant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response generated by OpenAI");
      }

      Logger.info({
        message: "Successfully generated GPT response",
        responseLength: responseText.length,
        functionName: "OpenAIService.generateResponse",
      });

      return responseText;
    } catch (error) {
      Logger.error({
        message: "Failed to generate GPT response",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        functionName: "OpenAIService.generateResponse",
      });
      throw error;
    }
  }
}
