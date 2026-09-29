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
    .valid(
      "pending",
      "confirmed",
      "completed",
      "cancelled",
      "rejected",
      "rescheduled",
    )
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

// ==========================================================
// APPOINTMENT ACTION
// ==========================================================

const appointmentActionSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid appointment ID",
      "any.required": "Appointment ID is required",
    }),

  action: Joi.string()
    .valid("confirm", "reject", "reschedule", "complete")
    .required()
    .messages({
      "any.only": "Action must be confirm, reject, reschedule or complete",
      "any.required": "Appointment action is required",
    }),

  appointmentDate: Joi.date().iso().greater("now").when("action", {
    is: "reschedule",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  duration: Joi.number().integer().min(15).max(480).default(60),

  message: Joi.string().trim().max(1000).allow("").optional(),

  cancellationReason: Joi.string().trim().max(1000).allow("").optional(),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  appointmentIdSchema,
  appointmentActionSchema
};
