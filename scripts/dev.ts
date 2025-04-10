import ngrok from "ngrok";
import { spawn } from "child_process";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startDev() {
  try {
    // Start the server using ts-node-dev
    const server = spawn(
      "npx",
      ["ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"],
      {
        stdio: "inherit",
        shell: true,
      }
    );

    // Wait a bit for the server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Start ngrok
    const url = await ngrok.connect({
      addr: PORT,
      proto: "http",
    });

    console.log("\n=== Development Server ===");
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Public: ${url}`);
    console.log(
      "\nUse the Public URL in your Slack App Event Subscriptions settings"
    );
    console.log("Press Ctrl+C to stop the server\n");

    // Handle cleanup
    process.on("SIGINT", async () => {
      console.log("\nShutting down...");
      await ngrok.kill();
      server.kill();
      process.exit(0);
    });
  } catch (error) {
    console.error("Error starting development server:", error);
    process.exit(1);
  }
}

startDev();
