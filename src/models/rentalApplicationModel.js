const mongoose = require("mongoose");

const rentalApplicationSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    monthlyIncome: {
      type: Number,
      default: 0,
    },

    employmentStatus: {
      type: String,
      default: "",
    },

    occupation: {
      type: String,
      default: "",
    },

    documents: [
      {
        type: String,
      },
    ],

    message: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
  },
);

const RentalApplicationModel = mongoose.model("RentalApplication", rentalApplicationSchema);

module.exports = RentalApplicationModel;
