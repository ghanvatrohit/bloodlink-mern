import { Router } from 'express';
import { protect, allow } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { authLimiter } from '../middleware/rateLimit.js';
import * as v from '../utils/validators.js';
import * as auth from '../controllers/auth.controller.js';
import * as user from '../controllers/user.controller.js';
import * as inv from '../controllers/inventory.controller.js';
import * as reqc from '../controllers/request.controller.js';
import * as don from '../controllers/donation.controller.js';
import * as chat from '../controllers/chat.controller.js';
import * as admin from '../controllers/admin.controller.js';

const r = Router();
const FAC = ['hospital', 'organization'];

// Auth
r.post('/auth/register', authLimiter, validate(v.registerSchema), auth.register);
r.post('/auth/login', authLimiter, validate(v.loginSchema), auth.login);
r.post('/auth/refresh', auth.refresh);
r.post('/auth/logout', auth.logout);
r.post('/auth/logout-all', protect, auth.logoutAll);
r.get('/auth/me', protect, auth.me);

// Users
r.get('/users/facilities', protect, user.listFacilities);
r.get('/users/donors', protect, allow('hospital', 'organization', 'admin'), user.searchDonors);
r.patch('/users/me', protect, user.updateProfile);
r.patch('/users/me/availability', protect, allow('donor'), user.setAvailability);

// Inventory
r.get('/inventory', protect, allow(...FAC, 'admin'), inv.myInventory);
r.get('/inventory/availability', protect, inv.availability);
r.post('/inventory/batches', protect, allow(...FAC), validate(v.batchSchema), inv.addBatch);
r.delete('/inventory/batches/:batchId', protect, allow(...FAC), inv.removeBatch);
r.patch('/inventory/:group/threshold', protect, allow(...FAC), inv.setThreshold);
r.post('/inventory/transfer', protect, allow('organization'), validate(v.transferSchema), inv.transferToHospital);

// Requests
r.post('/requests', protect, allow('patient', 'hospital'), upload.single('prescription'), validate(v.requestSchema), reqc.createRequest);
r.post('/requests/sos', protect, allow('patient', 'hospital'), reqc.sos);
r.get('/requests', protect, reqc.listRequests);
r.get('/requests/:id', protect, reqc.getRequest);
r.post('/requests/:id/allot', protect, allow(...FAC), reqc.allot);
r.patch('/requests/:id/status', protect, validate(v.statusSchema), reqc.updateStatus);
r.post('/requests/:id/volunteer', protect, allow('donor'), reqc.volunteer);

// Donations
r.post('/donations', protect, allow('donor'), validate(v.donationSchema), don.schedule);
r.post('/donations/walk-in', protect, allow(...FAC), don.walkIn);
r.get('/donations', protect, allow('donor', ...FAC), don.listDonations);
r.patch('/donations/:id', protect, allow(...FAC), don.decide);
r.get('/donations/:id/certificate', protect, allow('donor'), don.certificate);

// Chat
r.get('/chat/contacts', protect, chat.contacts);
r.get('/chat/conversations', protect, chat.myConversations);
r.post('/chat/conversations', protect, chat.startConversation);
r.get('/chat/conversations/:id/messages', protect, chat.messages);
r.post('/chat/messages/:id/flag', protect, chat.flagMessage);

// Admin
const A = [protect, allow('admin')];
r.get('/admin/stats', ...A, admin.stats);
r.get('/admin/users', ...A, admin.listUsers);
r.post('/admin/users', ...A, admin.createUser);
r.patch('/admin/users/:id', ...A, admin.updateUser);
r.delete('/admin/users/:id', ...A, admin.deleteUser);
r.get('/admin/inventory', ...A, admin.allInventory);
r.patch('/admin/inventory/:id', ...A, admin.adjustInventory);
r.get('/admin/messages', ...A, admin.moderation);
r.delete('/admin/messages/:id', ...A, admin.deleteMessage);
r.post('/admin/broadcasts', ...A, validate(v.broadcastSchema), admin.broadcast);
r.get('/broadcasts', protect, admin.listBroadcasts);
r.get('/admin/audit-logs', ...A, admin.auditLogs);

export default r;
