import User from '../models/User.js';
import Address from '../models/Address.js';
import Order from '../models/Order.js';
import Wishlist from '../models/Wishlist.js';
import https from 'https';
import { randomInt } from 'crypto';
import { sendLoginOtpEmail } from '../services/mailService.js';

const otpStore = new Map();
const passwordOtpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_GAP_MS = 45 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAIL_TIMEOUT_MS = 8000;

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const getPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  username: user.username,
  phone: user.phone,
  address: user.address
});

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('OTP email timeout')), timeoutMs);
  promise
    .then((result) => {
      clearTimeout(timer);
      resolve(result);
    })
    .catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
});

const getJSONWithHttps = (url) => new Promise((resolve, reject) => {
  https
    .get(url, (resp) => {
      let raw = '';
      resp.on('data', (chunk) => { raw += chunk; });
      resp.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
    })
    .on('error', reject);
});

export const lookupPincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: 'Pincode must be a valid 6-digit number' });
    }

    let data;
    if (typeof fetch === 'function') {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      if (!response.ok) {
        return res.status(502).json({ message: 'Postal service unavailable' });
      }
      data = await response.json();
    } else {
      data = await getJSONWithHttps(`https://api.postalpincode.in/pincode/${pincode}`);
    }

    const result = data?.[0];
    const postOffice = result?.PostOffice?.[0];

    if (result?.Status !== 'Success' || !postOffice) {
      return res.status(404).json({ message: 'Invalid pincode' });
    }

    return res.json({
      pincode,
      district: postOffice.District || '',
      state: postOffice.State || '',
      locality: postOffice.Name || '',
      block: postOffice.Block || ''
    });
  } catch {
    return res.status(500).json({ message: 'Could not fetch postal details right now' });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, username, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const userPayload = {
      name,
      email,
      password
    };

    if (phone?.trim()) userPayload.phone = phone.trim();
    if (username?.trim()) userPayload.username = username.trim().toLowerCase();

    if (address && typeof address === 'object') {
      const cleanedAddress = {
        street: address.street?.trim() || undefined,
        city: address.city?.trim() || undefined,
        district: address.district?.trim() || undefined,
        state: address.state?.trim() || undefined,
        pincode: address.pincode?.trim() || undefined
      };
      const hasAddressValue = Object.values(cleanedAddress).some(Boolean);
      if (hasAddressValue) userPayload.address = cleanedAddress;
    }

    const user = await User.create(userPayload);
    const token = user.generateToken();

    res.status(201).json({ token, user: getPublicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already taken` });
    }
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked. Contact support.' });
    }

    const token = user.generateToken();

    res.json({ token, user: getPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestLoginOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked. Contact support.' });
    }

    const existing = otpStore.get(email);
    const now = Date.now();
    if (existing && now - existing.requestedAt < OTP_RESEND_GAP_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_GAP_MS - (now - existing.requestedAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before requesting another OTP` });
    }

    const otp = String(randomInt(0, 1000000)).padStart(6, '0');
    otpStore.set(email, {
      otp,
      userId: user._id.toString(),
      requestedAt: now,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0
    });

    let mailSent = false;
    try {
      mailSent = await withTimeout(
        sendLoginOtpEmail({ to: email, name: user.name, otp }),
        OTP_MAIL_TIMEOUT_MS
      );
    } catch {
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ message: 'Could not send OTP right now. Please try again.' });
      }
    }

    const payload = { message: 'OTP sent successfully. Please check your email.' };
    if (!mailSent && process.env.NODE_ENV !== 'production') {
      payload.devOtp = otp;
      payload.message = 'Mail is not configured. Using development OTP fallback.';
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to request OTP' });
  }
};

export const loginWithOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'OTP must be a 6-digit number' });
    }

    const entry = otpStore.get(email);
    if (!entry) {
      return res.status(400).json({ message: 'OTP not requested or expired. Request a new OTP.' });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(email);
      return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
    }

    if (entry.otp !== otp) {
      entry.attempts += 1;
      otpStore.set(email, entry);
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    otpStore.delete(email);

    const user = await User.findById(entry.userId) || await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked. Contact support.' });
    }

    const token = user.generateToken();
    return res.json({ token, user: getPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'OTP login failed' });
  }
};

export const requestPasswordOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    if (!email) {
      return res.status(400).json({ message: 'User email not found' });
    }

    const existing = passwordOtpStore.get(email);
    const now = Date.now();
    if (existing && now - existing.requestedAt < OTP_RESEND_GAP_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_GAP_MS - (now - existing.requestedAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before requesting another OTP` });
    }

    const otp = String(randomInt(0, 1000000)).padStart(6, '0');
    passwordOtpStore.set(email, {
      otp,
      userId: req.user._id.toString(),
      requestedAt: now,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0
    });

    let mailSent = false;
    try {
      mailSent = await withTimeout(
        sendLoginOtpEmail({ to: email, name: req.user.name, otp }),
        OTP_MAIL_TIMEOUT_MS
      );
    } catch {
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ message: 'Could not send OTP right now. Please try again.' });
      }
    }

    const payload = { message: 'OTP sent successfully. Please check your email.' };
    if (!mailSent && process.env.NODE_ENV !== 'production') {
      payload.devOtp = otp;
      payload.message = 'Mail is not configured. Using development OTP fallback.';
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to request OTP' });
  }
};

export const changePasswordWithOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.user?.email);
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'OTP and new password are required' });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'OTP must be a 6-digit number' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const entry = passwordOtpStore.get(email);
    if (!entry) {
      return res.status(400).json({ message: 'OTP not requested or expired. Request a new OTP.' });
    }
    if (Date.now() > entry.expiresAt) {
      passwordOtpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }
    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      passwordOtpStore.delete(email);
      return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
    }
    if (entry.otp !== otp) {
      entry.attempts += 1;
      passwordOtpStore.set(email, entry);
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    const user = await User.findById(entry.userId).select('+password');
    if (!user) {
      passwordOtpStore.delete(email);
      return res.status(404).json({ message: 'Account not found' });
    }

    user.password = newPassword;
    await user.save();
    passwordOtpStore.delete(email);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update password' });
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, username, address, currentPassword, newPassword } = req.body;

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }
      const userWithPass = await User.findById(req.user._id).select('+password');
      const isMatch = await userWithPass.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      userWithPass.password = newPassword;
      await userWithPass.save();
      return res.json({ message: 'Password updated successfully' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (username !== undefined) updateData.username = username;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ user });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field} already taken` });
    }
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    await Promise.all([
      Address.deleteMany({ user: userId }),
      Wishlist.deleteMany({ user: userId }),
      Order.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
