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
const ngrok_1 = __importDefault(require("ngrok"));
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
function startDev() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Start the server using ts-node-dev
            const server = (0, child_process_1.spawn)("npx", ["ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"], {
                stdio: "inherit",
                shell: true,
            });
            // Wait a bit for the server to start
            yield new Promise((resolve) => setTimeout(resolve, 3000));
            // Start ngrok
            const url = yield ngrok_1.default.connect({
                addr: PORT,
                proto: "http",
            });
            console.log("\n=== Development Server ===");
            console.log(`Local: http://localhost:${PORT}`);
            console.log(`Public: ${url}`);
            console.log("\nUse the Public URL in your Slack App Event Subscriptions settings");
            console.log("Press Ctrl+C to stop the server\n");
            // Handle cleanup
            process.on("SIGINT", () => __awaiter(this, void 0, void 0, function* () {
                console.log("\nShutting down...");
                yield ngrok_1.default.kill();
                server.kill();
                process.exit(0);
            }));
        }
        catch (error) {
            console.error("Error starting development server:", error);
            process.exit(1);
        }
    });
}
startDev();
