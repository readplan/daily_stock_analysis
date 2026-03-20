import mongoose from 'mongoose';

/**
 * ===================================
 * 投资组合/自选股模型 (Mongoose)
 * ===================================
 */

// 交易记录
const TradeSchema = new mongoose.Schema({
  symbol: { type: String, required: true, index: true },
  side: { type: String, enum: ['buy', 'sell'], required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  fee: { type: Number, default: 0 },
  note: { type: String }
});

// 持仓概览
const PositionSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  avg_cost: { type: Number, required: true },
  quantity: { type: Number, required: true },
  last_price: { type: Number },
  updated_at: { type: Date, default: Date.now }
});

// 账户信息
const AccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  is_active: { type: Boolean, default: true }
});

export const TradeModel = mongoose.model('Trade', TradeSchema);
export const PositionModel = mongoose.model('Position', PositionSchema);
export const AccountModel = mongoose.model('Account', AccountSchema);
