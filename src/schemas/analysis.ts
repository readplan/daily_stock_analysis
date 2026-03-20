import mongoose from 'mongoose';

/**
 * ===================================
 * 股票分析结果数据库模型 (Mongoose)
 * ===================================
 */

const AnalysisSchema = new mongoose.Schema({
  code: { type: String, required: true, index: true },
  name: { type: String },
  date: { type: String, default: () => new Date().toISOString().split('T')[0], index: true },
  sentiment_score: { type: Number },
  trend_prediction: { type: String },
  operation_advice: { type: String },
  decision_type: { type: String, enum: ['buy', 'hold', 'sell'] },
  dashboard: { type: mongoose.Schema.Types.Mixed }, // 存储完整的仪表盘 JSON
  analysis_summary: { type: String },
  risk_warning: { type: String },
  buy_reason: { type: String },
  model_used: { type: String },
  success: { type: Boolean, default: true },
  thinking_process: { type: String },
  created_at: { type: Date, default: Date.now }
});

// 复合索引：确保同一只股票每天只有一个主记录
AnalysisSchema.index({ code: 1, date: 1 }, { unique: true });

export const AnalysisModel = mongoose.model('Analysis', AnalysisSchema);
