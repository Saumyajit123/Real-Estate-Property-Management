const Joi = require("joi");

const createRentalApplicationSchema = Joi.object({
  property: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.empty": "Property is required",
      "string.hex": "Property ID must be a valid MongoDB ObjectId",
      "string.length": "Property ID must be a valid MongoDB ObjectId",
      "any.required": "Property is required",
    }),

  monthlyIncome: Joi.number()
    .min(0)
    .default(0)
    .messages({
      "number.base": "Monthly income must be a number",
      "number.min": "Monthly income cannot be negative",
    }),

  employmentStatus: Joi.string()
    .trim()
    .max(100)
    .allow("")
    .default(""),

  occupation: Joi.string()
    .trim()
    .max(100)
    .allow("")
    .default(""),

  documents: Joi.alternatives()
  .try(
    Joi.string().trim().uri(),
    Joi.array().items(Joi.string().trim().uri())
  )
  .default([]),

  message: Joi.string()
    .trim()
    .max(1000)
    .allow("")
    .default(""),
});

const updateRentalApplicationSchema = Joi.object({
  monthlyIncome: Joi.number()
    .min(0)
    .messages({
      "number.base": "Monthly income must be a number",
      "number.min": "Monthly income cannot be negative",
    }),

  employmentStatus: Joi.string()
    .trim()
    .max(100)
    .allow(""),

  occupation: Joi.string()
    .trim()
    .max(100)
    .allow(""),

  documents: Joi.alternatives()
  .try(
    Joi.string().trim().uri(),
    Joi.array().items(Joi.string().trim().uri())
  )
  .default([]),

  message: Joi.string()
    .trim()
    .max(1000)
    .allow(""),
}).min(1);


const rentalApplicationActionSchema = Joi.object({
  action: Joi.string()
    .valid("approve", "reject")
    .required()
    .messages({
      "any.only": "Action must be approve or reject",
      "any.required": "Action is required",
    }),

  rejectionReason: Joi.when("action", {
    is: "reject",
    then: Joi.string()
      .trim()
      .min(3)
      .max(500)
      .required()
      .messages({
        "string.empty": "Rejection reason is required",
        "string.min": "Rejection reason must be at least 3 characters",
        "any.required": "Rejection reason is required",
      }),
    otherwise: Joi.string().allow("").default(""),
  }),
});

module.exports={createRentalApplicationSchema,updateRentalApplicationSchema,rentalApplicationActionSchema}