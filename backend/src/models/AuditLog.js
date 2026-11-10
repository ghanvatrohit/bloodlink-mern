import mongoose from 'mongoose';
const auditSchema = new mongoose.Schema({
  action: { type: String, required: true, enum: ['ALLOT', 'DONATION', 'INVENTORY_ADJUST', 'TRANSFER', 'REQUEST_STATUS', 'USER_ADMIN', 'MESSAGE_DELETE'] },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entity: { type: String, required: true },
  entityId: mongoose.Schema.Types.ObjectId,
  meta: mongoose.Schema.Types.Mixed,
  ip: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
auditSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditSchema.index({ actor: 1, createdAt: -1 });
// Immutable: block updates & deletes
const block = function (next) { next(new Error('Audit logs are immutable')); };
['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'replaceOne'].forEach((h) => auditSchema.pre(h, block));
export default mongoose.model('AuditLog', auditSchema);
