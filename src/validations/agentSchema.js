const Joi = require("joi");

const agentRegisterSchema = Joi.object({

  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 100 characters",
      "any.required": "Name is required",
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email",
      "any.required": "Email is required",
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "string.pattern.base":
        "Phone number must be a valid 10-digit Indian mobile number",
      "any.required": "Phone number is required",
    }),

  password: Joi.string()
    .min(8)
    .max(30)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password cannot exceed 30 characters",
      "any.required": "Password is required",
    }),

  licenseNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "License number cannot exceed 100 characters",
    }),

  agencyName: Joi.string()
    .trim()
    .max(150)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "Agency name cannot exceed 150 characters",
    }),

  experience: Joi.number()
    .integer()
    .min(0)
    .max(60)
    .optional()
    .default(0)
    .messages({
      "number.base": "Experience must be a number",
      "number.integer": "Experience must be a whole number",
      "number.min": "Experience cannot be negative",
      "number.max": "Experience cannot exceed 60 years",
    }),

  specialization: Joi.alternatives()
  .try(
    Joi.string().valid(
      "Residential",
      "Commercial",
      "Land",
      "Rental",
      "Luxury"
    ),

    Joi.array()
      .items(
        Joi.string().valid(
          "Residential",
          "Commercial",
          "Land",
          "Rental",
          "Luxury"
        )
      )
  )
  .optional()
  .messages({
    "alternatives.match":
      "Specialization must be Residential, Commercial, Land, Rental, or Luxury",
  }),

  bio: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "Bio cannot exceed 1000 characters",
    }),


  address: Joi.object({
    street: Joi.string()
      .trim()
      .max(200)
      .optional()
      .allow("", null),

    city: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow("", null),

    state: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow("", null),

    country: Joi.string()
      .trim()
      .default("India")
      .optional(),

    pincode: Joi.string()
      .trim()
      .pattern(/^\d{6}$/)
      .optional()
      .allow("", null)
      .messages({
        "string.pattern.base":
          "Pincode must be a valid 6-digit number",
      }),
  })
    .optional(),

});

const updateAgentProfileSchema = Joi.object({
  // ==========================================
  // Basic Information
  // ==========================================

  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.empty": "Name cannot be empty",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 100 characters",
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({
      "string.empty": "Phone cannot be empty",
      "string.pattern.base":
        "Phone number must be a valid 10-digit Indian mobile number",
    }),

  // ==========================================
  // Agent Information
  // ==========================================

  licenseNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow("", null)
    .messages({
      "string.max":
        "License number cannot exceed 100 characters",
    }),

  agencyName: Joi.string()
    .trim()
    .max(150)
    .optional()
    .allow("", null)
    .messages({
      "string.max":
        "Agency name cannot exceed 150 characters",
    }),

  experience: Joi.number()
    .integer()
    .min(0)
    .max(60)
    .optional()
    .messages({
      "number.base": "Experience must be a number",
      "number.integer":
        "Experience must be a whole number",
      "number.min":
        "Experience cannot be negative",
      "number.max":
        "Experience cannot exceed 60 years",
    }),

  specialization: Joi.alternatives()
  .try(
    Joi.string().valid(
      "Residential",
      "Commercial",
      "Land",
      "Rental",
      "Luxury"
    ),

    Joi.array()
      .items(
        Joi.string().valid(
          "Residential",
          "Commercial",
          "Land",
          "Rental",
          "Luxury"
        )
      )
  )
  .optional()
  .messages({
    "alternatives.match":
      "Specialization must be Residential, Commercial, Land, Rental, or Luxury",
  }),

  bio: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow("", null)
    .messages({
      "string.max":
        "Bio cannot exceed 1000 characters",
    }),

  // ==========================================
  // Address
  // ==========================================

  address: Joi.object({
    street: Joi.string()
      .trim()
      .max(200)
      .optional()
      .allow("", null),

    city: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow("", null),

    state: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow("", null),

    country: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow("", null),

    pincode: Joi.string()
      .trim()
      .pattern(/^\d{6}$/)
      .optional()
      .allow("", null)
      .messages({
        "string.pattern.base":
          "Pincode must be a valid 6-digit number",
      }),
  }).optional(),
});

module.exports = {agentRegisterSchema,updateAgentProfileSchema};