const bcryptjs = require("bcryptjs");
// const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

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
const { transporter, verifyEmailOtp } = require("../../config/sendMail");
const Otp = require("../../models/otpModel");

class AuthController {
  // Registration:
  async register(req, res) {
    try {
      const { name, email, password, phone } = req.body;

      const existingUser = await User.findOne({
        email,
        isDeleted: false,
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const otpdata = generateOTP();

      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      const user = await User.create({
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

      await sendMail(
        email,
        "Real Estate - Email Verification",
        `
        <h2>Welcome ${name}</h2>
        <h2>Password :  ${password}</h2>
        <h2>Role : ${user.role}</h2>


        <p>
          Thank you for registering with our
          Real Estate Management System.
        </p>

        <p>Your email verification OTP is:</p>

        <h1>${otpdata.otp}</h1>

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
  async verify(req, res) {
    try {
      const { email, otp } = req.body;
      // Check if all required fields are provided
      if (!email || !otp) {
        return res.status(400).json({
          status: false,
          message: "All fields are required",
        });
      }
      const existingUser = await User.findOne({ email });

      // Check if email doesn't exists
      if (!existingUser) {
        return res.status(404).json({
          status: "failed",
          message: "User doesn't exists",
        });
      }

      // Check if email is already verified
      if (existingUser.isVerified) {
        return res.status(400).json({
          status: false,
          message: "Email is already verified",
        });
      }
      // Check if there is a matching email verification OTP
      const emailVerification = await Otp.findOne({
        userId: existingUser._id,
        otp,
      });

      if (!emailVerification) {
        if (!existingUser.isVerified) {
          // console.log(existingUser);
          await verifyEmailOtp(req, existingUser);

          return res.status(StatusCode.BAD_REQUEST).json({
            status: false,
            message: "Invalid OTP, new OTP sent to your email",
          });
        }

        return res.status(400).json({
          status: false,
          message: "Invalid OTP",
        });
      }

      // Check if OTP is expired
      const currentTime = new Date();
      // 10 * 60 * 1000 calculates the expiration period in milliseconds(10 minutes).
      const expirationTime = new Date(
        emailVerification.createdAt.getTime() + 10 * 60 * 1000,
      );

      if (currentTime > expirationTime) {
        // OTP expired, send new OTP
        await verifyEmailOTP(req, existingUser);
        return res.status(StatusCode.BAD_REQUEST).json({
          status: "failed",
          message: "OTP expired, new OTP sent to your email",
        });
      }
      // OTP is valid and not expired, mark email as verified
      existingUser.isVerified = true;
      await existingUser.save();

      // Delete email verification document
      await Otp.deleteMany({ userId: existingUser._id });
      return res.status(200).json({
        status: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        message: "Unable to verify email, please try again later",
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
            image: user.image,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
            loginSecret: user.loginSecret,
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
      const { name, phone, image } = req.body;

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

      const user = await UserModel.findOne({
        email,
        isDeleted: false,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const otpdata = generateOTP();

      user.resetOtp = otpdata.otp;

      user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

      await user.save();

      await sendMail(
        email,
        "Real Estate - Password Reset OTP",
        `
        <h2>Password Reset</h2>

        <p>Hello ${user.name},</p>

        <p>Your password reset OTP is:</p>

        <h1>${otpdata.otp}</h1>

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

  // Reset password link:
  async resetPasswordLink(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(StatusCode.BAD_REQUEST).json({
          status: false,
          message: "Email field is required",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(StatusCode.NOT_FOUND).json({
          status: false,
          message: "Email doesn't exist",
        });
      }

      //Generate token for password reset:
      const secret = user._id + process.env.JWT_SECRET_KEY;
      const tokenLink = jwt.sign(
        {
          userId: user._id,
        },
        secret,
        { expiresIn: "40m" },
      );
      console.log(tokenLink);

      // Reset Link and this link generate by frontend developer:
      const resetLink = `${process.env.CLIENT_URL}/account/reset-password-confirm/${user._id}/${tokenLink}`;

      //Send password reset email:
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Password reset link",
        html: `<p>Hello ${user.name},</p><p>Please <a href="${resetLink}">Click here</a> to reset your password.</p>`,
      });

      res.status(200).json({
        status: true,
        message: "Password reset email sent. Please check your email.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Reset password:
  async resetPassword(req, res) {
    try {
      const { password, confirm_password } = req.body;
      const { id, token } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(StatusCode.BAD_REQUEST).json({
          status: false,
          message: "User not found",
        });
      }

      //Validate token check:
      const new_secret = user._id + process.env.JWT_SECRET_KEY;
      jwt.verify(token, new_secret);

      if (!password || !confirm_password) {
        return res.status(400).json({
          status: false,
          message: "New Password and Confirm New Password are required",
        });
      }

      if (password !== confirm_password) {
        return res.status(StatusCode.BAD_REQUEST).json({
          status: false,
          message: "New Password and Confirm New Password don't match",
        });
      }

      // Generate salt and hash new password:
      const salt = await bcryptjs.genSalt(10);
      const newHashPassword = await bcryptjs.hash(password, salt);

      // Update user's password:
      await User.findByIdAndUpdate(user._id, {
        $set: { password: newHashPassword },
      });

      // Send success response:
      res.status(StatusCode.OK).json({
        status: "success",
        message: "Password reset successfully",
      });
    } catch (error) {
      return res.status(StatusCode.SERVER_ERROR).json({
        success: false,
        message: error.message,
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
  async getAllAgents(req, res) {
    try {
      const {
        search,
        status,
        isEmailVerified,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const { page, limit, skip } = pagination(req);

      // FILTER:
      const filter = {
        role: "agent",
        isDeleted: false,
      };

      // Search by name, email or phone
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

      if (status) {
        filter.status = status;
      }

      // Email verification filter
      if (isEmailVerified !== undefined) {
        filter.isEmailVerified = isEmailVerified === "true";
      }

      // SORT:
      const allowedSortFields = [
        "name",
        "email",
        "createdAt",
        "updatedAt",
        "status",
      ];

      const finalSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

      const finalSortOrder = sortOrder === "asc" ? 1 : -1;

      const sort = {
        [finalSortBy]: finalSortOrder,
      };

      const [agents, totalAgents] = await Promise.all([
        Agent.find(filter)
          .select("-password -loginSecret -refreshTokenHash")
          .sort(sort)
          .skip(skip)
          .limit(limit),

        Agent.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalAgents / limit);

      return res.status(200).json({
        success: true,
        message: "Agents fetched successfully",
        pagination: {
          currentPage: page,
          limit,
          totalAgents,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        filters: {
          search: search || "",
          status: status || "",
          isEmailVerified:
            isEmailVerified !== undefined ? isEmailVerified === "true" : null,
          sortBy: finalSortBy,
          sortOrder: finalSortOrder === 1 ? "asc" : "desc",
        },

        agents,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get agents",
        error: error.message,
      });
    }
  }

  // Get agent by ID:
  async getAgentById(req, res) {
    try {
      const { id } = req.params;

      const agent = await Agent.findOne({
        _id: id,
        role: "agent",
        isDeleted: false,
      }).select("-password -loginSecret -refreshTokenHash");

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      return res.status(200).json({
        success: true,
        agent,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get agent",
        error: error.message,
      });
    }
  }

  // Update Agent:
  // async updateAgent(req, res) {
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

  //     const { name, email, phone, image } = req.body;

  //     if (email && email !== agent.email) {
  //       const existingAgent = await Agent.findOne({
  //         email,
  //         _id: { $ne: id },
  //         isDeleted: false,
  //       });

  //       if (existingAgent) {
  //         return res.status(409).json({
  //           success: false,
  //           message: "Email already exists",
  //         });
  //       }
  //     }

  //     const updatedAgent = await Agent.findByIdAndUpdate(
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
  //       message: "Agent updated successfully",
  //       agent: updatedAgent,
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to update agent",
  //       error: error.message,
  //     });
  //   }
  // }

  // Update agent role:
  // async updateAgentRole(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const { role } = req.body;

  //     const allowedRoles = ["agent", "owner", "customer"];

  //     if (!allowedRoles.includes(role)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid role",
  //       });
  //     }

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

  //     agent.role = role;

  //     // Invalidate current sessions after role change
  //     agent.loginSecret = undefined;
  //     agent.refreshTokenHash = undefined;
  //     agent.refreshTokenExpires = undefined;

  //     await agent.save();

  //     return res.status(200).json({
  //       success: true,
  //       message: "Agent role updated successfully",
  //       role: agent.role,
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to update agent role",
  //       error: error.message,
  //     });
  //   }
  // }

  // Update agent status:
  async updateAgentStatus(req, res) {
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

      const agent = await Agent.findById(id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      agent.status = status;

      // If account is disabled,
      // invalidate existing login
      if (status === "inactive" || status === "blocked") {
        agent.loginSecret = undefined;
        agent.refreshTokenHash = undefined;
        agent.refreshTokenExpires = undefined;
      }

      await agent.save();

      return res.status(200).json({
        success: true,
        message: "Agent status updated successfully",
        data: {
          _id: agent._id,
          name: agent.name,
          email: agent.email,
          status: agent.status,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update agent status",
        error: error.message,
      });
    }
  }

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
  async getAllOwners(req, res) {
    try {
      const {
        search,
        status,
        isEmailVerified,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const { page, limit, skip } = pagination(req);

      // FILTER:
      const filter = {
        role: "owner",
        isDeleted: false,
      };

      // Search by name, email or phone
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

      // Status filter
      if (status) {
        filter.status = status;
      }

      // Email verification filter
      if (isEmailVerified !== undefined) {
        filter.isEmailVerified = isEmailVerified === "true";
      }

      // SORT:
      const allowedSortFields = [
        "name",
        "email",
        "createdAt",
        "updatedAt",
        "status",
      ];

      const finalSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

      const finalSortOrder = sortOrder === "asc" ? 1 : -1;

      const sort = {
        [finalSortBy]: finalSortOrder,
      };

      const [owners, totalOwners] = await Promise.all([
        Owner.find(filter)
          .select("-password -loginSecret -refreshTokenHash")
          .sort(sort)
          .skip(skip)
          .limit(limit),

        Owner.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalOwners / limit);

      return res.status(200).json({
        success: true,
        message: "Owners fetched successfully",
        pagination: {
          currentPage: page,
          limit,
          totalOwners,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        filters: {
          search: search || "",
          status: status || "",
          isEmailVerified:
            isEmailVerified !== undefined ? isEmailVerified === "true" : null,
          sortBy: finalSortBy,
          sortOrder: finalSortOrder === 1 ? "asc" : "desc",
        },

        owners,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get owners",
        error: error.message,
      });
    }
  }

  // Get owner by ID:
  async getOwnerById(req, res) {
    try {
      const { id } = req.params;

      const owner = await Owner.findOne({
        _id: id,
        role: "owner",
        isDeleted: false,
      }).select("-password -loginSecret -refreshTokenHash");

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Owner not found",
        });
      }

      return res.status(200).json({
        success: true,
        owner,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get owner",
        error: error.message,
      });
    }
  }

  // Update owner:
  async updateOwner(req, res) {
    try {
      const { id } = req.params;

      const owner = await Owner.findOne({
        _id: id,
        role: "owner",
        isDeleted: false,
      });

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Owner not found",
        });
      }

      const { name, email, phone, image } = req.body;

      if (email && email !== owner.email) {
        const existingOwner = await Owner.findOne({
          email,
          _id: { $ne: id },
          isDeleted: false,
        });

        if (existingOwner) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      const updatedOwner = await Owner.findByIdAndUpdate(
        id,
        {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(image !== undefined && { image }),
        },
        {
          new: true,
          runValidators: true,
        },
      ).select("-password -loginSecret -refreshTokenHash");

      return res.status(200).json({
        success: true,
        message: "Owner updated successfully",
        owner: updatedOwner,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update owner",
        error: error.message,
      });
    }
  }

  // Update owner role:
  // async updateOwnerRole(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const { role } = req.body;

  //     const allowedRoles = ["owner", "agent", "customer"];

  //     if (!allowedRoles.includes(role)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid role",
  //       });
  //     }

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

  //     owner.role = role;

  //     // Invalidate current sessions
  //     owner.loginSecret = undefined;
  //     owner.refreshTokenHash = undefined;
  //     owner.refreshTokenExpires = undefined;

  //     await owner.save();

  //     return res.status(200).json({
  //       success: true,
  //       message: "Owner role updated successfully",
  //       role: owner.role,
  //     });
  //   } catch (error) {
  //     console.error(error);

  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to update owner role",
  //       error: error.message,
  //     });
  //   }
  // }

  // Update owner status:
  async updateOwnerStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatus = ["active", "inactive", "blocked"];

      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const owner = await Owner.findOne({
        _id: id,
        role: "owner",
        isDeleted: false,
      });

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Owner not found",
        });
      }

      owner.status = status;

      if (status !== "active") {
        owner.loginSecret = undefined;
        owner.refreshTokenHash = undefined;
        owner.refreshTokenExpires = undefined;
      }

      await owner.save();

      return res.status(200).json({
        success: true,
        message: "Owner status updated successfully",
        status: owner.status,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update owner status",
        error: error.message,
      });
    }
  }

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
