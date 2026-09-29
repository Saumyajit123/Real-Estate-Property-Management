const Joi = require("joi");

// ==========================================================
// CREATE REVIEW
// ==========================================================

const createReviewSchema = Joi.object({
  property: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  rating: Joi.number().integer().min(1).max(5).required(),

  comment: Joi.string().trim().min(3).max(2000).required(),
});

// ==========================================================
// UPDATE REVIEW
// ==========================================================

const updateReviewSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  rating: Joi.number().integer().min(1).max(5).optional(),

  comment: Joi.string().trim().min(3).max(2000).optional(),
});

// ==========================================================
// REVIEW ID
// ==========================================================

const reviewIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

// ==========================================================
// PROPERTY REVIEWS
// ==========================================================

const propertyReviewSchema = Joi.object({
  propertyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

// ==========================================================
// REVIEW ACTION
// ==========================================================

const reviewActionSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid review ID",
      "any.required": "Review ID is required",
    }),

  action: Joi.string().valid("approve", "reject").required().messages({
    "any.only": "Action must be approve or reject",
    "any.required": "Review action is required",
  }),

  reason: Joi.string().trim().max(1000).allow("").optional(),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  propertyReviewSchema,
  reviewActionSchema,
};
