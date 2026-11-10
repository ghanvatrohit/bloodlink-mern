import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { AppError, ah } from '../utils/AppError.js';
import { signAccess, signRefresh, cookieOpts } from '../utils/tokens.js';

const issue = (res, user, code = 200) => {
  res.cookie('refreshToken', signRefresh(user), cookieOpts);
  res.status(code).json({ accessToken: signAccess(user), user: user.refreshCooldown() });
};

export const register = ah(async (req, res) => {
  const { coordinates, ...data } = req.body;
  if (await User.exists({ email: data.email })) throw new AppError('Email already registered', 409);
  const user = await User.create({ ...data, ...(coordinates && { location: { type: 'Point', coordinates } }) });
  issue(res, user, 201);
});

export const login = ah(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.compare(req.body.password))) throw new AppError('Invalid credentials', 401);
  if (user.isBlocked) throw new AppError('Account blocked', 403);
  issue(res, user);
});

// Rotate refresh token & issue new access token
export const refresh = ah(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AppError('No refresh token', 401);
  let payload;
  try { payload = jwt.verify(token, env.refreshSecret); } catch { throw new AppError('Invalid refresh token', 401); }
  const user = await User.findById(payload.id);
  if (!user || user.tokenVersion !== payload.v || user.isBlocked) throw new AppError('Session revoked', 401);
  issue(res, user);
});

export const logout = ah(async (req, res) => {
  res.clearCookie('refreshToken', { ...cookieOpts, maxAge: undefined });
  res.json({ message: 'Logged out' });
});

export const logoutAll = ah(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie('refreshToken', { ...cookieOpts, maxAge: undefined });
  res.json({ message: 'All sessions revoked' });
});

export const me = ah(async (req, res) => {
  const u = req.user.refreshCooldown();
  if (u.isModified()) await u.save();
  res.json({ user: u });
});
