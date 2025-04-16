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
  public async generateResponse(content: string, url: string): Promise<string> {
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
   - Audience: Technical readers in a small dev team building AI products, with experience ranging from junior developers to CTOs
   - Prioritize *specific technical insights*—workflow patterns, automation strategies, prompt engineering techniques, architectural tradeoffs
   - Avoid generic language—highlight implementation details or concrete decisions that devs could learn from or adapt
   - Be accessible: briefly explain any concept (e.g. “state machine,” “dynamic prompting”) that a junior developer might not be familiar with
   - Include relevant metrics (e.g. success rates, token sizes, time reductions)
   - Highlight notable uses of LLMs—how prompts were structured, how context was assembled, what made the system robust or scalable
   - Be concise but not shallow—prioritize signal over summary

3. End with a *Practical application:* section:
   - Frame insights as actionable ideas for a small dev team using LLMs or AI tools in their codebase
   - If parts of the article would be overkill for a small team, say so
   - Feel free to add implementation suggestions (e.g. what tools or workflows might help replicate the approach)

4. FOLLOW THIS EXACT FORMAT – NO DEVIATIONS:

<{article url}|*{article title}*>

*Summary:* {2–3 sentence summary with a technical angle—what was done, what made it work, and why it mattered}

*Key points*

1. *{First technical insight}.* {Description on the same line—make it detailed but readable}
2. *{Second technical insight}.* {Description on the same line}
3. *{Third technical insight}.* {Description on the same line}
...

*Practical application:* {Tailored advice or ideas for the stated audience. Be critical and helpful. Recommend useful patterns and tools. Call out fluff if needed.}

Article content:
${content}

Article URL (only to be used for the article title link):
${url}
`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // 4o is intended, do not fix this
        messages: [
          {
            role: "system",
            content:
              "You are a precise, insightful, and experienced software developer summarizing a technical article for a small dev team building AI products. Your audience includes junior developers and CTOs. Your job is to distill high-signal insights, focusing on implementation details, clever techniques, and patterns worth learning from. Be concise, but don’t shy away from nuance. Use Slack markdown. Point out where the article is especially helpful—or where it overreaches.",
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
