/**
 * Handles the submission of the poll creation modal
 */
const handleModalSubmission = async ({ ack, body, view, logger }) => {
  try {
    // 1. Extract values from the view state
    const values = view.state.values;
    logger.info('Extracting values from view state', {
      user: body.user.id,
      view_id: view.id
    });
    
    // Extract channel
    const channelId = values.channel_block?.channel_select?.selected_channel;
    
    // Extract question
    const question = values.question_block?.question_input?.value;
    
    // Extract poll type
    const pollType = values.poll_type_block?.poll_type_select?.selected_option?.value;
    
    // Extract and process options
    const rawOptions = values.options_block?.options_input?.value;
    const options = rawOptions ? rawOptions.split('\n').filter(line => line.trim().length > 0) : [];
    
    // Extract privacy setting
    const privacy = values.privacy_block?.privacy_select?.selected_option?.value;
    
    // Extract and process duration
    const rawDuration = values.duration_block?.duration_input?.value;
    const duration = rawDuration ? parseInt(rawDuration, 10) : null;

    // 2. Log extracted values
    logger.info('Values extracted from modal', {
      user: body.user.id,
      channel: channelId,
      metadata: {
        question: question ? 'provided' : 'missing',
        pollType: pollType || 'missing',
        optionsCount: options.length,
        privacy: privacy || 'missing',
        duration: duration || 'not set'
      }
    });

    // 3. Validate inputs
    logger.info('Starting input validation', {
      user: body.user.id
    });

    const validationErrors = validateInputs({
      channelId,
      question,
      pollType,
      options,
      privacy,
      duration
    });

    if (validationErrors) {
      logger.warn('Validation failed for poll submission', {
        user: body.user.id,
        errors: validationErrors
      });

      // Return validation errors to the modal
      await ack({
        response_action: 'errors',
        errors: validationErrors
      });
      return null;
    }

    logger.info('Validation passed successfully', {
      user: body.user.id
    });

    // 4. Acknowledge successful submission
    await ack();

    // 5. Return processed data
    return {
      channelId,
      question,
      pollType,
      options,
      privacy,
      duration,
      creator: body.user.id,
      created: new Date()
    };

  } catch (error) {
    logger.error('Error processing modal submission:', {
      error: error.message,
      error_stack: error.stack,
      user: body.user.id,
      view_id: view.id
    });

    // Acknowledge with a generic error message
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
    
    return null;
  }
};

/**
 * Validates the poll creation inputs
 */
const validateInputs = ({ channelId, question, pollType, options, privacy, duration }) => {
  const errors = {};

  // Validate channel
  if (!channelId) {
    errors.channel_block = 'Please select a channel to post the poll';
  }

  // Validate question
  if (!question || question.trim().length < 5) {
    errors.question_block = 'Question must be at least 5 characters long';
  }

  // Validate poll type
  if (!pollType) {
    errors.poll_type_block = 'Please select a poll type';
  }

  // Validate privacy setting
  if (!privacy) {
    errors.privacy_block = 'Please select a privacy setting';
  }

  // Validate poll type and options
  if (pollType === 'multiple_choice') {
    if (!options || options.length < 2) {
      errors.options_block = 'Multiple choice polls require at least 2 options';
    } else if (options.length > 10) {
      errors.options_block = 'Maximum 10 options allowed';
    }
  }

  // Validate duration if provided
  if (duration !== null) {
    if (isNaN(duration) || duration < 1) {
      errors.duration_block = 'Duration must be a positive number';
    } else if (duration > 10080) { // 1 week in minutes
      errors.duration_block = 'Duration cannot exceed 1 week (10080 minutes)';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

module.exports = {
  handleModalSubmission,
  validateInputs
}; 