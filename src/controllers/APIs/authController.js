const bcryptjs = require("bcryptjs");
// const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../../models/userModel");
const Property = require("../../models/propertyModel");
const Inquiry = require("../../models/inquiryModel");
const Appointment = require("../../models/appointmentModel");
const Review = require("../../models/reviewModel");
const Category = require("../../models/categoryModel");
const {
  generateLoginSecret,
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/generateToken");
const { generateOTP, hashOTP } = require("../../utils/generateOtp");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPropertyApprovalEmail,
} = require("../../services/emailService");
const createNotification = require("../../services/notificationService");
const getPagination = require("../../utils/pagination");
const sendMail = require("../../config/sendMail");
// const { isError } = require("joi");

class AuthController {
  // User Registration:
  async register(req, res) {
    try {
      const { name, email, password, phone } = req.body;

      const existingUser = await User.findOne({
        email,
        isDeleted: false,
      });

      if (existingUser && !existingUser.isDeleted) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const otp = generateOTP();

      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: "customer",
        status: "active",
        isEmailVerified: false,
        emailOtp: otp,
        emailOtpExpires: otpExpires,
        isDeleted: false,
      });

      await sendMail(
        email,
        "Real Estate - Email Verification",
        `
        <h2>Welcome ${name}</h2>

        <p>
          Thank you for registering with our
          Real Estate Management System.
        </p>

        <p>Your email verification OTP is:</p>

        <h1>${otp}</h1>

        <p>This OTP will expire in 10 minutes.</p>

        <p>Please do not share this OTP with anyone.</p>
      `,
      );

