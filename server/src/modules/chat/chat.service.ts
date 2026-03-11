import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

export type ChatChannel = 'DAY' | 'WEREWOLF' | 'DEAD' | 'MEDIUM_DEAD';

export interface ChatMessage {
  id: string;
  channel: ChatChannel;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

@Injectable()
export class ChatService {
  createMessage(
    channel: ChatChannel,
    senderId: string,
    senderName: string,
    content: string,
  ): ChatMessage {
    return {
      id: uuid(),
      channel,
      senderId,
      senderName,
      content: content.slice(0, 500),
      timestamp: Date.now(),
    };
  }

  createSystemMessage(channel: ChatChannel, content: string): ChatMessage {
    return {
      id: uuid(),
      channel,
      senderId: 'system',
      senderName: 'System',
      content,
      timestamp: Date.now(),
      isSystem: true,
    };
  }
}
