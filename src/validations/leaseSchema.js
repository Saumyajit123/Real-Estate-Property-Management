const Joi = require("joi");

// ==========================================================
// CREATE LEASE
// ==========================================================

const createLeaseSchema = Joi.object({
  property: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  tenant: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  owner: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  agent: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  rentalApplication: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  startDate: Joi.date().iso().required(),

  endDate: Joi.date().iso().greater(Joi.ref("startDate")).required(),

  monthlyRent: Joi.number().positive().required(),

  securityDeposit: Joi.number().min(0).optional(),

  status: Joi.string()
    .valid("active", "expired", "terminated")
    .default("active"),
});

// ==========================================================
// UPDATE LEASE
// ==========================================================

const updateLeaseSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  startDate: Joi.date().iso().optional(),

  endDate: Joi.date().iso().optional(),

  monthlyRent: Joi.number().positive().optional(),

  securityDeposit: Joi.number().min(0).optional(),

  status: Joi.string().valid("active", "expired", "terminated").optional(),
});

// ==========================================================
// TERMINATE LEASE
// ==========================================================

const terminateLeaseSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  terminationReason: Joi.string().trim().max(1000).required(),
});

// ==========================================================
// LEASE ID
// ==========================================================

const leaseIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

module.exports = {
  createLeaseSchema,
  updateLeaseSchema,
  terminateLeaseSchema,
  leaseIdSchema,
};