      return res.status(201).json({
        success: true,
        message: "Registration successful. OTP sent to your email.",
        data: {
          userId: user._id,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Registration failed",
        error: error.message,
      });
    }
  }

  // Verify Email OTP:
  async verifyEmailOTP(req, res) {
    try {
      const { email, otp } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      if (!user.emailOtp || user.emailOtp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // Check expiry:
      if (!user.emailOtpExpires || user.emailOtpExpires < new Date()) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired",
        });
      }

      // Verify email
      user.isEmailVerified = true;

      // Remove OTP
      user.emailOtp = undefined;
      user.emailOtpExpires = undefined;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Email verification failed",
        error: error.message,
      });
    }
  }

  // Resend Email otp:
  async resendEmailOTP(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      const otp = generateOTP();

      user.emailOtp = otp;
      user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

      await user.save();

      await sendMail(
        email,
        "Real Estate - New Verification OTP",
        `
        <h2>Email Verification</h2>

        <p>Your new verification OTP is:</p>

        <h1>${otp}</h1>

        <p>This OTP will expire in 10 minutes.</p>
      `,
      );

      return res.status(200).json({
        success: true,
        message: "New OTP sent successfully",
      });
    } catch (error) {
      console.error("RESEND OTP ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP",
        error: error.message,
      });
    }
  }

  // Login:
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({
        email,
        isDeleted: false,
      }).select("+loginSecret +refreshTokenHash");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email before logging in",
        });
      }

      if (user.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Your account is not active",
        });
      }

      const isPasswordCorrect = await bcryptjs.compare(password, user.password);

      if (!isPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Login secret key:
      const loginSecret = generateLoginSecret();
      user.loginSecret = loginSecret;

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const refreshTokenHash = await bcryptjs.hash(refreshToken, 10);
      user.refreshTokenHash = refreshTokenHash;

      user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          accessToken,
          refreshToken,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
          },
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Login failed",
        error: error.message,
      });
    }
  }

  // Logout:
  async logout(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      //Destroy login credentials:
      user.loginSecret = undefined;
      user.refreshTokenHash = undefined;
      user.refreshTokenExpires = undefined;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Logout failed",
        error: error.message,
      });
    }
  }

  // Get profile:
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id).select(
        "-password -loginSecret -refreshTokenHash -emailOtp -emailOtpExpires -resetOtp -resetOtpExpires",
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile fetched successfully",
        data: user,
      });
    } catch (error) {
      console.error("GET PROFILE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: error.message,
      });
    }
  }

  // Update profile:
  async updateProfile(req, res) {
    try {
      const { name, phone, avatar } = req.body;

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (name !== undefined) {
        user.name = name;
      }

      if (phone !== undefined) {
        user.phone = phone;
      }

      if (avatar !== undefined) {
        user.avatar = avatar;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
      });
    }
  }

  // Change password:
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isCorrect = await bcryptjs.compare(currentPassword, user.password);
      if (!isCorrect) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      user.password = await bcryptjs.hash(newPassword, 10);

      // Invalidate all existing sessions
      user.loginSecret = undefined;
      user.refreshTokenHash = undefined;
      user.refreshTokenExpires = undefined;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password changed successfully. Please login again.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to change password",
        error: error.message,
      });
    }
  }

  // Forgot password:
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const otp = generateOTP();
      user.resetOtp = otp;

      user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

      await user.save();

      await sendMail(
        email,
        "Real Estate - Password Reset OTP",
        `
        <h2>Password Reset</h2>

        <p>Hello ${user.name},</p>

        <p>Your password reset OTP is:</p>

        <h1>${otp}</h1>

        <p>This OTP will expire in 10 minutes.</p>

        <p>If you did not request a password reset, ignore this email.</p>
      `,
      );

      return res.status(200).json({
        success: true,
        message: "Password reset OTP sent to your email",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to process forgot password",
        error: error.message,
      });
    }
  }

  // Reset password:
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.resetOtp || user.resetOtp !== otp) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired",
        });
      }

      if (!user.resetOtpExpires || user.resetOtpExpires < new Date()) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired",
        });
      }

      user.password = await bcryptjs.hash(newPassword, 10);

      // Clear OTP
      user.resetOtp = undefined;
      user.resetOtpExpires = undefined;

      // Invalidate existing login sessions
      user.loginSecret = undefined;
      user.refreshTokenHash = undefined;
      user.refreshTokenExpires = undefined;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password reset successfully. Please login again.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to reset password",
        error: error.message,
      });
    }
  }

  //   ===========================================================

  // Admin-get all users:
  async getAllUsers(req, res) {
    try {
      const users = await User.find()
        .select(
          "-password -loginSecret -refreshTokenHash -emailOtp -emailOtpExpires -resetOtp -resetOtpExpires",
        )
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: "Users fetched successfully",
        count: users.length,
        data: users,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  }

  // Admin-get user by ID:
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id).select(
        "-password -loginSecret -refreshTokenHash -emailOtp -emailOtpExpires -resetOtp -resetOtpExpires",
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User fetched successfully",
        data: user,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch user",
        error: error.message,
      });
    }
  }

  // Admin-create user:
  async createUser(req, res) {
    try {
      const { name, email, password, phone, role, status } = req.body;

      const existingUser = await User.findOne({ email });

      if (existingUser && !existingUser.isDeleted) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || "customer",
        status: status || "active",
        isEmailVerified: true,
        isDeleted: false,
      });

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to create user",
        error: error.message,
      });
    }
  }

  // Admin-update user:
  async updateUser(req, res) {
    try {
      const { id } = req.params;

      const { name, phone, role, status, avatar } = req.body;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (name !== undefined) {
        user.name = name;
      }

      if (phone !== undefined) {
        user.phone = phone;
      }

      if (role !== undefined) {
        user.role = role;
      }

      if (status !== undefined) {
        user.status = status;
      }

      if (avatar !== undefined) {
        user.avatar = avatar;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update user",
        error: error.message,
      });
    }
  }

  // Admin-change role of user:
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const allowedRoles = ["admin", "agent", "owner", "customer"];

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Allowed roles: admin, agent, owner, customer",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.role = role;

      // Invalidate current session after role change
      user.loginSecret = undefined;
      user.refreshTokenHash = undefined;
      user.refreshTokenExpires = undefined;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "User role updated successfully",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update user role",
        error: error.message,
      });
    }
  }

  // Admin-update user status:
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = ["active", "inactive", "blocked"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Allowed: active, inactive, blocked",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.status = status;

      // If account is disabled,
      // invalidate existing login
      if (status === "inactive" || status === "blocked") {
        user.loginSecret = undefined;
        user.refreshTokenHash = undefined;
        user.refreshTokenExpires = undefined;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: "User status updated successfully",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update user status",
        error: error.message,
      });
    }
  }

  // Admin-delete user:
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent admin from deleting himself
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete user",
        error: error.message,
      });
    }
  }

  // Admin-soft delete user:
  async softDeleteUser(req, res) {
    try {
      const { id } = req.params;

      // Admin cannot delete himself
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      const user = await User.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Soft delete
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.deletedBy = req.user.id;

      // Disable account
      user.status = "inactive";

      // Invalidate login
      user.loginSecret = undefined;
      user.refreshTokenHash = undefined;
      user.refreshTokenExpires = undefined;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete user",
        error: error.message,
      });
    }
  }

  // =================================================

  // Admin get all the properties:
  async getAllProperties(req, res) {
    try {
      const properties = await Property.aggregate([
        {
          $match: {
            isDeleted: {
              $ne: true,
            },
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "agent",
            foreignField: "_id",
            as: "agent",
          },
        },

        {
          $unwind: {
            path: "$owner",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $unwind: {
            path: "$agent",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            "owner.password": 0,
            "owner.loginSecret": 0,
            "owner.refreshTokenHash": 0,

            "agent.password": 0,
            "agent.loginSecret": 0,
            "agent.refreshTokenHash": 0,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        message: "Properties fetched successfully",
        count: properties.length,
        data: properties,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch properties",
        error: error.message,
      });
    }
  }

  // Admin- get property by ID:
  async getPropertyById(req, res) {
    try {
      const { id } = req.params;

      const properties = await Property.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
            isDeleted: {
              $ne: true,
            },
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "agent",
          },
        },

        {
          $unwind: {
            path: "$owner",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $unwind: {
            path: "$agent",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            "owner.password": 0,
            "owner.loginSecret": 0,
            "owner.refreshTokenHash": 0,

            "agent.password": 0,
            "agent.loginSecret": 0,
            "agent.refreshTokenHash": 0,
          },
        },
      ]);

      if (!properties.length) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Property fetched successfully",
        data: properties[0],
      });
    } catch (error) {
      console.error("GET ADMIN PROPERTY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch property",
        error: error.message,
      });
    }
  }

  // Admin-approve property:
  async approveProperty(req, res) {
    try {
      const { id } = req.params;

      const property = await Property.findById(id);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      property.status = "approved";

      property.approvedBy = req.user.id;
      property.approvedAt = new Date();

      await property.save();

      if (property.owner) {
        await createNotification({
          userId: property.owner,
          title: "Property Approved",
          message: `Your prpperty "${property.title}" has been approved`,
          type: "property",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Property approved successfully",
        data: {
          propertyId: property._id,
          status: property.status,
        },
      });
    } catch (error) {
      console.error("APPROVE PROPERTY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to approve property",
        error: error.message,
      });
    }
  }

  // Admin-reject property:
  async rejectProperty(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const property = await Property.findById(id);

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      property.status = "rejected";
      property.rejectionReason = reason || "";

      property.approvedBy = req.user.id;
      property.approvedAt = new Date();

      await property.save();

      if (property.owner) {
        await createNotification({
          userId: property.owner,
          title: "Property Rejected",
          message: `Your property "${property.title}" has been rejected.`,
          type: "property",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Property rejected successfully",
        data: {
          propertyId: property._id,
          status: property.status,
          reason: property.rejectionReason,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to reject property",
        error: error.message,
      });
    }
  }

  //=================================================================

  // Admin-get all inquiries:
  async getAllInquiries(req, res) {
    try {
      const inquiries = await Inquiry.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },

        {
          $lookup: {
            from: "properties",
            localField: "property",
            foreignField: "_id",
            as: "property",
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "agent",
            foreignField: "_id",
            as: "agent",
          },
        },

        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $unwind: {
            path: "$property",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $unwind: {
            path: "$agent",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            "user.password": 0,
            "user.loginSecret": 0,
            "user.refreshTokenHash": 0,

            "agent.password": 0,
            "agent.loginSecret": 0,
            "agent.refreshTokenHash": 0,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        message: "Inquiries fetched successfully",
        count: inquiries.length,
        data: inquiries,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch inquiries",
        error: error.message,
      });
    }
  }

  // Admin- get all appointments:
  async getAllAppointments(req, res) {
    try {
      const appointments = await Appointment.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },

        {
          $lookup: {
            from: "properties",
            localField: "property",
            foreignField: "_id",
            as: "property",
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "agent",
            foreignField: "_id",
            as: "agent",
          },
        },

        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $unwind: {
            path: "$property",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $unwind: {
            path: "$agent",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            "user.password": 0,
            "user.loginSecret": 0,
            "user.refreshTokenHash": 0,

            "agent.password": 0,
            "agent.loginSecret": 0,
            "agent.refreshTokenHash": 0,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        message: "Appointments fetched successfully",
        count: appointments.length,
        data: appointments,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch appointments",
        error: error.message,
      });
    }
  }

  // Admin - view reports:
  async getReports(req, res) {
    try {
      const [
        totalUsers,
        totalAgents,
        totalOwners,
        totalCustomers,
        totalProperties,
        pendingProperties,
        approvedProperties,
        rejectedProperties,
        totalInquiries,
        totalAppointments,
        totalReviews,
      ] = await Promise.all([
        User.countDocuments({
          isDeleted: false,
        }),

        User.countDocuments({
          role: "agent",
          isDeleted: false,
        }),

        User.countDocuments({
          role: "owner",
          isDeleted: false,
        }),

        User.countDocuments({
          role: "customer",
          isDeleted: false,
        }),

        Property.countDocuments({
          isDeleted: {
            $ne: true,
          },
        }),

        Property.countDocuments({
          status: "pending",
          isDeleted: {
            $ne: true,
          },
        }),

        Property.countDocuments({
          status: "approved",
          isDeleted: {
            $ne: true,
          },
        }),

        Property.countDocuments({
          status: "rejected",
          isDeleted: {
            $ne: true,
          },
        }),

        Inquiry.countDocuments(),
        Appointment.countDocuments(),
        Review.countDocuments(),
      ]);

      return res.status(200).json({
        success: true,
        message: "Reports fetched successfully",

        data: {
          users: {
            total: totalUsers,
            agents: totalAgents,
            owners: totalOwners,
            customers: totalCustomers,
          },

          properties: {
            total: totalProperties,
            pending: pendingProperties,
            approved: approvedProperties,
            rejected: rejectedProperties,
          },

          inquiries: {
            total: totalInquiries,
          },

          appointments: {
            total: totalAppointments,
          },

          reviews: {
            total: totalReviews,
          },
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to generate reports",
        error: error.message,
      });
    }
  }

  // Admin-view analytics:
  async getAnalytics(req, res) {
    try {
      const [
        usersByRole,
        propertiesByStatus,
        inquiriesByStatus,
        appointmentsByStatus,
        propertiesByType,
      ] = await Promise.all([
        User.aggregate([
          {
            $match: {
              isDeleted: false,
            },
          },

          {
            $group: {
              _id: "$role",
              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              count: -1,
            },
          },
        ]),

        Property.aggregate([
          {
            $match: {
              isDeleted: {
                $ne: true,
              },
            },
          },

          {
            $group: {
              _id: "$status",
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        Inquiry.aggregate([
          {
            $group: {
              _id: "$status",
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        Appointment.aggregate([
          {
            $group: {
              _id: "$status",
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        Property.aggregate([
          {
            $match: {
              isDeleted: {
                $ne: true,
              },
            },
          },

          {
            $group: {
              _id: "$propertyType",
              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              count: -1,
            },
          },
        ]),
      ]);

      return res.status(200).json({
        success: true,
        message: "Analytics fetched successfully",

        data: {
          usersByRole,
          propertiesByStatus,
          inquiriesByStatus,
          appointmentsByStatus,
          propertiesByType,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
        error: error.message,
      });
    }
  }

  // ================================================================

  // Admin-create category:
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      const existingCategory = await Category.findOne({
        name: name.trim(),
        isDeleted: false,
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category already exists",
        });
      }

      const category = await Category.create({
        name: name.trim(),
        description,
        isDeleted: false,
      });

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error.message,
      });
    }
  }

  // Admin-get all categories:
  async getAllCategories(req, res) {
    try {
      const categories = await Category.find({
        isDeleted: false,
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: "Categories fetched successfully",
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  // Admin = update category:
  async updateCategory(req, res) {
    try {
      const { id } = req.params;

      const { name, description } = req.body;

      const category = await Category.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (name !== undefined) {
        category.name = name.trim();
      }

      if (description !== undefined) {
        category.description = description;
      }

      await category.save();

      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update category",
        error: error.message,
      });
    }
  }

  // Admin = delete category:
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      category.isDeleted = true;
      category.deletedAt = new Date();
      category.deletedBy = req.user.id;

      await category.save();

      return res.status(200).json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("DELETE CATEGORY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete category",
        error: error.message,
      });
    }
  }
}

module.exports = new AuthController();
