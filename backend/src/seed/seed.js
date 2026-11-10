import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import BloodInventory from '../models/BloodInventory.js';
import { BLOOD_GROUPS } from '../utils/constants.js';

await connectDB();
await Promise.all([User.deleteMany({}), BloodInventory.deleteMany({})]);
const pw = 'Passw0rd!';
const base = { password: pw, city: 'pune', mobile: '9876543210' };
const [admin, hosp, org] = await User.create([
  { ...base, name: 'Super Admin', email: 'admin@bloodbank.io', role: 'admin' },
  { ...base, name: 'City Care Hospital', email: 'hospital@bloodbank.io', role: 'hospital', licenseNo: 'HSP-1001', isVerified: true },
  { ...base, name: 'LifeLine Blood Bank', email: 'org@bloodbank.io', role: 'organization', licenseNo: 'ORG-2001', isVerified: true },
  { ...base, name: 'Ravi Donor', email: 'donor@bloodbank.io', role: 'donor', bloodGroup: 'O+', dob: new Date('1995-04-10'), healthEligible: true },
  { ...base, name: 'Priya Patient', email: 'patient@bloodbank.io', role: 'patient' },
]);
const exp = (d) => new Date(Date.now() + d * 864e5);
for (const owner of [hosp, org]) for (const g of BLOOD_GROUPS) {
  const n = owner === org ? 20 : 4;
  await BloodInventory.create({ owner: owner._id, bloodGroup: g, batches: [{ batchNo: `${g}-${owner.role[0]}1`, units: n, expiresAt: exp(30) }, { batchNo: `${g}-${owner.role[0]}2`, units: 2, expiresAt: exp(5) }] });
}
console.log('Seeded. Login with any *@bloodbank.io /', pw, admin.email);
await mongoose.disconnect();
