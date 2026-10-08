const Owner = require('../../models/ownerModel');
const statuscode = require('../../utils/statuscode');
const cloudinary = require('../../config/cloudinary.config');
const bcryptjs = require('bcryptjs');
const verifyEmailOtp = require('../../utils/sendEmail');
const pagination = require("../../utils/pagination");
class OwnerController{
async createowner(req, res) {
    try {
      const { name, email, password, phone,address } = req.body;

      const existingOwner = await Owner.findOne({
        email,
        isDeleted: false,
      });

      if (existingOwner) {

        if (req.file) {
          await cloudinary.uploader.destroy(req.file.filename);
        }

        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const data = new Owner({
        name,
        email,
        password: hashedPassword,
        phone,
        address,
        role: "owner",
        status: "inactive",
        isEmailVerified: false,
        isDeleted: false,
      });

      if (req.file) {
        data.image = req.file.path;
        data.public_id = req.file.filename;
      }

      const user = await data.save();

      await verifyEmailOtp(req,user,"Owner")

      return res.status(201).json({
        success: true,
        message: "Registration successful. OTP sent to your email.",
        data: user
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

async logout(req, res) {
    try {
      const userId = req.user.id;

      const user = await Owner.findById(userId);

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
async getProfile(req, res) {
    try {
      const user = await Owner.findById(req.user._id)

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

  async updateprofile(req, res) {
      try {
        
        const { name, phone,address } = req.body;
        const profiledatabyid = await Owner.findById(req.user._id);
  
        let image = profiledatabyid.image;
        let public_id = profiledatabyid.public_id;
  
        if (req.file) {
          if (profiledatabyid.public_id) {
            await cloudinary.uploader.destroy(profiledatabyid.public_id);
          }
  
          image = req.file.path;
          public_id = req.file.filename;
        }
  
        const profiledata = await Owner.findByIdAndUpdate(
          {
            _id: req.user._id,
            isDeleted: false,
          },
          { name, phone,image,address },
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

    async changePassword(req, res) {
        try {
          const { currentPassword, newPassword } = req.body;
    
          const user = await Owner.findById(req.user.id);
    
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

async deleteOwner(req, res) {
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

      owner.isDeleted = true;

      // Disable account
      owner.status = "inactive";

      // Invalidate sessions
      owner.loginSecret = undefined;
      owner.refreshTokenHash = undefined;
      owner.refreshTokenExpires = undefined;

      await owner.save();

      return res.status(200).json({
        success: true,
        message: "Owner deleted successfully",
      });

    } catch (error) {
      console.error("DELETE OWNER ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete agent",
        error: error.message,
      });
    }
  }
          


}

module.exports = new OwnerController()