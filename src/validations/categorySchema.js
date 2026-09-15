const Joi = require("joi");

// ==========================================================
// CREATE CATEGORY
// ==========================================================

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  description: Joi.string().trim().max(500).allow("").optional(),
});

// ==========================================================
// UPDATE CATEGORY
// ==========================================================

const updateCategorySchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  name: Joi.string().trim().min(2).max(100).optional(),

  description: Joi.string().trim().max(500).allow("").optional(),
});

// ==========================================================
// CATEGORY ID
// ==========================================================

const categoryIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
};
