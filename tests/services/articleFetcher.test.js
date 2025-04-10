"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const articleFetcher_1 = require("../../src/services/articleFetcher");
const axios_1 = __importDefault(require("axios"));
// Mock axios
jest.mock("axios");
const mockedAxios = axios_1.default;
describe("ArticleFetcherService", () => {
    let service;
    beforeEach(() => {
        service = articleFetcher_1.ArticleFetcherService.getInstance();
        jest.clearAllMocks();
    });
    describe("getInstance", () => {
        it("should create a singleton instance", () => {
            const instance1 = articleFetcher_1.ArticleFetcherService.getInstance();
            const instance2 = articleFetcher_1.ArticleFetcherService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe("fetchArticleContent", () => {
        const mockUrl = "https://example.com/article";
        it("should fetch and extract article content successfully", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockHtml = `
        <html>
          <body>
            <div>This is a test article with more than 50 characters to pass the length check.</div>
          </body>
        </html>
      `;
            mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });
            const content = yield service.fetchArticleContent(mockUrl);
            expect(content).toContain("This is a test article");
            expect(mockedAxios.get).toHaveBeenCalledWith(mockUrl, expect.objectContaining({
                headers: expect.objectContaining({
                    "User-Agent": expect.stringContaining("SlackSummaryBot"),
                }),
            }));
        }));
        it("should detect paywalled content", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockHtml = `
        <html>
          <body>
            <div>This content requires a subscription to continue reading.</div>
          </body>
        </html>
      `;
            mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });
            yield expect(service.fetchArticleContent(mockUrl)).rejects.toThrow(new articleFetcher_1.ArticleFetchError("This article appears to be behind a paywall", "PAYWALL_DETECTED"));
        }));
        it("should handle HTTP errors", () => __awaiter(void 0, void 0, void 0, function* () {
            const error = {
                response: {
                    status: 404,
                    statusText: "Not Found",
                },
            };
            mockedAxios.get.mockRejectedValueOnce(error);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);
            yield expect(service.fetchArticleContent(mockUrl)).rejects.toThrow(new articleFetcher_1.ArticleFetchError("Failed to fetch article: 404 Not Found", "FETCH_ERROR"));
        }));
        it("should handle network errors", () => __awaiter(void 0, void 0, void 0, function* () {
            const error = {
                request: {},
            };
            mockedAxios.get.mockRejectedValueOnce(error);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);
            yield expect(service.fetchArticleContent(mockUrl)).rejects.toThrow(new articleFetcher_1.ArticleFetchError("Failed to reach the article URL", "FETCH_ERROR"));
        }));
        it("should handle timeout errors", () => __awaiter(void 0, void 0, void 0, function* () {
            const error = {
                code: "ECONNABORTED",
            };
            mockedAxios.get.mockRejectedValueOnce(error);
            mockedAxios.isAxiosError.mockReturnValueOnce(true);
            yield expect(service.fetchArticleContent(mockUrl)).rejects.toThrow(new articleFetcher_1.ArticleFetchError("Request timed out while fetching the article", "FETCH_ERROR"));
        }));
        it("should handle empty content", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockHtml = "<html><body>Short</body></html>";
            mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });
            yield expect(service.fetchArticleContent(mockUrl)).rejects.toThrow(new articleFetcher_1.ArticleFetchError("Could not extract meaningful content from the article", "EMPTY_CONTENT"));
        }));
        it("should set appropriate user agent header", () => __awaiter(void 0, void 0, void 0, function* () {
            mockedAxios.get.mockResolvedValueOnce({
                data: "<html><body><p>Some content that is long enough to pass the minimum length check.</p></body></html>",
                status: 200,
                statusText: "OK",
                headers: {},
                config: {},
            });
            yield service.fetchArticleContent(mockUrl);
            expect(mockedAxios.get).toHaveBeenCalledWith(mockUrl, {
                headers: {
                    "User-Agent": expect.stringContaining("SlackSummaryBot/1.0"),
                },
                timeout: 10000,
                maxRedirects: 5,
            });
        }));
        it("should handle content with mixed HTML and text", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockHtml = `
        <html>
          <body>
            <div>
              <h1>Mixed Content Test</h1>
              <p>This is a <strong>formatted</strong> paragraph with <a href="#">links</a>.</p>
              <ul>
                <li>List item 1</li>
                <li>List item 2</li>
              </ul>
            </div>
          </body>
        </html>
      `;
            mockedAxios.get.mockResolvedValueOnce({
                data: mockHtml,
                status: 200,
                statusText: "OK",
                headers: {},
                config: {},
            });
            const content = yield service.fetchArticleContent(mockUrl);
            // Should contain text content
            expect(content).toContain("Mixed Content Test");
            expect(content).toContain("formatted");
            expect(content).toContain("List item");
            // Should not contain HTML tags
            expect(content).not.toMatch(/<[^>]+>/);
            // Should not have excessive whitespace
            expect(content).not.toMatch(/\s{2,}/);
        }));
    });
});
