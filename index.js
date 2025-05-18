require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const path = require('path');
const { handlePollCommand, handlePollSubmission, handleVote, handleMessage } = require('./src/handlers/pollHandler');
const { handleModalSubmission } = require('./src/handlers/modalHandler');

// Initialize Express receiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

// Initialize your Bolt app with the receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// Get the Express app instance
const expressApp = receiver.app;
const PORT = process.env.PORT || 3001;

// Add a simple health check endpoint
expressApp.get('/health', (req, res) => {
  res.send({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Register the command handler
app.command('/botohan', async ({ command, ack, client, logger }) => {
  try {
    await handlePollCommand({ command, ack, client, logger });
  } catch (error) {
    logger.error('Error in command handler:', error);
    // Ensure we acknowledge even if there's an error
    try {
      await ack();
    } catch (ackError) {
      // Ignore if already acknowledged
    }
  }
});

// Handle modal submission
app.view('poll_creation_modal', async ({ ack, body, view, client, logger }) => {
  logger.info('Starting modal submission processing', {
    view_id: view.id,
    user: body.user.id,
    type: view.type,
    callback_id: view.callback_id
  });

  try {
    logger.info('Validating modal submission data', {
      view_state: view.state.values,
      user: body.user.id
    });

    // Process the modal submission
    const pollData = await handleModalSubmission({ ack, body, view, logger });
    
    // If validation passed and we have poll data
    if (pollData) {
      logger.info('Poll data validated successfully', {
        user: body.user.id,
        channel: pollData.channelId,
        question: pollData.question,
        pollType: pollData.pollType
      });

      // Create the poll
      await handlePollSubmission({ 
        ack: () => {}, // Already acknowledged in modal handler
        body, 
        view, 
        client,
        logger,
        pollData
      });
      logger.info('Poll created and posted successfully', {
        user: body.user.id,
        channel: pollData.channelId
      });
    } else {
      logger.warn('Poll data validation failed', {
        user: body.user.id,
        view_id: view.id
      });
    }
  } catch (error) {
    logger.error('Error in modal submission workflow:', {
      error: error.message,
      error_stack: error.stack,
      user: body.user.id,
      view_id: view.id
    });
    
    // Try to acknowledge with error if not already done
    try {
      await ack({
        response_action: 'errors',
        errors: {
          question_block: 'An unexpected error occurred. Please try again.'
        }
      });
    } catch (ackError) {
      logger.error('Error sending acknowledgment:', {
        error: ackError.message,
        original_error: error.message,
        user: body.user.id
      });
    }
  }
});

// Handle vote button clicks
app.action(/^vote_\d+$/, handleVote);

// Handle poll end triggers
app.message(/^POLL_END_TRIGGER:/, handleMessage);

// Start the app
(async () => {
  try {
    await app.start(PORT);
    console.log(`⚡️ Slack Bolt app is running on port ${PORT}!`);
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();
