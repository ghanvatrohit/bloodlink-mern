import Donation from '../models/Donation.js';
import User from '../models/User.js';
import { ah, AppError } from '../utils/AppError.js';
import { addStock, withTxn } from '../utils/stock.js';
import { audit } from '../utils/audit.js';
import { getIO } from '../socket/index.js';
import { COOLDOWN_DAYS } from '../utils/constants.js';

// Donor schedules donation at hospital/org only
export const schedule = ah(async (req, res) => {
  const d = req.user.refreshCooldown();
  if (d.availability === 'Cool-down') throw new AppError('Cool-down period active', 409);
  if (!d.healthEligible) throw new AppError('Mark yourself health-eligible first', 409);
  if (!(await User.exists({ _id: req.body.facilityId, role: { $in: ['hospital', 'organization'] } }))) throw new AppError('Facility not found', 404);
  const don = await Donation.create({ donor: d._id, facility: req.body.facilityId, bloodGroup: d.bloodGroup, scheduledAt: req.body.scheduledAt, driveName: req.body.driveName });
  getIO()?.to(`user:${req.body.facilityId}`).emit('donation:new', don);
  res.status(201).json(don);
});

// Facility registers a walk-in donor by email
export const walkIn = ah(async (req, res) => {
  const donor = await User.findOne({ email: req.body.donorEmail, role: 'donor' });
  if (!donor) throw new AppError('Donor not found', 404);
  const don = await Donation.create({ donor: donor._id, facility: req.user._id, bloodGroup: donor.bloodGroup, scheduledAt: new Date(), driveName: req.body.driveName });
  req.params.id = don._id; req.body.decision = 'Accepted';
  return decide(req, res);
});

export const listDonations = ah(async (req, res) => {
  const q = req.user.role === 'donor' ? { donor: req.user._id } : { facility: req.user._id };
  res.json(await Donation.find(q).sort({ createdAt: -1 }).populate('donor facility', 'name bloodGroup city role'));
});

// Accept donation: add batch, start 90-day cool-down, issue certificate
export const decide = ah(async (req, res) => {
  const { decision } = req.body;
  if (!['Accepted', 'Rejected'].includes(decision)) throw new AppError('Invalid decision');
  const don = await withTxn(async (s) => {
    const d = await Donation.findOne({ _id: req.params.id, facility: req.user._id, status: 'Scheduled' }).session(s);
    if (!d) throw new AppError('Donation not found', 404);
    d.status = decision;
    if (decision === 'Accepted') {
      d.batchNo = `DN-${Date.now().toString(36).toUpperCase()}`;
      d.certificateId = `CERT-${d._id.toString().slice(-8).toUpperCase()}`;
      await addStock(req.user._id, d.bloodGroup, { batchNo: d.batchNo, units: d.units, expiresAt: new Date(Date.now() + 42 * 864e5), sourceDonor: d.donor }, s);
      await User.updateOne({ _id: d.donor }, { availability: 'Cool-down', lastDonationAt: new Date() }, { session: s });
      await audit({ action: 'DONATION', actor: req.user._id, entity: 'Donation', entityId: d._id, meta: { donor: d.donor, bloodGroup: d.bloodGroup, units: d.units, batchNo: d.batchNo, cooldownDays: COOLDOWN_DAYS }, ip: req.ip }, s);
    }
    await d.save({ session: s });
    return d;
  });
  getIO()?.to(`user:${don.donor}`).emit('donation:updated', don);
  res.json(don);
});

export const certificate = ah(async (req, res) => {
  const d = await Donation.findOne({ _id: req.params.id, donor: req.user._id, status: 'Accepted' }).populate('facility donor', 'name city bloodGroup');
  if (!d) throw new AppError('Certificate not available', 404);
  res.json({ certificateId: d.certificateId, donor: d.donor.name, bloodGroup: d.bloodGroup, units: d.units, facility: d.facility.name, city: d.facility.city, date: d.updatedAt });
});
