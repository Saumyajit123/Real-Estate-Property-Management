const bcryptjs = require("bcryptjs");
// const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");
const Agent = require("../../models/agentmodel");
const Owner = require("../../models/ownerModel");
const Property = require("../../models/property");
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
const pagination = require("../../utils/pagination");
const transporter = require("../../config/email.config");
const Otp = require("../../models/otpModel");
const statuscode = require("../../utils/statuscode");
const cloudinary = require("../../config/cloudinary.config");
const verifyEmailOTP = require("../../utils/sendEmail");

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password, phone } = req.body;

      const existingUser = await User.findOne({
        email,
        isDeleted: false,
      });

      if (existingUser) {
        if (req.file) {
          await cloudinary.uploader.destroy(req.file.filename);
        }

        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const otpdata = generateOTP();

      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      const data = new User({
        name,
        email,
        password: hashedPassword,
        phone,
        role: "customer",
        status: "active",
        isEmailVerified: false,
        emailOtp: otpdata.otp,
        emailOtpExpires: otpExpires,
        isDeleted: false,
      });

      if (req.file) {
        data.image = req.file.path;
        data.public_id = req.file.filename;
      }

      const user = await data.save();

      await verifyEmailOTP(req, user,"User");

      return res.status(201).json({
        success: true,
        message: "Registration successful. OTP sent to your email.",
        data: user,
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
  async verify(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // ============================================
      // Find user from all models
      // ============================================

      let existingUser = null;
      let userModel = null;

      // 1. Check User model
      existingUser = await User.findOne({
        email
      });

      if (existingUser) {
        userModel = "User";
      }

      // 2. Check Owner model
      if (!existingUser) {
        existingUser = await Owner.findOne({
          email: normalizedEmail,
        });

        if (existingUser) {
          userModel = "Owner";
        }
      }

      // 3. Check Agent model
      if (!existingUser) {
        existingUser = await Agent.findOne({
          email: normalizedEmail,
        });

        if (existingUser) {
          userModel = "Agent";
        }
      }

      // ============================================
      // User not found
      // ============================================

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User doesn't exist",
        });
      }

      // ============================================
      // Check email already verified
      // ============================================

      if (existingUser.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // ============================================
      // Find OTP
      // ============================================

      const emailVerification = await Otp.findOne({
        userId: existingUser._id,
        userModel: userModel,
        otp: otp,
      });

      // ============================================
      // Invalid OTP
      // ============================================

      if (!emailVerification) {
        await verifyEmailOTP(existingUser, userModel);

        return res.status(400).json({
          success: false,
          message: "Invalid OTP, new OTP sent to your email",
        });
      }

      // ============================================
      // Check OTP expiration
      // ============================================

      const currentTime = new Date();

      const expirationTime = new Date(
        emailVerification.createdAt.getTime() + 10 * 60 * 1000,
      );

      if (currentTime > expirationTime) {
        await verifyEmailOtp(existingUser, userModel);

        return res.status(400).json({
          success: false,
          message: "OTP expired, new OTP sent to your email",
        });
      }

      // ============================================
      // OTP valid
      // ============================================

      existingUser.isEmailVerified = true;

      await existingUser.save();

      // ============================================
      // Delete OTP
      // ============================================

      await Otp.deleteMany({
        userId: existingUser._id,
        userModel: userModel,
      });

      // ============================================
      // Success
      // ============================================

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
        data: {
          email: existingUser.email,
          role: existingUser.role,
          model: userModel,
        },
      });
    } catch (error) {
      console.error("VERIFY EMAIL ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Email verification failed",
        error: error.message,
      });
    }
  }
  async resendEmailOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // ============================================
      // Find user from all models
      // ============================================

      let user = null;
      let userModel = null;

      // User model
      user = await User.findOne({
        email: normalizedEmail,
      });

      if (user) {
        userModel = "User";
      }

      // Owner model
      if (!user) {
        user = await Owner.findOne({
          email: normalizedEmail,
        });

        if (user) {
          userModel = "Owner";
        }
      }

      // Agent model
      if (!user) {
        user = await Agent.findOne({
          email: normalizedEmail,
        });

        if (user) {
          userModel = "Agent";
        }
      }

      // ============================================
      // User not found
      // ============================================

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ============================================
      // Check email verification
      // ============================================

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // ============================================
      // Generate new OTP
      // ============================================

      const otpdata = generateOTP();

      user.emailOtp = otpdata.otp;

      user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

      // ============================================
      // Save user
      // ============================================

      const data = await user.save();

      // ============================================
      // Send OTP email
      // ============================================

      await verifyEmailOTP(req,data,userModel);

      // ============================================
      // Response
      // ============================================

      return res.status(200).json({
        success: true,
        message: "New OTP sent successfully",
        data: {
          email: data.email,
          role: data.role,
          model: userModel,
        },
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
  async login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ------------------------------------------------
    // 1. Find user from different models
    // ------------------------------------------------

    let user = null;
    let modelName = null;

    // Check User model
    user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    }).select("+password +loginSecret +refreshTokenHash");

    if (user) {
      modelName = "User";
    }

    // If not found, check Owner model
    if (!user) {
      user = await Owner.findOne({
        email: email.toLowerCase(),
      }).select("+password +loginSecret +refreshTokenHash");

      if (user) {
        modelName = "Owner";
      }
    }

    // If you have Agent model, you can add:
    
    if (!user) {
      user = await Agent.findOne({
        email: email.toLowerCase(),
      }).select("+password +loginSecret +refreshTokenHash");

      if (user) {
        modelName = "Agent";
      }
    }
    

    // ------------------------------------------------
    // 2. User not found
    // ------------------------------------------------

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ------------------------------------------------
    // 3. Check email verification
    // ------------------------------------------------

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    // ------------------------------------------------
    // 4. Check account status
    // ------------------------------------------------

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    // ------------------------------------------------
    // 5. Check password
    // ------------------------------------------------

    const isPasswordCorrect = await bcryptjs.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ------------------------------------------------
    // 6. Generate login secret
    // ------------------------------------------------

    const loginSecret = generateLoginSecret();

    user.loginSecret = loginSecret;

    // ------------------------------------------------
    // 7. Generate tokens
    // ------------------------------------------------

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    // ------------------------------------------------
    // 8. Hash refresh token
    // ------------------------------------------------

    const refreshTokenHash = await bcryptjs.hash(
      refreshToken,
      10
    );

    user.refreshTokenHash = refreshTokenHash;

    user.refreshTokenExpires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    // ------------------------------------------------
    // 9. Save login information
    // ------------------------------------------------

    await user.save();

    // ------------------------------------------------
    // 10. Response
    // ------------------------------------------------

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
          image: user.image || user.profileImage || null,
          status: user.status,
          isEmailVerified: user.isEmailVerified,

          // You can remove this from production response
          // loginSecret: user.loginSecret,
        },

        model: modelName,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
}


