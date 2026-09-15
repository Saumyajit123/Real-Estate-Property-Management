const Joi = require("joi");

// ==========================================================
// CREATE PROPERTY
// ==========================================================

const createPropertySchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),

  description: Joi.string().trim().min(10).max(5000).required(),

  propertyType: Joi.string()
    .valid(
      "apartment",
      "house",
      "villa",
      "plot",
      "commercial",
      "office",
      "shop",
      "warehouse",
    )
    .required(),

  listingType: Joi.string().valid("sale", "rent").required(),

  price: Joi.number().positive().required(),

  area: Joi.number().positive().required(),

  bedrooms: Joi.number().integer().min(0).optional(),

  bathrooms: Joi.number().integer().min(0).optional(),

  floors: Joi.number().integer().min(1).optional(),

  furnishing: Joi.string()
    .valid("unfurnished", "semi-furnished", "fully-furnished")
    .optional(),

  address: Joi.string().trim().min(5).max(300).required(),

  city: Joi.string().trim().min(2).max(100).required(),

  state: Joi.string().trim().min(2).max(100).required(),

  pincode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .optional(),

  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  agent: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  videoUrl: Joi.string().uri().allow("").optional(),

  amenities: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim()), Joi.string())
    .optional(),

  latitude: Joi.number().min(-90).max(90).optional(),

  longitude: Joi.number().min(-180).max(180).optional(),
});

// ==========================================================
// UPDATE PROPERTY
// ==========================================================

const updatePropertySchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),

  title: Joi.string().trim().min(3).max(200).optional(),

  description: Joi.string().trim().min(10).max(5000).optional(),

  propertyType: Joi.string()
    .valid(
      "apartment",
      "house",
      "villa",
      "plot",
      "commercial",
      "office",
      "shop",
      "warehouse",
    )
    .optional(),

  listingType: Joi.string().valid("sale", "rent").optional(),

  price: Joi.number().positive().optional(),

  area: Joi.number().positive().optional(),

  bedrooms: Joi.number().integer().min(0).optional(),

  bathrooms: Joi.number().integer().min(0).optional(),

  floors: Joi.number().integer().min(1).optional(),

  furnishing: Joi.string()
    .valid("unfurnished", "semi-furnished", "fully-furnished")
    .optional(),

  address: Joi.string().trim().min(5).max(300).optional(),

  city: Joi.string().trim().min(2).max(100).optional(),

  state: Joi.string().trim().min(2).max(100).optional(),

  pincode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .optional(),

  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  agent: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  videoUrl: Joi.string().uri().allow("").optional(),

  amenities: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),

  latitude: Joi.number().min(-90).max(90).optional(),

  longitude: Joi.number().min(-180).max(180).optional(),
});

// ==========================================================
// PROPERTY ID
// ==========================================================

const propertyIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

// ==========================================================
// PROPERTY SEARCH
// ==========================================================

const propertySearchSchema = Joi.object({
  keyword: Joi.string().trim().optional(),

  city: Joi.string().trim().optional(),

  state: Joi.string().trim().optional(),

  propertyType: Joi.string()
    .valid(
      "apartment",
      "house",
      "villa",
      "plot",
      "commercial",
      "office",
      "shop",
      "warehouse",
    )
    .optional(),

  listingType: Joi.string().valid("sale", "rent").optional(),

  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  minPrice: Joi.number().min(0).optional(),

  maxPrice: Joi.number().min(0).optional(),

  minArea: Joi.number().min(0).optional(),

  maxArea: Joi.number().min(0).optional(),

  bedrooms: Joi.number().integer().min(0).optional(),

  bathrooms: Joi.number().integer().min(0).optional(),

  latitude: Joi.number().min(-90).max(90).optional(),

  longitude: Joi.number().min(-180).max(180).optional(),

  radius: Joi.number().positive().optional(),

  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  sort: Joi.string()
    .valid("priceAsc", "priceDesc", "newest", "oldest")
    .default("newest"),
});

module.exports = {
  createPropertySchema,
  updatePropertySchema,
  propertyIdSchema,
  propertySearchSchema,
};
