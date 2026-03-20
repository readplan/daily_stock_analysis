import mongoose from 'mongoose';
import { Message } from './types.js';

/**
 * ===================================
 * Agent 记忆持久化模型 (Mongoose)
 * ===================================
 */

const MemorySchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'] },
    content: String,
    name: String,
    timestamp: { type: Date, default: Date.now }
  }],
  metadata: mongoose.Schema.Types.Mixed,
  updated_at: { type: Date, default: Date.now }
});

const MemoryModel = mongoose.model('AgentMemory', MemorySchema);

export class AgentMemory {
  /**
   * 获取会话记忆
   */
  async getHistory(sessionId: string): Promise<Message[]> {
    const doc = await MemoryModel.findOne({ sessionId });
    return doc ? (doc.messages as any) : [];
  }

  /**
   * 追加消息到记忆
   */
  async appendMessage(sessionId: string, message: Message) {
    await MemoryModel.findOneAndUpdate(
      { sessionId },
      { 
        $push: { messages: { ...message, timestamp: new Date() } },
        $set: { updated_at: new Date() }
      },
      { upsert: true, new: true }
    );
  }

  /**
   * 清除记忆
   */
  async clear(sessionId: string) {
    await MemoryModel.deleteOne({ sessionId });
  }
}

export const agentMemory = new AgentMemory();
