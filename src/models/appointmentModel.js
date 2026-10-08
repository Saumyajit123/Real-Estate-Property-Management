const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "property",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
    },

    appointmentDate: {
      type: Date,
      required: true,
    },

    duration: {
      type: Number,
      default: 60,
    },

    message: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "rejected", "rescheduled",],
      default: "pending",
    },

    cancellationReason: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
  },
);

const AppointmentModel = mongoose.model("Appointment", appointmentSchema);

module.exports = AppointmentModel;
