const Joi = require("joi");

const ownerValidation = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters",
    "string.max": "Name cannot exceed 100 characters",
    "any.required": "Name is required",
  }),

  email: Joi.string().email().lowercase().trim().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email",
    "any.required": "Email is required",
  }),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Phone number must be a valid 10-digit Indian number",
      "any.required": "Phone number is required",
    }),

  password: Joi.string().min(6).max(30).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
    "string.max": "Password cannot exceed 30 characters",
    "any.required": "Password is required",
  }),

  address: Joi.object({
    street: Joi.string().trim().max(200).optional(),

    city: Joi.string().trim().max(100).optional(),

    state: Joi.string().trim().max(100).optional(),

    country: Joi.string().trim().default("India").optional(),

    pincode: Joi.string()
      .trim()
      .pattern(/^[1-9][0-9]{5}$/)
      .optional()
      .messages({
        "string.pattern.base": "Pincode must be a valid 6-digit Indian pincode",
      }),
  }).optional(),

  role: Joi.string().valid("owner").default("owner"),

  status: Joi.string()
    .valid("active", "inactive", "blocked")
    .default("inactive"),
});

const verifyEmailOTPSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),
});

const resendEmailOTPSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),

  password: Joi.string().min(6).max(100).required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional(),

  avatar: Joi.string().uri().optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(100).required(),

  newPassword: Joi.string().min(6).max(100).required(),
});



const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
});



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

module.exports = {
    ownerValidation,
    verifyEmailOTPSchema,
    resendEmailOTPSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema

};