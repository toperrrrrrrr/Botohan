const { buildPollModal } = require('../modals/pollModal');

// Store polls in memory for MVP (replace with database later)
const polls = new Map();

const handlePollCommand = async ({ command, ack, client, logger }) => {
  logger.info('Received /botohan command', {
    user: command.user_id,
    channel: command.channel_id,
    text: command.text,
    command: command
  });

  try {
    // 1. Acknowledge the command immediately
    await ack();
    logger.info('Command acknowledged');

    // 2. Check if we have the necessary token
    if (!client.token) {
      logger.error('Bot token is missing');
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "Configuration error: Bot token is missing. Please contact the administrator."
      });
      return;
    }

    // 3. Check if we have permission to post in the channel
    try {
      await client.conversations.info({
        channel: command.channel_id
      });
    } catch (error) {
      logger.error('Channel access error:', {
        error: error.message,
        channel: command.channel_id
      });
      
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "I don't have permission to post in this channel. Please add me to the channel or try in a different one."
      });
      return;
    }

    // 4. Open the modal
    logger.info('Opening modal', {
      trigger_id: command.trigger_id
    });

    const result = await client.views.open(buildPollModal(command.trigger_id));
    
    logger.info('Modal opened successfully', {
      user: command.user_id,
      channel: command.channel_id,
      view_id: result.view.id
    });

  } catch (error) {
    logger.error('Error handling /botohan command:', {
      error: error.message,
      error_stack: error.stack,
      user: command.user_id,
      channel: command.channel_id,
      code: error.code,
      data: error.data
    });
    
    // Notify user of error
    try {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "Sorry! Something went wrong while creating the poll. Please try again or contact the administrator if the problem persists."
      });
    } catch (msgError) {
      logger.error('Error sending error message to user:', {
        error: msgError.message,
        user: command.user_id,
        channel: command.channel_id
      });
    }
  }
};

// Add this helper function for setting up countdown timer
const setupCountdownTimer = async (client, poll, messageTs, logger) => {
  if (!poll.endTime || poll.updateInterval) return;

  const updateInterval = setInterval(async () => {
    const currentPoll = polls.get(poll.id);
    if (!currentPoll || shouldPollEnd(currentPoll)) {
      clearInterval(updateInterval);
      if (currentPoll) {
        try {
          await endPoll(client, currentPoll, messageTs, logger);
        } catch (error) {
          logger.error('Error ending poll in timer:', {
            error: error.message,
            pollId: currentPoll.id
          });
        }
      }
      return;
    }

    const updatedBlocksWithCountdown = [
      ...createPollBlocks(currentPoll)
    ];
    if (currentPoll.privacy !== 'confidential') {
      updatedBlocksWithCountdown.push(...createResultsBlock(currentPoll));
    }

    try {
      await client.chat.update({
        channel: currentPoll.channel,
        ts: messageTs,
        blocks: updatedBlocksWithCountdown,
        text: currentPoll.question
      });
    } catch (updateError) {
      logger.error('Error updating countdown:', {
        error: updateError.message,
        pollId: currentPoll.id
      });
      clearInterval(updateInterval);
    }
  }, 1000);

  poll.updateInterval = updateInterval;

  // Set a backup timeout to ensure poll ends
  const timeoutMs = poll.endTime.getTime() - Date.now();
  setTimeout(async () => {
    const currentPoll = polls.get(poll.id);
    if (currentPoll && !shouldPollEnd(currentPoll)) {
      try {
        await endPoll(client, currentPoll, messageTs, logger);
      } catch (error) {
        logger.error('Error ending poll in backup timeout:', {
          error: error.message,
          pollId: currentPoll.id
        });
      }
    }
  }, timeoutMs + 1000); // Add 1 second buffer
};

