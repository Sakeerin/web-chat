// Application constants

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  SYSTEM: 'system',
} as const

export const CONVERSATION_TYPES = {
  DM: 'dm',
  GROUP: 'group',
  CHANNEL: 'channel',
} as const

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_GROUP_MEMBERS = 500