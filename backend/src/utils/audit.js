import AuditLog from '../models/AuditLog.js';
export const audit = (data, session) => AuditLog.create([data], session ? { session } : undefined);
