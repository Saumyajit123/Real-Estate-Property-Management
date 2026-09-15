const Joi = require("joi");

// ==========================================================
// CREATE NOTIFICATION
// ==========================================================

const createNotificationSchema = Joi.object({
  user: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  title: Joi.string().trim().min(2).max(200).required(),

  message: Joi.string().trim().min(2).max(2000).required(),

  type: Joi.string()
    .valid(
      "property",
      "inquiry",
      "appointment",
      "review",
      "rental",
      "lease",
      "system",
    )
    .default("system"),

  relatedId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
});

// ==========================================================
// NOTIFICATION ID
// ==========================================================

const notificationIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

module.exports = {
  createNotificationSchema,
  notificationIdSchema,
};