const handlePollSubmission = async ({ ack, body, view, client, logger, pollData }) => {
  try {
    // If ack function is provided (not already acknowledged), use it
    if (typeof ack === 'function') {
      await ack();
    }

    const { channelId, question, pollType, options, privacy, duration, creator } = pollData;

    // Check if the bot has permission to post in the channel
    try {
      await client.conversations.info({
        channel: channelId
      });
    } catch (error) {
      logger.error('Channel access error:', {
        error: error.message,
        channel: channelId
      });
      
      await client.chat.postEphemeral({
        channel: channelId,
        user: creator,
        text: "Sorry! I don't have permission to post in this channel. Please add me to the channel or choose a different one."
      });
      return;
    }

    // Calculate end time in milliseconds if duration is provided
    const endTime = duration ? new Date(Date.now() + (duration * 60 * 60 * 1000)) : null;
    
    // Create poll object
    const pollId = Date.now().toString();
    const poll = {
      id: pollId,
      creator,
      question,
      pollType,
      options: options,
      privacy,
      duration,
      votes: new Map(),
      created: new Date(),
      channel: channelId,
      endTime
    };

    // Store poll
    polls.set(pollId, poll);

    // Create poll message blocks
    const pollBlocks = createPollBlocks(poll);

    try {
      // Post poll to channel
      const result = await client.chat.postMessage({
        channel: channelId,
        text: question,
        blocks: pollBlocks
      });

      // Store message timestamp for updates
      poll.messageTs = result.ts;

      logger.info('Poll created successfully', {
        pollId,
        creator,
        channel: channelId,
        messageTs: result.ts,
        endTime: poll.endTime,
        duration: duration
      });

      // Set up countdown timer immediately after poll is created
      if (endTime) {
        await setupCountdownTimer(client, poll, result.ts, logger);
        
        logger.info('Countdown timer initialized', {
          pollId,
          endTime: endTime
        });
      }

    } catch (error) {
      logger.error('Error posting poll:', {
        error: error.message,
        pollId,
        channel: channelId
      });
      
      // Clean up stored poll if posting failed
      polls.delete(pollId);
      
      await client.chat.postEphemeral({
        channel: channelId,
        user: creator,
        text: "Sorry! Something went wrong while creating your poll. Please try again."
      });
    }

  } catch (error) {
    logger.error('Error in poll submission handler:', {
      error: error.message,
      user: body.user.id
    });
  }
};

// Add this helper function to format countdown time
const formatCountdown = (endTime) => {
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end - now;
  
  if (diffMs <= 0) {
    return '⏰ Poll has ended';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return `⏰ ${parts.join(' ')} remaining`;
};

const createPollBlocks = (poll) => {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: poll.question
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📊 Created by <@${poll.creator}> | ${getPrivacyEmoji(poll.privacy)} ${formatPrivacyText(poll.privacy)}${poll.endTime ? ` | ${formatCountdown(poll.endTime)}` : ''}`
        }
      ]
    },
    {
      type: 'divider'
    }
  ];

  // Add options as buttons with better formatting
  poll.options.forEach((option, index) => {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${getOptionEmoji(index)} ${option}`
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '🗳️ Vote',
          emoji: true
        },
        value: `${poll.id}:${index}`,
        action_id: `vote_${index}`,
        style: 'primary'
      }
    });
  });

  return blocks;
};

const createResultsBlock = (poll) => {
  const totalVotes = poll.votes.size;
  const voteCounts = new Map();
  const votersByOption = new Map();
  
  // Initialize vote counts and voter lists
  poll.options.forEach((_, index) => {
    voteCounts.set(index, 0);
    votersByOption.set(index, []);
  });
  
  // Count votes and collect voters
  poll.votes.forEach((optionIndex, userId) => {
    voteCounts.set(optionIndex, (voteCounts.get(optionIndex) || 0) + 1);
    votersByOption.get(optionIndex).push(userId);
  });

  // Create results text with progress bars and voter info
  const resultsText = poll.options.map((option, index) => {
    const count = voteCounts.get(index) || 0;
    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const progressBar = createProgressBar(percentage);
    const voters = votersByOption.get(index);
    
    let optionText = `${getOptionEmoji(index)} *${option}*\n${progressBar} ${count} vote${count !== 1 ? 's' : ''} (${percentage}%)`;
    
    // Add voters if non-anonymous
    if (poll.privacy === 'non_anonymous' && voters.length > 0) {
      optionText += `\n👥 Voters: ${voters.map(v => `<@${v}>`).join(', ')}`;
    }
    
    return optionText;
  }).join('\n\n');

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📊 Results*\nTotal votes: ${totalVotes}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: resultsText
      }
    }
  ];
};

// Helper function to create a visual progress bar
const createProgressBar = (percentage) => {
  const fullBlocks = Math.floor(percentage / 10);
  const emptyBlocks = 10 - fullBlocks;
  return '█'.repeat(fullBlocks) + '░'.repeat(emptyBlocks);
};

// Helper function to get emoji for privacy settings
const getPrivacyEmoji = (privacy) => {
  switch (privacy) {
    case 'non_anonymous':
      return '👥';
    case 'anonymous':
      return '🕶️';
    case 'confidential':
      return '🔒';
    default:
      return '📊';
  }
};

