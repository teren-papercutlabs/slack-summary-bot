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
   * @param url The URL of the article
   * @param contextBefore Text before the URL in the user's message
   * @param contextAfter Text after the URL in the user's message
   * @returns The formatted response text
   */
  public async generateResponse(
    content: string,
    url: string,
    contextBefore?: string,
    contextAfter?: string
  ): Promise<string> {
    try {
      Logger.info({
        message: "Generating GPT response",
        contentLength: content.length,
        hasContext: !!(contextBefore || contextAfter),
        functionName: "OpenAIService.generateResponse",
      });

      // Construct user context section if provided
      const userContext =
        contextBefore || contextAfter
          ? `User's Context:
${contextBefore ? `Text before URL: "${contextBefore}"` : ""}
${contextAfter ? `Text after URL: "${contextAfter}"` : ""}

Note: The user's message context above may contain specific instructions or areas of focus for the summary. If present, ensure your summary addresses these points while maintaining the overall format.

`
          : "";

      const prompt = `${userContext}Analyze this article and provide a summary in Slack markdown format:

1. Format rules:
   - Use Slack markdown (*bold*, _italic_)
   - The title of the article should also be a link to the article.
   - Only use *bold* for the article title and key point headings (e.g. *Key points* and each numbered bullet title).
   - Don't start points with "This article..."

2. Summary guidelines:
   - Audience: Technical readers at a small startup (engineers, AI leads, and CTOs) building AI-powered products or using AI in their dev workflows.
   - Focus on specific engineering decisions, workflows, automation strategies, and quantitative outcomes.
   - Avoid generic or high-level summaries. Prioritize details like pipeline structure, token usage, prompt iteration, retry mechanisms, and team-wide strategies.
   - The reader should walk away knowing what made this implementation *work* — not just what was done.
   - Keep it clear enough that a junior dev could understand it, but sharp enough that a CTO would learn something new.
   - When technical terms are defined outside what a junior dev to know, explain those terms e.g. "Approximate Nearest Neighbor (ANN) solutions, specifically the Inverted File Index (IVF), to manage real-time updates efficiently." and "The team chose IVF over HNSW for its balance between speed and performance" are too technical without context and explanation.

3. End with a *Practical application:* section.
   - Be opinionated. Evaluate which aspects are genuinely useful or replicable for a small team — and which are overkill.
   - Suggest concrete adaptations for smaller teams with limited time and tooling.
   - If something is clever, call it out. If it's over-engineered, say so.
   - Where possible, suggest a simpler or leaner implementation of the same core ideas.

4. FOLLOW THIS EXACT FORMAT – NO DEVIATIONS:

<{article url}|*{article title}*>

*Summary:* {2–3 sentence technical summary — what was done, what made it notable, and how it was achieved}

*Key points*
1. *{Titled point}.* {On the same line, include the detail. Focus on architecture, technical decisions, automation patterns, data used, or results.}
2. *{Another insight}.* {Same style — concrete, concise, insightful.}
3. ...

*Counterargument:* {Present counterarguments to the points the article made. But do not be dishonest.}

---

📉 Bad Example (Too Generic):

<https://example.com|*Some Company Migrated Tests to RTL*>

*Summary:* This article describes how a team migrated from Enzyme to RTL. They used LLMs and finished it faster than expected.

*Key Points*

1. *They used LLMs.* The team used LLMs to help with the migration.

2. *It was faster than manual work.* It saved time and effort.

3. *They structured the process.* The team followed a structured approach.

*Counterargument:* Such a process is not scalable.

👎 Why this is bad:
- Vague summaries ("used LLMs" — how?)
- No mention of pipeline structure, retries, token limits, success rates
- Practical application is empty calories: no opinion, no adaptation advice

---

📈 Good Example (What You Should Aim For):

<https://airbnb.io/test-migration|*Airbnb Migrated 3.5K Tests with LLMs in 6 Weeks*>

*Summary:* Airbnb used LLMs to automate 97% of a 3.5K-file test migration from Enzyme to React Testing Library, compressing 1.5 years of manual work into 6 weeks. By designing a modular, retryable pipeline and progressively expanding prompt context, they preserved test intent and code coverage while scaling migration throughput.

*Key points*

1. *Modular pipeline via state machine.* Files flowed through discrete validation/refactor steps modeled as a state machine, enabling parallelism and controlled error handling. This structure allowed granular visibility into failures and the ability to retry only the failing step, without reprocessing the entire file.

2. *Aggressive retries with dynamic prompts.* Failed steps triggered automated retries, with each attempt incorporating updated error context and prior file diffs. Many files succeeded within 10 attempts, using what was essentially a brute-force strategy that still saved massive amounts of developer time.

3. *Scaling context to 100K tokens for tricky files.* For tests with custom setups or cross-file dependencies, prompts were expanded to include related test files, domain-specific migration rules, and working examples. This helped the LLM infer architectural patterns and avoid breaking intended test behavior.

4. Iterative tuning loop: sample, tune, sweep. Airbnb analyzed a sample of failed migrations to identify common error patterns ("sample"), adjusted prompts and scripts to address those issues ("tune"), and then reprocessed the full set with the improvements ("sweep"). This loop helped raise the automation success rate from 75% to 97%, systematically knocking out edge cases and long-tail failures.

*Counterargument:* While the approach showed impressive success at scale, it required significant upfront investment in infrastructure and prompt engineering expertise. The error handling complexity and token-heavy approach might be overkill for smaller migrations. Teams should consider whether the automation ROI justifies the initial setup costs, especially when migration tools and frameworks continue to evolve rapidly. For many organizations, a hybrid approach with targeted human review might be more practical than pursuing 97%+ automation rates.

---

Use the structure and depth of the *Good Example* as your reference. Match the tone, format, and level of detail exactly.

Article content:
${content}

Article URL (only to be used for the article title link):
${url}
`;

      Logger.info({
        message: "Prompt",
        prompt,
        functionName: "OpenAIService.generateResponse",
      });

      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // 4o is intended, do not fix this
        messages: [
          {
            role: "system",
            content:
              "You are a precise, insightful, and experienced software developer summarizing a technical article for a small dev team building AI products. Your audience includes junior developers and CTOs. Your job is to distill high-signal insights, focusing on implementation details, clever techniques, and patterns worth learning from. Be concise, but don't shy away from nuance or explaining technical concepts. Use Slack markdown. Point out where the article is especially helpful—or where it overreaches.",
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
