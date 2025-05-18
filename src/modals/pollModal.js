const buildPollModal = (triggerId, command = {}) => {
  if (!triggerId) {
    throw new Error('trigger_id is required to open a modal');
  }

  return {
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'poll_creation_modal',
      title: {
        type: 'plain_text',
        text: 'Create a Poll'
      },
      submit: {
        type: 'plain_text',
        text: 'Create Poll'
      },
      close: {
        type: 'plain_text',
        text: 'Cancel'
      },
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📊 New Poll'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Create an engaging poll to gather feedback from your team. Required fields are marked with *'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'input',
          block_id: 'channel_block',
          element: {
            type: 'channels_select',
            action_id: 'channel_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select a channel'
            },
            initial_channel: command.channel_id || undefined
          },
          label: {
            type: 'plain_text',
            text: 'Post in Channel *'
          }
        },
        {
          type: 'input',
          block_id: 'question_block',
          element: {
            type: 'plain_text_input',
            action_id: 'question_input',
            placeholder: {
              type: 'plain_text',
              text: 'e.g., "Where should we have our team lunch?" or "Which project should we prioritize?"'
            },
            min_length: 5,
            max_length: 150
          },
          label: {
            type: 'plain_text',
            text: 'Question *'
          },
          hint: {
            type: 'plain_text',
            text: 'Make your question clear and specific (5-150 characters)'
          }
        },
        {
          type: 'input',
          block_id: 'poll_type_block',
          element: {
            type: 'static_select',
            action_id: 'poll_type_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select poll type'
            },
            initial_option: {
              text: {
                type: 'plain_text',
                text: '📝 Multiple Choice'
              },
              value: 'multiple_choice'
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: '📝 Multiple Choice'
                },
                value: 'multiple_choice'
              }
            ]
          },
          label: {
            type: 'plain_text',
            text: 'Poll Type *'
          },
          hint: {
            type: 'plain_text',
            text: 'Choose how people will respond to your poll'
          }
        },
        {
          type: 'input',
          block_id: 'options_block',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'options_input',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'Sushi House 🍣\nPizza Place 🍕\nTaco Shop 🌮'
            }
          },
          label: {
            type: 'plain_text',
            text: 'Options'
          },
          hint: {
            type: 'plain_text',
            text: 'Enter each option on a new line. Add emojis to make options more engaging! (Required for Multiple Choice)'
          }
        },
        {
          type: 'input',
          block_id: 'privacy_block',
          element: {
            type: 'static_select',
            action_id: 'privacy_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select privacy setting'
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: '👥 Non-anonymous (votes are visible)'
                },
                value: 'non_anonymous'
              },
              {
                text: {
                  type: 'plain_text',
                  text: '🕶️ Anonymous (names hidden)'
                },
                value: 'anonymous'
              },
              {
                text: {
                  type: 'plain_text',
                  text: '🔒 Confidential (results shown at end)'
                },
                value: 'confidential'
              }
            ]
          },
          label: {
            type: 'plain_text',
            text: 'Privacy Setting *'
          },
          hint: {
            type: 'plain_text',
            text: 'Choose how votes will be displayed to participants'
          }
        },
        {
          type: 'input',
          block_id: 'duration_unit_block',
          optional: true,
          element: {
            type: 'static_select',
            action_id: 'duration_unit_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select time unit'
            },
            initial_option: {
              text: {
                type: 'plain_text',
                text: '⏰ Hours'
              },
              value: 'hours'
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: '⌛ Seconds'
                },
                value: 'seconds'
              },
              {
                text: {
                  type: 'plain_text',
                  text: '⏱️ Minutes'
                },
                value: 'minutes'
              },
              {
                text: {
                  type: 'plain_text',
                  text: '⏰ Hours'
                },
                value: 'hours'
              }
            ]
          },
          label: {
            type: 'plain_text',
            text: 'Time Unit'
          }
        },
        {
          type: 'input',
          block_id: 'duration_block',
          optional: true,
          element: {
            type: 'number_input',
            action_id: 'duration_input',
            is_decimal_allowed: false,
            min_value: '1',
            placeholder: {
              type: 'plain_text',
              text: 'Enter duration'
            }
          },
          label: {
            type: 'plain_text',
            text: 'Duration'
          },
          hint: {
            type: 'plain_text',
            text: 'Optional: Set a timer to automatically close the poll'
          }
        }
      ]
    }
  };
};

module.exports = {
  buildPollModal
}; 