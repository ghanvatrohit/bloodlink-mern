import User from '../models/User.js';
import { ah, AppError } from '../utils/AppError.js';

// List hospitals/orgs (optionally by city) for request targets
export const listFacilities = ah(async (req, res) => {
  const { role = 'hospital', city } = req.query;
  if (!['hospital', 'organization'].includes(role)) throw new AppError('Invalid role');
  const q = { role, isBlocked: false, ...(city && { city: city.toLowerCase() }) };
  res.json(await User.find(q).select('name city address mobile isVerified role').limit(200));
});

export const setAvailability = ah(async (req, res) => {
  const { availability } = req.body;
  if (!['Active', 'Inactive'].includes(availability)) throw new AppError('Invalid availability');
  const u = req.user.refreshCooldown();
  if (u.availability === 'Cool-down') throw new AppError('You are in a 90-day cool-down period', 409);
  u.availability = availability;
  await u.save();
  res.json({ user: u });
});

export const updateProfile = ah(async (req, res) => {
  const allowed = ['name', 'mobile', 'city', 'address', 'healthEligible'];
  allowed.forEach((k) => req.body[k] !== undefined && (req.user[k] = req.body[k]));
  await req.user.save();
  res.json({ user: req.user });
});

// Find nearby eligible donors for a group
export const searchDonors = ah(async (req, res) => {
  const { city, bloodGroup } = req.query;
  res.json(await User.find({ role: 'donor', availability: 'Active', healthEligible: true, ...(city && { city: city.toLowerCase() }), ...(bloodGroup && { bloodGroup }) })
    .select('name city bloodGroup availability').limit(100));
});
