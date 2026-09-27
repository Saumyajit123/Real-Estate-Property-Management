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
// GET ALL CATEGORIES
// ==========================================================

const getAllCategorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  search: Joi.string().trim().allow("").optional(),

  sortBy: Joi.string()
    .valid("name", "createdAt", "updatedAt")
    .default("createdAt"),

  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
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
  getAllCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
};
