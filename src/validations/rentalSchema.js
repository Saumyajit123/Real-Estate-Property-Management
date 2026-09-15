const Joi = require("joi");

// ==========================================================
// CREATE RENTAL APPLICATION
// ==========================================================

const createApplicationSchema = Joi.object({
  property: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  monthlyIncome: Joi.number().min(0).optional(),

  employmentStatus: Joi.string().trim().max(100).optional(),

  occupation: Joi.string().trim().max(100).optional(),

  message: Joi.string().trim().max(2000).allow("").optional(),
});

// ==========================================================
// UPDATE APPLICATION STATUS
// ==========================================================

const updateApplicationStatusSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  status: Joi.string().valid("pending", "approved", "rejected").required(),

  rejectionReason: Joi.string().trim().max(1000).allow("").optional(),
});

// ==========================================================
// APPLICATION ID
// ==========================================================

const applicationIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

module.exports = {
  createApplicationSchema,
  updateApplicationStatusSchema,
  applicationIdSchema,
};
