import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { BLOOD_GROUPS, ROLES, COOLDOWN_DAYS } from '../utils/constants.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ },
  mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true, index: true },
  city: { type: String, required: true, trim: true, lowercase: true },
  address: String,
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], default: [0, 0] } },
  // Donor fields
  bloodGroup: { type: String, enum: BLOOD_GROUPS },
  dob: Date,
  healthEligible: { type: Boolean, default: false },
  availability: { type: String, enum: ['Active', 'Inactive', 'Cool-down'], default: 'Active' },
  lastDonationAt: Date,
  // Facility fields (hospital / organization)
  licenseNo: String,
  isVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, city: 1, bloodGroup: 1, availability: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.compare = function (pw) { return bcrypt.compare(pw, this.password); };

// Auto-expire 90-day cool-down on read
userSchema.methods.refreshCooldown = function () {
  if (this.availability === 'Cool-down' && this.lastDonationAt &&
      Date.now() - this.lastDonationAt.getTime() > COOLDOWN_DAYS * 864e5) this.availability = 'Active';
  return this;
};
userSchema.set('toJSON', { transform: (_, r) => { delete r.password; delete r.tokenVersion; return r; } });
export default mongoose.model('User', userSchema);
