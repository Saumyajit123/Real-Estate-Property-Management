const Joi = require("joi");

// ==========================================================
// AUDIT LOG ID
// ==========================================================

const auditLogIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

// ==========================================================
// AUDIT LOG QUERY
// ==========================================================

const auditLogQuerySchema = Joi.object({
  user: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  action: Joi.string().trim().optional(),

  entity: Joi.string().trim().optional(),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(20),

  startDate: Joi.date().iso().optional(),

  endDate: Joi.date().iso().optional(),
});

module.exports = {
  auditLogIdSchema,
  auditLogQuerySchema,
};
