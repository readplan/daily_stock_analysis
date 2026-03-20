import mongoose from 'mongoose';

/**
 * ===================================
 * 用户账户模型 (Mongoose)
 * ===================================
 */

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // 存储 Bcrypt 哈希
  sessionToken: { type: String, index: true },
  sessionExpires: { type: Date },
  telegramId: { type: String, unique: true, sparse: true }, // sparse 允许为空但不冲突
  role: { type: String, default: 'admin' },
  created_at: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model('User', UserSchema);
