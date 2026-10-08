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
  email: Joi.string().trim().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
});

// ==========================================================
// RESET PASSWORD
// ==========================================================

const resetPasswordSchema = Joi.object({

  password: Joi.string().trim().min(6).max(15).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
    "string.max": "Password cannot exceed 10 characters",
    "any.required": "Password is required",
  }),
  
  confirm_password: Joi.string().trim().required().valid(Joi.ref("password")).messages({
      "string.empty": "Confirm password is required",
      "any.only": "Confirm password must match new password",
      "any.required": "Confirm password is required",
    }),
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
  updateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
};
