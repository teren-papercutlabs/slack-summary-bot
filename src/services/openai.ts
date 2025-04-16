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
   - The title of the article should also be a link to the article. There should not be a separate link for the title.
   - Only use bold for the title of the article and the "title" of the insights
   - Don't use [xx] style headers
   - Don't start points with "This article..."
   - Make the summary direct and concise
2. Include a 'practical application' paragraph/section at the end that with suggestions as to how to practically apply the insights of the article. The audience is a small group of developers interested in building AI products, and using AI in the development process.
3. Follow this example format strictly:

*Beyond the AI MVP: What it really takes*

*Summary:* The article argues most AI companies are trapped in a deceptive MVP phase without proper testing infrastructure, as evidenced by inconsistent performance between model versions. It details how building reliable AI systems requires extensive tooling including eval suites, automated grading, and observability tools. Most organizations lack these essential tools despite their importance, creating a significant gap between prototype and production-ready AI. Companies that invest in understanding their systems and building robust measurement tools will ultimately succeed in AI development.

*Key points*

1. *The AI MVP Trap:* Initial AI prototypes may look promising but often fail in real-world applications due to a lack of robust testing and evaluation infrastructure. Many companies remain in this deceptive MVP stage, unable to progress to more reliable systems.
2. *Building Essential Tools:* Creating a reliable AI system requires extensive tooling, including comprehensive test suites, automated grading, and observability tools. The difficulty lies not in writing tests but in integrating these tools into the development lifecycle, which most companies have yet to achieve.
3. *Industry Maturity:* The AI industry is still immature, with few established practices or examples to guide development. Success depends on companies investing in understanding and improving their systems rather than relying on superficial strategies or the latest models.

*Practical application:*

To effective apply these insights, founders and developers should prioritize building robust evaluation and observability tools tailored to their specific AI use cases. This includes developing comprehensive test suites with diverse scenarios, implementing automated grading systems for AI interactions, and establishing observability mechanisms to monitor and understand AI behavior in real-time. By investing in these foundational tools, teams can move beyond the deceptive allure of quick MVPs and ensure their AI products perform reliably in production environments. This proactive approach enables smaller teams to iterate rapidly, learn from real-world feedback, and maintain a competitive edge over larger organizations that may struggle with bureaucratic hurdles and slower adaptation. ​

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
