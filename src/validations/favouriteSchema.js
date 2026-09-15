const Joi = require("joi");

// ==========================================================
// ADD FAVOURITE
// ==========================================================

const addFavouriteSchema = Joi.object({
  property: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

// ==========================================================
// PROPERTY ID
// ==========================================================

const propertyIdSchema = Joi.object({
  propertyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
});

module.exports = {
  addFavouriteSchema,
  propertyIdSchema,
};
