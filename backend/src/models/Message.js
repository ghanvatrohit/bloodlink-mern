import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 2000, trim: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  flagged: { type: Boolean, default: false },
  flagReason: String,
  deleted: { type: Boolean, default: false },
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ flagged: 1, createdAt: -1 });
messageSchema.index({ text: 'text' });
export default mongoose.model('Message', messageSchema);
