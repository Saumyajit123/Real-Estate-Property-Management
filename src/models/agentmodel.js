const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    // ==========================================
    // Basic Information
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    image: {
      type: String,
      default: null,
    },
    public_id:{
      type:String,
      trim:true
    },

    // ==========================================
    // Agent Information
    // ==========================================

    role: {
      type: String,
      enum: ["agent"],
      default: "agent",
    },

    licenseNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    agencyName: {
      type: String,
      trim: true,
      default: null,
    },

    experience: {
      type: Number,
      min: 0,
      default: 0,
    },

    specialization: [
      {
        type: String,
        enum: [
          "Residential",
          "Commercial",
          "Land",
          "Rental",
          "Luxury",
        ],
      },
    ],

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    // ==========================================
    // Address
    // ==========================================

    address: {
      street: {
        type: String,
        trim: true,
      },

      city: {
        type: String,
        trim: true,
      },

      state: {
        type: String,
        trim: true,
      },

      country: {
        type: String,
        trim: true,
        default: "India",
      },

      pincode: {
        type: String,
        trim: true,
      },
    },

    // ==========================================
    // Account Status
    // ==========================================

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // Authentication
    // ==========================================

    loginSecret: {
      type: String,
      select: false,
    },

    refreshTokenHash: {
      type: String,
      select: false,
    },

    refreshTokenExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Agent", agentSchema);