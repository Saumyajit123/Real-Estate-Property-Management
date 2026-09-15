const mongoose = require("mongoose");

const leaseSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    tenant: {
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

    rentalApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalApplication",
      default: null,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    monthlyRent: {
      type: Number,
      required: true,
    },

    securityDeposit: {
      type: Number,
      default: 0,
    },

    agreementDocument: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "expired", "terminated"],
      default: "active",
    },

    terminationReason: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
  },
);

const LeaseModel = mongoose.model("Lease", leaseSchema);

module.exports = LeaseModel;
