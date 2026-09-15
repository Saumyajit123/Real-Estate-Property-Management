const Joi = require("joi");

// ==========================================================
// CREATE INQUIRY
// ==========================================================

const createInquirySchema = Joi.object({
  property: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  name: Joi.string().trim().min(2).max(100).required(),

  email: Joi.string().email().lowercase().trim().required(),

  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .optional(),

  message: Joi.string().trim().min(5).max(2000).required(),
});

// ==========================================================
// UPDATE INQUIRY
// ==========================================================

const updateInquirySchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  status: Joi.string()
    .valid("pending", "contacted", "resolved", "closed")
    .optional(),

  reply: Joi.string().trim().max(2000).allow("").optional(),
});

// ==========================================================
// INQUIRY ID
// ==========================================================

const inquiryIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

module.exports = {
  createInquirySchema,
  updateInquirySchema,
  inquiryIdSchema,
};
