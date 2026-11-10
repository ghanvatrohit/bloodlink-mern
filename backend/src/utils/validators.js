import { z } from 'zod';
import { BLOOD_GROUPS, REQUEST_STATUS } from './constants.js';

const password = z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,64}$/, 'Min 8 chars with upper, lower, number & symbol');
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Invalid email'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile'),
  password,
  role: z.enum(['patient', 'donor', 'hospital', 'organization']),
  city: z.string().trim().min(2).max(60),
  address: z.string().max(200).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  dob: z.coerce.date().optional(),
  healthEligible: z.boolean().optional(),
  licenseNo: z.string().max(50).optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
}).superRefine((d, ctx) => {
  if (d.role === 'donor') {
    if (!d.bloodGroup) ctx.addIssue({ path: ['bloodGroup'], code: 'custom', message: 'Required for donors' });
    const age = d.dob ? (Date.now() - d.dob.getTime()) / (365.25 * 864e5) : 0;
    if (age < 18 || age > 65) ctx.addIssue({ path: ['dob'], code: 'custom', message: 'Donor must be 18-65 years' });
  }
  if (['hospital', 'organization'].includes(d.role) && !d.licenseNo)
    ctx.addIssue({ path: ['licenseNo'], code: 'custom', message: 'License number required' });
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const requestSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  units: z.coerce.number().int().min(1).max(20),
  urgency: z.enum(['Normal', 'Critical']).default('Normal'),
  targetType: z.enum(['hospital', 'organization', 'public']),
  target: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  patientName: z.string().max(100).optional(),
  city: z.string().min(2).max(60),
});
export const statusSchema = z.object({ status: z.enum(REQUEST_STATUS), note: z.string().max(300).optional() });
export const batchSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  units: z.coerce.number().int().min(1).max(500),
  batchNo: z.string().min(2).max(40),
  expiresAt: z.coerce.date(),
  storageUnit: z.string().max(40).optional(),
});
export const transferSchema = z.object({
  hospitalId: z.string().regex(/^[a-f\d]{24}$/i),
  bloodGroup: z.enum(BLOOD_GROUPS),
  units: z.coerce.number().int().min(1).max(200),
  requestId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});
export const donationSchema = z.object({
  facilityId: z.string().regex(/^[a-f\d]{24}$/i),
  scheduledAt: z.coerce.date(),
  driveName: z.string().max(100).optional(),
});
export const broadcastSchema = z.object({
  title: z.string().min(3).max(100), body: z.string().min(3).max(500),
  type: z.enum(['maintenance', 'shortage', 'sos']), city: z.string().optional(), bloodGroup: z.enum(BLOOD_GROUPS).optional(),
});