async logout(req, res) {
  try {
    // ------------------------------------------------
    // 1. Get logged-in user information
    // ------------------------------------------------

    const userId = req.user.id;
    const role = req.user.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ------------------------------------------------
    // 2. Find user from the correct model
    // ------------------------------------------------

    let user = null;

    if (role === "user" || role === "customer" || role === "admin") {
      user = await User.findById(userId);
    } else if (role === "owner") {
      user = await Owner.findById(userId);
    } else if (role === "agent") {
      user = await Agent.findById(userId);
    }

    // ------------------------------------------------
    // 3. User not found
    // ------------------------------------------------

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ------------------------------------------------
    // 4. Clear login information
    // ------------------------------------------------

    user.loginSecret = null;
    user.refreshTokenHash = null;
    user.refreshTokenExpires = null;

    // ------------------------------------------------
    // 5. Save changes
    // ------------------------------------------------

    await user.save();

    // ------------------------------------------------
    // 6. Clear cookies
    // ------------------------------------------------

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // ------------------------------------------------
    // 7. Response
    // ------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });

  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
}


  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id).select(
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
  async updateprofile(req, res) {
    try {
      const { name, phone } = req.body;
      const profiledatabyid = await User.findById(req.user._id);

      let image = profiledatabyid.image;
      let public_id = profiledatabyid.public_id;

      if (req.file) {
        if (profiledatabyid.public_id) {
          await cloudinary.uploader.destroy(profiledatabyid.public_id);
        }

        image = req.file.path;
        public_id = req.file.filename;
      }

      const profiledata = await User.findByIdAndUpdate(
        {
          _id: req.user._id,
          isDeleted: false,
        },
        { name, phone, image },
        { new: true },
      );

      if (!profiledata && profiledata.length === 0) {
        return res.status(statuscode.NOT_FOUND).json({
          success: false,
          message: "no product available",
        });
      } else {
        return res.status(statuscode.OK).json({
          success: true,
          data: profiledata,
        });
      }
    } catch (error) {
      return res.status(statuscode.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Change password:

async changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    // ------------------------------------------------
    // 1. Validate request body
    // ------------------------------------------------

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // ------------------------------------------------
    // 2. Get logged-in user information
    // ------------------------------------------------

    const userId = req.user.id;
    const role = req.user.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ------------------------------------------------
    // 3. Find user from the correct model
    // ------------------------------------------------

    let user = null;
    let modelName = null;

    // User / Customer / Admin
    if (
      role === "user" ||
      role === "customer" ||
      role === "admin"
    ) {
      user = await User.findById(userId).select(
        "+password +loginSecret +refreshTokenHash +refreshTokenExpires"
      );

      if (user) {
        modelName = "User";
      }
    }

    // Owner
    if (!user && role === "owner") {
      user = await Owner.findById(userId).select(
        "+password +loginSecret +refreshTokenHash +refreshTokenExpires"
      );

      if (user) {
        modelName = "Owner";
      }
    }

    // Agent
    if (!user && role === "agent") {
      user = await Agent.findById(userId).select(
        "+password +loginSecret +refreshTokenHash +refreshTokenExpires"
      );

      if (user) {
        modelName = "Agent";
      }
    }

    // ------------------------------------------------
    // 4. User not found
    // ------------------------------------------------

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ------------------------------------------------
    // 5. Check current password
    // ------------------------------------------------

    const isCorrect = await bcryptjs.compare(
      currentPassword,
      user.password
    );

    if (!isCorrect) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // ------------------------------------------------
    // 6. Check new password
    // ------------------------------------------------

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // ------------------------------------------------
    // 7. Hash new password
    // ------------------------------------------------

    user.password = await bcryptjs.hash(newPassword, 10);

    // ------------------------------------------------
    // 8. Invalidate all existing sessions
    // ------------------------------------------------

    user.loginSecret = undefined;
    user.refreshTokenHash = undefined;
    user.refreshTokenExpires = undefined;

    // ------------------------------------------------
    // 9. Save user
    // ------------------------------------------------

    await user.save();

    // ------------------------------------------------
    // 10. Response
    // ------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
      data: {
        model: modelName,
        userId: user._id,
      },
    });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
}


  // Reset password link:
  async resetPasswordLink(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(statuscode.BAD_REQUEST).json({
        success: false,
        message: "Email field is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ============================================
    // Find user from all models
    // ============================================

    let user = null;
    let userModel = null;

    // 1. User model
    user = await User.findOne({
      email: normalizedEmail,
    });

    if (user) {
      userModel = "User";
    }

    // 2. Owner model
    if (!user) {
      user = await Owner.findOne({
        email: normalizedEmail,
      });

      if (user) {
        userModel = "Owner";
      }
    }

    // 3. Agent model
    if (!user) {
      user = await Agent.findOne({
        email: normalizedEmail,
      });

      if (user) {
        userModel = "Agent";
      }
    }

    // ============================================
    // Account not found
    // ============================================

    if (!user) {
      return res.status(statuscode.NOT_FOUND).json({
        success: false,
        message: "Email doesn't exist",
      });
    }

    // ============================================
    // Generate password reset token
    // ============================================

    const secret =
      user._id.toString() + process.env.JWT_SECRET_KEY;

    const tokenLink = jwt.sign(
      {
        userId: user._id,
        userModel: userModel,
      },
      secret,
      {
        expiresIn: "40m",
      }
    );

    console.log("RESET TOKEN:", tokenLink);

    // ============================================
    // Reset password link
    // ============================================

    const resetLink =
      `${process.env.CLIENT_URL}` +
      `/account/reset-password-confirm/` +
      `${user._id}/` +
      `${tokenLink}`;

    // ============================================
    // Send email
    // ============================================

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: "Password reset link",

      html: `
        <p>Hello ${user.name},</p>

        <p>
          We received a request to reset your password.
        </p>

        <p>
          Please
          <a href="${resetLink}">
            Click here
          </a>
          to reset your password.
        </p>

        <p>
          This password reset link will expire in 40 minutes.
        </p>

        <p>
          If you did not request a password reset,
          please ignore this email.
        </p>
      `,
    });

    // ============================================
    // Response
    // ============================================

    return res.status(200).json({
      success: true,
      message: "Password reset email sent. Please check your email.",
    });

  } catch (error) {
    console.error("RESET PASSWORD LINK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
      error: error.message,
    });
  }
}

  // Reset password:
  async resetPassword(req, res) {
  try {
    const { password, confirm_password } = req.body;
    const { id, token } = req.params;

    // ============================================
    // Validate password fields
    // ============================================

    if (!password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message:
          "New Password and Confirm New Password are required",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message:
          "New Password and Confirm New Password don't match",
      });
    }

    // ============================================
    // Decode token first
    // ============================================

    let decodedToken;

    try {
      // We don't know the model yet, so first decode
      // the token without verifying it.
      decodedToken = jwt.decode(token);

      if (!decodedToken || !decodedToken.userModel) {
        return res.status(400).json({
          success: false,
          message: "Invalid password reset token",
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset token",
      });
    }

    const { userModel } = decodedToken;

    // ============================================
    // Select correct model
    // ============================================

    let Model;

    if (userModel === "User") {
      Model = User;
    } else if (userModel === "Owner") {
      Model = Owner;
    } else if (userModel === "Agent") {
      Model = Agent;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user model",
      });
    }

    // ============================================
    // Find user
    // ============================================

    const user = await Model.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ============================================
    // Verify reset token
    // ============================================

    const new_secret =
      user._id.toString() + process.env.JWT_SECRET_KEY;

    try {
      const verifiedToken = jwt.verify(
        token,
        new_secret
      );

      // Make sure token belongs to same user
      if (
        verifiedToken.userId.toString() !==
        user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid password reset token",
        });
      }

      // Make sure token belongs to same model
      if (verifiedToken.userModel !== userModel) {
        return res.status(400).json({
          success: false,
          message: "Invalid password reset token",
        });
      }

    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          message: "Password reset link has expired",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid password reset token",
      });
    }

    // ============================================
    // Hash new password
    // ============================================

    const salt = await bcryptjs.genSalt(10);

    const newHashPassword = await bcryptjs.hash(
      password,
      salt
    );

    // ============================================
    // Update password
    // ============================================

    await Model.findByIdAndUpdate(
      user._id,
      {
        $set: {
          password: newHashPassword,
        },
      },
      {
        new: true,
      }
    );

    // ============================================
    // Success
    // ============================================

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: error.message,
    });
  }
}

  // ======================== USERS =====================================

  // Admin-get all users:
  async getAllUsers(req, res) {
    try {
      const {
        search,
        role,
        status,
        isEmailVerified,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const { page, limit, skip } = pagination(req);

      // const users = await User.find()
      //   .select(
      //     "-password -loginSecret -refreshTokenHash -emailOtp -emailOtpExpires -resetOtp -resetOtpExpires",
      //   )
      //   .sort({ createdAt: -1 });

      const filter = { isDeleted: false };

      // Search by name, email, phone:
      if (search) {
        filter.$or = [
          {
            name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            email: {
              $regex: search,
              $options: "i",
            },
          },
          {
            phone: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      // Filter by role:
      if (role) filter.role = role;

      // Filter by status:
      if (status) filter.status = status;

      // Filter by email verification:
      if (isEmailVerified !== undefined)
        filter.isEmailVerified = isEmailVerified === "true";

      // SORT:
      const allowedSortFields = [
        "name",
        "email",
        "createdAt",
        "updatedAt",
        "status",
        "role",
      ];

      const finalSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

      const finalSortOrder = sortOrder === "asc" ? 1 : -1;

      const sort = {
        [finalSortBy]: finalSortOrder,
      };

      const [users, totalUsers] = await Promise.all([
        User.find(filter)
          .select("-password -loginSecret -refreshTokenHash")
          .sort(sort)
          .skip(skip)
          .limit(limit),

        User.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalUsers / limit);

      return res.status(200).json({
        success: true,
        message: "Users fetched successfully",
        count: users.length,
        data: users,
        pagination: {
          currentPage: page,
          limit,
          totalUsers,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        filters: {
          search: search || "",
          role: role || "",
          status: status || "",
          isEmailVerified:
            isEmailVerified !== undefined ? isEmailVerified === "true" : null,
          sortBy: finalSortBy,
          sortOrder: finalSortOrder === 1 ? "asc" : "desc",
        },
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
  // async createUser(req, res) {
  //   try {
  //     const { name, email, password, phone, role, status } = req.body;

  //     const existingUser = await User.findOne({ email });

  //     if (existingUser && !existingUser.isDeleted) {
  //       return res.status(409).json({
  //         success: false,
  //         message: "User with this email already exists",
  //       });
  //     }

  //     const hashedPassword = await bcryptjs.hash(password, 10);

  //     const user = await User.create({
  //       name,
  //       email,
  //       password: hashedPassword,
  //       phone,
  //       role: role || "customer",
  //       status: status || "active",
  //       isEmailVerified: true,
  //       isDeleted: false,
  //     });

  //     return res.status(201).json({
  //       success: true,
  //       message: "User created successfully",
  //       data: {
  //         _id: user._id,
  //         name: user.name,
  //         email: user.email,
  //         phone: user.phone,
  //         role: user.role,
  //         status: user.status,
  //         isEmailVerified: user.isEmailVerified,
  //       },
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to create user",
  //       error: error.message,
  //     });
  //   }
  // }

  // Admin-update user:
  // async updateUser(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const user = await UserModel.findOne({
  //       _id: id,
  //       isDeleted: false,
  //     });

  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "User not found",
  //       });
  //     }

  //     const { name, email, phone, image } = req.body;

  //     // Check duplicate email
  //     if (email && email !== user.email) {
  //       const existingUser = await UserModel.findOne({
  //         email,
  //         _id: { $ne: id },
  //         isDeleted: false,
  //       });

  //       if (existingUser) {
  //         return res.status(409).json({
  //           success: false,
  //           message: "Email already exists",
  //         });
  //       }
  //     }

  //     const updatedUser = await User.findByIdAndUpdate(
  //       id,
  //       {
  //         ...(name !== undefined && { name }),
  //         ...(email !== undefined && { email }),
  //         ...(phone !== undefined && { phone }),
  //         ...(image !== undefined && { image }),
  //       },
  //       {
  //         new: true,
  //         runValidators: true,
  //       },
  //     ).select("-password -loginSecret -refreshTokenHash");

  //     return res.status(200).json({
  //       success: true,
  //       message: "User updated successfully",
  //       user: updatedUser,
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to update user",
  //       error: error.message,
  //     });
  //   }
  // }

  // Admin-change role of user:
  // async updateUserRole(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const { role } = req.body;

  //     const allowedRoles = ["admin", "agent", "owner", "customer"];

  //     if (!allowedRoles.includes(role)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid role. Allowed roles: admin, agent, owner, customer",
  //       });
  //     }

  //     const user = await User.findById(id);

  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "User not found",
  //       });
  //     }

  //     user.role = role;

  //     // Invalidate current session after role change
  //     user.loginSecret = undefined;
  //     user.refreshTokenHash = undefined;
  //     user.refreshTokenExpires = undefined;

  //     await user.save();

  //     return res.status(200).json({
  //       success: true,
  //       message: "User role updated successfully",
  //       data: {
  //         _id: user._id,
  //         name: user.name,
  //         email: user.email,
  //         role: user.role,
  //       },
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to update user role",
  //       error: error.message,
  //     });
  //   }
  // }

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

  async deleteUser(req, res) {
      try {
        const { id } = req.params;
  
        const user = await User.findOne({
          _id: id,
          role: "customer",
          isDeleted: false,
        });
  
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "Owner not found",
          });
        }
  
        user.isDeleted = true;
  
        // Disable account
        user.status = "inactive";
  
        // Invalidate sessions
        user.loginSecret = undefined;
        user.refreshTokenHash = undefined;
        user.refreshTokenExpires = undefined;
  
        await user.save();
  
        return res.status(200).json({
          success: true,
          message: "User deleted successfully",
        });
  
      } catch (error) {
        console.error("DELETE USER ERROR:", error);
  
        return res.status(500).json({
          success: false,
          message: "Failed to delete user",
          error: error.message,
        });
      }
    }

  // Admin-delete user:
  // async deleteUser(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const user = await UserModel.findOne({
  //       _id: id,
  //       isDeleted: false,
  //     });

  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "User not found",
  //       });
  //     }

  //     await UserModel.findByIdAndDelete(id);

  //     return res.status(200).json({
  //       success: true,
  //       message: "User deleted successfully",
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to delete user",
  //       error: error.message,
  //     });
  //   }
  // }

  // Admin-soft delete user:
  // async softDeleteUser(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const user = await UserModel.findOne({
  //       _id: id,
  //       isDeleted: false,
  //     });

  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "User not found",
  //       });
  //     }

  //     await UserModel.findByIdAndUpdate(
  //       id,
  //       {
  //         isDeleted: true,
  //         deletedAt: new Date(),
  //         deletedBy: req.user._id,
  //       },
  //       {
  //         new: true,
  //         runValidators: true,
  //       },
  //     );

  //     return res.status(200).json({
  //       success: true,
  //       message: "User soft deleted successfully",
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to soft delete user",
  //       error: error.message,
  //     });
  //   }
  // }

  // ========================== AGENTS ========================================

  // Get all agents:

  // Get agent by ID:

  // Delete Agent:
  // async deleteAgent(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const agent = await Agent.findOne({
  //       _id: id,
  //       role: "agent",
  //       isDeleted: false,
  //     });

  //     if (!agent) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Agent not found",
  //       });
  //     }

  //     await Agent.findByIdAndDelete(id);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Agent deleted successfully",
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to delete agent",
  //       error: error.message,
  //     });
  //   }
  // }

  // Agent soft-delete:
  // async softDeleteAgent(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const agent = await Agent.findOne({
  //       _id: id,
  //       role: "agent",
  //       isDeleted: false,
  //     });

  //     if (!agent) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Agent not found",
  //       });
  //     }

  //     await Agent.findByIdAndUpdate(
  //       id,
  //       {
  //         isDeleted: true,
  //         deletedAt: new Date(),
  //         deletedBy: req.user._id,
  //       },
  //       {
  //         new: true,
  //         runValidators: true,
  //       },
  //     );

  //     return res.status(200).json({
  //       success: true,
  //       message: "Agent soft deleted successfully",
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to soft delete agent",
  //       error: error.message,
  //     });
  //   }
  // }

  // =========================== OWNERS ======================================

  // Get all owners:

  // Delete owner:
  // async deleteOwner(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const owner = await Owner.findOne({
  //       _id: id,
  //       role: "owner",
  //       isDeleted: false,
  //     });

  //     if (!owner) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Owner not found",
  //       });
  //     }

  //     await Owner.findByIdAndDelete(id);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Owner deleted successfully",
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to delete owner",
  //       error: error.message,
  //     });
  //   }
  // }

  // Soft-delete owner:
  // async softDeleteOwner(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const owner = await Owner.findOne({
  //       _id: id,
  //       role: "owner",
  //       isDeleted: false,
  //     });

  //     if (!owner) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Owner not found",
  //       });
  //     }

  //     await Owner.findByIdAndUpdate(
  //       id,
  //       {
  //         isDeleted: true,
  //         deletedAt: new Date(),
  //         deletedBy: req.user._id,
  //       },
  //       {
  //         new: true,
  //         runValidators: true,
  //       },
  //     );

  //     return res.status(200).json({
  //       success: true,
  //       message: "Owner soft deleted successfully",
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to soft delete owner",
  //       error: error.message,
  //     });
  //   }
  // }

  // =============================== PROPERTY =====================================

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

  //============================ INQUIRY =====================================

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

  // ============================ APPOINTMENTS ===============================

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

  // ============================ REPORTS ====================================

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

  // ============================ ANALYTICTS =================================

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

  // =========================== CATEGORY =====================================

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
