"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messageParser_1 = require("../../src/services/messageParser");
describe("MessageParserService", () => {
    const createMockEvent = (text) => ({
        type: "app_mention",
        text,
        user: "U123456",
        ts: "1234567890.123456",
        channel: "C123456",
        event_ts: "1234567890.123456",
        team_id: "T123456",
    });
    describe("parseMessage", () => {
        it("should extract a single URL with context", () => {
            const event = createMockEvent("<@U08MJLMBQ9K> Please summarize this article https://example.com/article for me");
            const result = messageParser_1.MessageParserService.parseMessage(event);
            expect(result.urls).toHaveLength(1);
            expect(result.urls[0].url).toBe("https://example.com/article");
            expect(result.urls[0].contextBefore).toBe("Please summarize this article");
            expect(result.urls[0].contextAfter).toBe("for me");
        });
        it("should throw MULTIPLE_URLS error when multiple URLs are found", () => {
            const event = createMockEvent("<@U08MJLMBQ9K> Compare these articles: https://example.com/article1 and https://example.com/article2");
            expect(() => messageParser_1.MessageParserService.parseMessage(event)).toThrow(expect.objectContaining({
                code: "MULTIPLE_URLS",
            }));
        });
        it("should throw NO_URLS error when no URLs are found", () => {
            const event = createMockEvent("<@U08MJLMBQ9K> Hello, can you help me?");
            expect(() => messageParser_1.MessageParserService.parseMessage(event)).toThrow(expect.objectContaining({
                code: "NO_URLS",
            }));
        });
        it("should throw NO_URLS error when no URLs are recognized", () => {
            const event = createMockEvent("<@U08MJLMBQ9K> Check this: https://invalid\\ url\\ with\\ spaces");
            expect(() => messageParser_1.MessageParserService.parseMessage(event)).toThrow(expect.objectContaining({
                code: "NO_URLS",
            }));
        });
        it("should handle URLs with query parameters and fragments", () => {
            const event = createMockEvent("<@U08MJLMBQ9K> Check this article https://example.com/article?id=123#section1");
            const result = messageParser_1.MessageParserService.parseMessage(event);
            expect(result.urls).toHaveLength(1);
            expect(result.urls[0].url).toBe("https://example.com/article?id=123#section1");
        });
        it("should preserve thread information when present", () => {
            const event = Object.assign(Object.assign({}, createMockEvent("<@U08MJLMBQ9K> https://example.com/article")), { thread_ts: "1234567890.123457" });
            const result = messageParser_1.MessageParserService.parseMessage(event);
            expect(result.threadTs).toBe("1234567890.123457");
        });
        it("should handle messages with URLs but no additional context", () => {
            const event = createMockEvent("<@U08MJLMBQ9K> https://example.com/article");
            const result = messageParser_1.MessageParserService.parseMessage(event);
            expect(result.urls).toHaveLength(1);
            expect(result.urls[0].contextBefore).toBe("");
            expect(result.urls[0].contextAfter).toBe("");
        });
    });
});
