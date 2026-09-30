const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PropertySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is required"],
      trim: true,
    },
    propertyType: {
      type: String,
      enum: [
        "Apartment",
        "House",
        "Villa",
        "Land",
        "Office",
        "Shop",
        "Warehouse",
      ],
      required: [true, "Property Type is required"],
      trim: true,
    },
    purpose: {
      type: String,
      enum: ["Sale", "Rent"],
      required: [true, "purpose is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    area: {
      type: Number,
      required: [true, "Area ia required"],
    },
    bedrooms: {
      type: Number,
      required: [true, "Bedrooms quantity is required"],
    },
    bathrooms: {
      type: Number,
      required: [true, "Bathrooms is required"],
    },
    furnishingStatus: {
      type: String,
      enum: ["Furnished", "Semi-Furnished", "Unfurnished"],
      required: [true, "Furnishing Status is required"],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },

    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:[true,"Owner is required"]
    },
    agent:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:[true,"Agent is required"],

    

    },

    images: [
      {
        image: {
          type: String,
          required: [true, "Image is required"],
          trim: true,
          default: "hello.png",
        },
        public_id: {
          type: String,
          required: [true, "Public_Id is required"],
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    amenities: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["Available", "Sold", "Rented", "Unavailable"],
      required: [true, "Status is required"],
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "rejected"],
      default: "Pending",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: [true, "Location Type is required"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: [true, "coordinates is required"],
      },
    },
  },
  {
    timestamps: true,
  },
);

const PropertyModel = mongoose.model("property", PropertySchema);
module.exports = PropertyModel;
