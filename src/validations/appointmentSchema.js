const Joi = require("joi");

// ==========================================================
// CREATE APPOINTMENT
// ==========================================================

const createAppointmentSchema = Joi.object({
  property: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  appointmentDate: Joi.date().iso().greater("now").required(),

  duration: Joi.number().integer().min(15).max(480).default(60),

  message: Joi.string().trim().max(1000).allow("").optional(),
});

// ==========================================================
// UPDATE APPOINTMENT
// ==========================================================

const updateAppointmentSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  appointmentDate: Joi.date().iso().greater("now").optional(),

  duration: Joi.number().integer().min(15).max(480).optional(),

  status: Joi.string()
    .valid("pending", "confirmed", "completed", "cancelled", "rejected")
    .optional(),

  message: Joi.string().trim().max(1000).allow("").optional(),

  cancellationReason: Joi.string().trim().max(1000).allow("").optional(),
});

// ==========================================================
// CANCEL APPOINTMENT
// ==========================================================

const cancelAppointmentSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  cancellationReason: Joi.string().trim().max(1000).allow("").optional(),
});

// ==========================================================
// APPOINTMENT ID
// ==========================================================

const appointmentIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  appointmentIdSchema,
};
