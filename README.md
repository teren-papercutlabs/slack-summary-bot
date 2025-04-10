# Slack Summary Bot

A Slack bot that uses OpenAI's API to provide summaries and insights from conversations.

## Features

- Summarize channel conversations
- Integration with OpenAI API
- Configurable summary parameters
- Secure handling of API keys and tokens

## Prerequisites

- Node.js (v16 or higher)
- npm
- Slack Workspace Admin access
- OpenAI API key

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd slack-summary-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

- `SLACK_BOT_TOKEN`: Your Slack Bot User OAuth Token
- `SLACK_SIGNING_SECRET`: Your Slack App Signing Secret
- `SLACK_APP_TOKEN`: Your Slack App-Level Token
- `OPENAI_API_KEY`: Your OpenAI API Key
- `PORT`: Port number for the server (default: 3000)
- `NODE_ENV`: Environment (development/production)

5. Start the development server:

```bash
npm run dev
```

## Development

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build the TypeScript project
- `npm start`: Start the production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests

## Project Structure

```
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── services/      # Business logic
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── tests/             # Test files
└── package.json       # Project metadata and dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
