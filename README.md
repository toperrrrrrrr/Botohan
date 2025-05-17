# Botohan - Slack Polling App

A simple Slack app that enables teams to quickly create and manage polls for collecting opinions and feedback.

## Features

- Create polls using `/botohan` command
- Support for multiple choice and agree-disagree questions
- Privacy options (Anonymous/Non-anonymous/Confidential)
- Optional poll duration timer
- Real-time voting results
- Post-poll analytics for hosts

## Setup

1. **Create a Slack App**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" and choose "From scratch"
   - Name your app "Botohan" and select your workspace

2. **Configure App Settings**
   - Under "Basic Information", note down your "Signing Secret"
   - Under "OAuth & Permissions":
     - Add the following bot token scopes:
       - `commands`
       - `chat:write`
       - `chat:write.public`
       - `views:write`
   - Install the app to your workspace and note down the "Bot User OAuth Token"

3. **Set up Slash Command**
   - Go to "Slash Commands" and create a new command
   - Command: `/botohan`
   - Request URL: `https://your-app-url/slack/events`
   - Description: "Create a new poll"
   - Usage hint: "Create a new poll"

4. **Enable Interactivity**
   - Go to "Interactivity & Shortcuts"
   - Turn on Interactivity
   - Set Request URL to: `https://your-app-url/slack/events`

5. **Local Development**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd botohan

   # Install dependencies
   npm install

   # Create .env file
   cp .env.example .env
   # Edit .env with your Slack credentials
   ```

6. **Environment Variables**
   Create a `.env` file with:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   PORT=3000
   ```

7. **Run the App**
   ```bash
   npm start
   ```

## Usage

1. Type `/botohan` in any Slack channel
2. Fill in the poll creation form:
   - Question
   - Poll type (Multiple Choice/Agree-Disagree)
   - Options (for Multiple Choice)
   - Privacy setting
   - Optional duration timer

3. Submit to create the poll
4. Members can vote by clicking the buttons
5. Results update in real-time (unless confidential)
6. When the timer expires (if set), final results are posted

## Development

The app structure is organized as follows:
```
.
├── src/
│   ├── modals/
│   │   └── pollModal.js    # Modal view builders
│   └── handlers/
│       └── pollHandler.js   # Command and interaction handlers
├── index.js                 # Main application entry
├── package.json            
└── .env                     # Environment variables
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 