// Helper function to format privacy text
const formatPrivacyText = (privacy) => {
  switch (privacy) {
    case 'non_anonymous':
      return 'Public voting';
    case 'anonymous':
      return 'Anonymous voting';
    case 'confidential':
      return 'Results at end';
    default:
      return privacy;
  }
};

// Helper function to get emoji for options
const getOptionEmoji = (index) => {
  const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  return optionEmojis[index] || '•';
};

// Add a function to check if a poll should be ended
const shouldPollEnd = (poll) => {
  if (!poll.endTime) return false;
  const now = new Date();
  const endTime = new Date(poll.endTime);
  return now >= endTime;
};

// Update handleVote to use the setupCountdownTimer function
const handleVote = async ({ ack, body, client, logger }) => {
  try {
    await ack();

    const [pollId, optionIndex] = body.actions[0].value.split(':');
    const poll = polls.get(pollId);

    if (!poll) {
      logger.error('Poll not found:', { pollId });
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: "Sorry! This poll no longer exists."
      });
      return;
    }

    // Check if poll should end
    if (shouldPollEnd(poll)) {
      logger.info('Poll has ended, sending final results', { pollId });
      await endPoll(client, poll, body.message.ts, logger);
      await client.chat.postEphemeral({
        channel: poll.channel,
        user: body.user.id,
        text: "This poll has ended and can no longer accept votes."
      });
      return;
    }

    const userId = body.user.id;
    
    // Record the vote
    poll.votes.set(userId, parseInt(optionIndex));
    logger.info('Vote recorded', {
      pollId,
      user: userId,
      option: optionIndex,
      total_votes: poll.votes.size
    });

    // Update poll message with current results
    const updatedBlocks = [
      ...createPollBlocks(poll)
    ];

    // Add results block if not confidential
    if (poll.privacy !== 'confidential') {
      updatedBlocks.push(...createResultsBlock(poll));
    }

    try {
      await client.chat.update({
        channel: poll.channel,
        ts: body.message.ts,
        blocks: updatedBlocks,
        text: poll.question
      });

      // Ensure countdown timer is running
      if (poll.endTime && !poll.updateInterval) {
        await setupCountdownTimer(client, poll, body.message.ts, logger);
      }

    } catch (error) {
      logger.error('Error updating poll message:', {
        error: error.message,
        pollId,
        user: userId
      });
      
      await client.chat.postEphemeral({
        channel: poll.channel,
        user: userId,
        text: "Sorry! Something went wrong while recording your vote. Please try again."
      });
    }
  } catch (error) {
    logger.error('Error handling vote:', {
      error: error.message,
      user: body.user.id
    });
  }
};

// Update endPoll to include logger parameter
const endPoll = async (client, poll, messageTs = null, logger) => {
  // Clear the countdown update interval if it exists
  if (poll.updateInterval) {
    clearInterval(poll.updateInterval);
    poll.updateInterval = null;
  }

  const finalBlocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🏁 Poll Ended: ' + poll.question
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Created by <@${poll.creator}> | ${getPrivacyEmoji(poll.privacy)} ${formatPrivacyText(poll.privacy)} | Final Results`
        }
      ]
    },
    {
      type: 'divider'
    },
    ...createResultsBlock(poll)
  ];

  try {
    if (messageTs) {
      await client.chat.update({
        channel: poll.channel,
        ts: messageTs,
        blocks: finalBlocks,
        text: '🏁 Poll Ended: ' + poll.question
      });
    } else {
      await client.chat.postMessage({
        channel: poll.channel,
        blocks: finalBlocks,
        text: '🏁 Poll Ended: ' + poll.question
      });
    }

    // Clean up the poll from memory
    polls.delete(poll.id);
    
    logger.info('Poll ended successfully', {
      pollId: poll.id,
      channel: poll.channel,
      total_votes: poll.votes.size
    });

    return true;
  } catch (error) {
    logger.error('Error ending poll:', {
      error: error.message,
      pollId: poll.id
    });
    return false;
  }
};

// Add this helper function at the bottom with other helper functions
const formatDuration = (durationInHours) => {
  if (durationInHours >= 1) {
    return `${Math.round(durationInHours)} hour${durationInHours === 1 ? '' : 's'}`;
  } else if (durationInHours >= 1/60) {
    const minutes = Math.round(durationInHours * 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  } else {
    const seconds = Math.round(durationInHours * 3600);
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
};

module.exports = {
  handlePollCommand,
  handlePollSubmission,
  handleVote
}; 