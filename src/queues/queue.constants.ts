export const QUEUE_NAMES = {
  CAMPAIGN_MESSAGES: 'campaign-messages',
  INCOMING_MESSAGES: 'incoming-messages',
  OUTBOUND_MESSAGES: 'outbound-messages',
  MESSAGE_STATUS: 'message-status',
} as const;

export const JOB_NAMES = {
  SEND_TEMPLATE_MESSAGE: 'send-template-message',
  PROCESS_INCOMING_MESSAGE: 'process-incoming-message',
  SEND_TEXT_MESSAGE: 'send-text-message',
  UPDATE_MESSAGE_STATUS: 'update-message-status',
} as const;
