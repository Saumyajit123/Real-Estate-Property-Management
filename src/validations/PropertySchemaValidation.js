const joi = require("joi");

class PropertySchemaValidation {
  static createproperty = joi.object({
    title: joi.string().trim().required().messages({
      "string.empty": "Title is required",
      "any.required": "Title is required",
    }),

    description: joi.string().trim().required().messages({
      "string.empty": "Description is required",
      "any.required": "Description is required",
    }),

    propertyType: joi
      .string()
      .valid(
        "Apartment",
        "House",
        "Villa",
        "Land",
        "Office",
        "Shop",
        "Warehouse"
      )
      .required()
      .messages({
        "string.empty": "Property Type is required",
        "any.required": "Property Type is required",
        "any.only":
          "Property Type must be Apartment, House, Villa, Land, Office, Shop or Warehouse",
      }),

    purpose: joi
      .string()
      .valid("Sale", "Rent")
      .required()
      .messages({
        "string.empty": "Purpose is required",
        "any.required": "Purpose is required",
        "any.only": "Purpose must be Sale or Rent",
      }),

    price: joi.number().positive().required().messages({
      "number.base": "Price must be a number",
      "number.positive": "Price must be greater than 0",
      "any.required": "Price is required",
    }),

    area: joi.number().positive().required().messages({
      "number.base": "Area must be a number",
      "number.positive": "Area must be greater than 0",
      "any.required": "Area is required",
    }),

    bedrooms: joi.number().integer().min(0).required().messages({
      "number.base": "Bedrooms quantity must be a number",
      "number.integer": "Bedrooms quantity must be an integer",
      "number.min": "Bedrooms quantity cannot be negative",
      "any.required": "Bedrooms quantity is required",
    }),

    bathrooms: joi.number().integer().min(0).required().messages({
      "number.base": "Bathrooms quantity must be a number",
      "number.integer": "Bathrooms quantity must be an integer",
      "number.min": "Bathrooms quantity cannot be negative",
      "any.required": "Bathrooms quantity is required",
    }),

    furnishingStatus: joi
      .string()
      .valid("Furnished", "Semi-Furnished", "Unfurnished")
      .required()
      .messages({
        "string.empty": "Furnishing Status is required",
        "any.required": "Furnishing Status is required",
        "any.only":
          "Furnishing Status must be Furnished, Semi-Furnished or Unfurnished",
      }),

    images: joi
      .object({
        image: joi.string().trim().required().messages({
          "string.empty": "Image is required",
          "any.required": "Image is required",
        }),

        public_id: joi.string().trim().required().messages({
          "string.empty": "Public_Id is required",
          "any.required": "Public_Id is required",
        }),
      })
      .required()
      .messages({
        "any.required": "Images are required",
      }),

    isDeleted: joi.boolean().optional().default(false),

    amenities: joi.array().items(joi.string().trim()).optional(),

    status: joi
      .string()
      .valid("Available", "Sold", "Rented", "Unavailable")
      .required()
      .messages({
        "string.empty": "Status is required",
        "any.required": "Status is required",
        "any.only":
          "Status must be Available, Sold, Rented or Unavailable",
      }),

    approvalStatus: joi
      .string()
      .valid("Pending", "Approved", "rejected")
      .optional()
      .default("Pending")
      .messages({
        "any.only":
          "Approval Status must be Pending, Approved or rejected",
      }),

    location: joi
      .object({
        type: joi.string().valid("Point").required().messages({
          "string.empty": "Location Type is required",
          "any.required": "Location Type is required",
          "any.only": "Location Type must be Point",
        }),

        coordinates: joi
          .array()
          .items(joi.number())
          .length(2)
          .required()
          .messages({
            "array.base": "Coordinates must be an array",
            "array.length": "Coordinates must contain exactly 2 values",
            "any.required": "Coordinates are required",
          }),
      })
      .required()
      .messages({
        "any.required": "Location is required",
      }),
  });
}

module.exports = PropertySchemaValidation;