# Botohan - Slack Polling App

A Slack bot that allows users to create and manage polls directly in their Slack workspace.

## Features

- Create polls using the `/botohan` command
- Support for multiple choice and yes/no questions
- Anonymous and public voting options
- Real-time results updates
- Timed polls with automatic closing

## Setup

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/Botohan.git
cd Botohan
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file with your Slack credentials (see `.env.example` for required variables)

4. Start the server
```bash
npm start
```

## Environment Variables

Copy `.env.example` and create a `.env` file with your Slack credentials:

- `SLACK_BOT_TOKEN`: Your Slack Bot User OAuth Token
- `SLACK_SIGNING_SECRET`: Your Slack App Signing Secret
- `PORT`: Port number for the server (default: 3000)

## License

MIT 