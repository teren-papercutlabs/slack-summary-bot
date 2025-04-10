export interface ParsedUrl {
  url: string;
  contextBefore: string;
  contextAfter: string;
}

export interface ParsedMessage {
  urls: ParsedUrl[];
  fullText: string;
  mentionId: string;
  channelId: string;
  userId: string;
  timestamp: string;
  threadTs?: string;
}

export interface MessageParseError extends Error {
  code: "NO_URLS" | "INVALID_URL" | "PARSING_ERROR" | "MULTIPLE_URLS";
  details?: Record<string, unknown>;
}
