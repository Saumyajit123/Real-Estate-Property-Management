const Joi = require("joi");

// ==========================================================
// REGISTER
// ==========================================================

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  email: Joi.string().email().lowercase().trim().required(),

  password: Joi.string().min(6).max(100).required(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional(),
});

// ==========================================================
// VERIFY EMAIL OTP
// ==========================================================

const verifyEmailOTPSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),
});

// ==========================================================
// RESEND OTP
// ==========================================================

const resendEmailOTPSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

// ==========================================================
// LOGIN
// ==========================================================

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),

  password: Joi.string().min(6).max(100).required(),
});

// ==========================================================
// REFRESH TOKEN
// ==========================================================

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ==========================================================
// UPDATE PROFILE
// ==========================================================

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional(),

  avatar: Joi.string().uri().optional(),
});

// ==========================================================
// CHANGE PASSWORD
// ==========================================================

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(100).required(),

  newPassword: Joi.string().min(6).max(100).required(),
});

// ==========================================================
// FORGOT PASSWORD
// ==========================================================

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

// ==========================================================
// RESET PASSWORD
// ==========================================================

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),

  newPassword: Joi.string().min(6).max(100).required(),
});

// ==========================================================
// ADMIN CREATE USER
// ==========================================================

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  email: Joi.string().email().lowercase().trim().required(),

  password: Joi.string().min(6).max(100).required(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional(),

  role: Joi.string()
    .valid("admin", "agent", "owner", "customer")
    .default("customer"),

  status: Joi.string().valid("active", "inactive", "blocked").default("active"),

  avatar: Joi.string().uri().optional(),
});

// ==========================================================
// ADMIN UPDATE USER
// ==========================================================

const updateUserSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  name: Joi.string().trim().min(2).max(100).optional(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional(),

  role: Joi.string().valid("admin", "agent", "owner", "customer").optional(),

  status: Joi.string().valid("active", "inactive", "blocked").optional(),

  avatar: Joi.string().uri().optional(),
});

// ==========================================================
// UPDATE USER ROLE
// ==========================================================

const updateUserRoleSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  role: Joi.string().valid("admin", "agent", "owner", "customer").required(),
});

// ==========================================================
// UPDATE USER STATUS
// ==========================================================

const updateUserStatusSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  status: Joi.string().valid("active", "inactive", "blocked").required(),
});

// ==========================================================
// USER ID
// ==========================================================

const userIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

// ==========================================================
// CREATE AGENT
// ==========================================================

const createAgentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  email: Joi.string().email().lowercase().trim().required(),

  password: Joi.string().min(6).max(100).required(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional(),

  avatar: Joi.string().uri().optional(),
});

module.exports = {
  registerSchema,
  verifyEmailOTPSchema,
  resendEmailOTPSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
  createAgentSchema,
};
