const bcryptjs = require("bcryptjs");
const Agent = require("../../models/agentmodel");
const cloudinary = require("../../config/cloudinary.config");
const  verifyEmailOtp  = require("../../utils/sendEmail");
const pagination  = require("../../utils/pagination");

class AgentController  {

  // =====================================================
  // CREATE AGENT
  // =====================================================

  async createAgent(req, res) {
  try {
    console.log("========== CREATE AGENT ==========");
    console.log("req.body:", req.body);

    const {
      name,
      email,
      password,
      phone,
      licenseNumber,
      agencyName,
      experience,
      specialization,
      bio,
      address,
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // ==========================================
    // 4. Check existing agent by email
    // ==========================================

    const existingAgent = await Agent.findOne({
      email: normalizedEmail,
      isDeleted: false,
    });

    if (existingAgent) {
      // Delete uploaded image if agent already exists
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }

      return res.status(409).json({
        success: false,
        message: "Agent with this email already exists",
      });
    }

    // ==========================================
    // 5. Check license number
    // ==========================================

    if (licenseNumber) {
      const existingLicense = await Agent.findOne({
        licenseNumber,
        isDeleted: false,
      });

      if (existingLicense) {
        if (req.file) {
          await cloudinary.uploader.destroy(req.file.filename);
        }

        return res.status(409).json({
          success: false,
          message: "Agent with this license number already exists",
        });
      }
    }

    // ==========================================
    // 6. Hash password
    // ==========================================

    const hashedPassword = await bcryptjs.hash(password, 10);

    // ==========================================
    // 7. Create agent
    // ==========================================

    const agentData = new Agent({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,

      licenseNumber,
      agencyName,
      experience,

      // Now this is an actual array
      specialization,

      bio,

      // Now this is an actual object
      address,

      role: "agent",

      // Agent cannot login until verification
      status: "inactive",

      isEmailVerified: false,
      isDeleted: false,
    });

    // ==========================================
    // 8. Upload profile image
    // ==========================================

    if (req.file) {
      agentData.image = req.file.path;
      agentData.public_id = req.file.filename;
    }

    // ==========================================
    // 9. Save agent
    // ==========================================

    const agent = await agentData.save();

    // ==========================================
    // 10. Send verification OTP
    // ==========================================

    await verifyEmailOtp(req, agent, "Agent");

    // ==========================================
    // 11. Response
    // ==========================================

    return res.status(201).json({
      success: true,
      message: "Agent registration successful. OTP sent to your email.",
      data: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        role: agent.role,
        status: agent.status,
        isEmailVerified: agent.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("CREATE AGENT ERROR:", error);

    // If something failed after uploading the image,
    // remove the Cloudinary image
    if (req.file) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (cloudinaryError) {
        console.error(
          "CLOUDINARY CLEANUP ERROR:",
          cloudinaryError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Agent registration failed",
      error: error.message,
    });
  }
}


  // =====================================================
  // LOGOUT
  // =====================================================

  async logout(req, res) {
    try {
      const userId = req.user._id;

      const agent = await Agent.findById(userId);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      // Destroy login credentials
      agent.loginSecret = undefined;
      agent.refreshTokenHash = undefined;
      agent.refreshTokenExpires = undefined;

      await agent.save();

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });

    } catch (error) {
      console.error("AGENT LOGOUT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Logout failed",
        error: error.message,
      });
    }
  }


  // =====================================================
  // GET PROFILE
  // =====================================================

  async getProfile(req, res) {
    try {
      const agent = await Agent.findOne({
        _id: req.user._id,
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
        message: "Profile fetched successfully",
        data: agent,
      });

    } catch (error) {
      console.error("GET AGENT PROFILE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: error.message,
      });
    }
  }


  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  async updateProfile(req, res) {
    try {
      const {
        name,
        phone,
        licenseNumber,
        agencyName,
        experience,
        specialization,
        bio,
        address,
      } = req.body;

      const agent = await Agent.findOne({
        _id: req.user._id,
        isDeleted: false,
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      let image = agent.image;
      let public_id = agent.public_id;

      // New image uploaded
      if (req.file) {

        // Delete old image
        if (agent.public_id) {
          await cloudinary.uploader.destroy(agent.public_id);
        }

        image = req.file.path;
        public_id = req.file.filename;
      }

      // Update fields
      agent.name = name ?? agent.name;
      agent.phone = phone ?? agent.phone;

      agent.licenseNumber =
        licenseNumber ?? agent.licenseNumber;

      agent.agencyName =
        agencyName ?? agent.agencyName;

      agent.experience =
        experience ?? agent.experience;

      agent.specialization =
        specialization ?? agent.specialization;

      agent.bio =
        bio ?? agent.bio;

      agent.address =
        address ?? agent.address;

      agent.image = image;
      agent.public_id = public_id;

      await agent.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: agent,
      });

    } catch (error) {
      console.error("UPDATE AGENT PROFILE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
      });
    }
  }


  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  async changePassword(req, res) {
    try {
      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Current password and new password are required",
        });
      }

      // password has select:false in schema
      const agent = await Agent.findOne({
        _id: req.user._id,
        isDeleted: false,
      }).select("+password");

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      // Check current password
      const isCorrect = await bcryptjs.compare(
        currentPassword,
        agent.password
      );

      if (!isCorrect) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      agent.password = await bcryptjs.hash(
        newPassword,
        10
      );

      // Invalidate all sessions
      agent.loginSecret = undefined;
      agent.refreshTokenHash = undefined;
      agent.refreshTokenExpires = undefined;

      await agent.save();

      return res.status(200).json({
        success: true,
        message:
          "Password changed successfully. Please login again.",
      });

    } catch (error) {
      console.error("CHANGE AGENT PASSWORD ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to change password",
        error: error.message,
      });
    }
  }


  // =====================================================
  // GET ALL AGENTS
  // =====================================================

  async getAllAgents(req, res) {
    try {
      const {
        search,
        status,
        isEmailVerified,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const {
        page,
        limit,
        skip,
      } = pagination(req);

      // Base filter
      const filter = {
        role: "agent",
        isDeleted: false,
      };

      // Search
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
          {
            agencyName: {
              $regex: search,
              $options: "i",
            },
          },
          {
            licenseNumber: {
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
        filter.isEmailVerified =
          isEmailVerified === "true";
      }

      // Allowed sorting fields
      const allowedSortFields = [
        "name",
        "email",
        "phone",
        "agencyName",
        "experience",
        "createdAt",
        "updatedAt",
        "status",
      ];

      const finalSortBy =
        allowedSortFields.includes(sortBy)
          ? sortBy
          : "createdAt";

      const finalSortOrder =
        sortOrder === "asc" ? 1 : -1;

      const sort = {
        [finalSortBy]: finalSortOrder,
      };

      // Get agents + total count
      const [agents, totalAgents] =
        await Promise.all([
          Agent.find(filter)
            .select(
              "-password -loginSecret -refreshTokenHash"
            )
            .sort(sort)
            .skip(skip)
            .limit(limit),

          Agent.countDocuments(filter),
        ]);

      const totalPages =
        Math.ceil(totalAgents / limit);

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
            isEmailVerified !== undefined
              ? isEmailVerified === "true"
              : null,

          sortBy: finalSortBy,

          sortOrder:
            finalSortOrder === 1
              ? "asc"
              : "desc",
        },

        agents,
      });

    } catch (error) {
      console.error("GET ALL AGENTS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get agents",
        error: error.message,
      });
    }
  }


  // =====================================================
  // GET AGENT BY ID
  // =====================================================

  async getAgentById(req, res) {
    try {
      const { id } = req.params;

      const agent = await Agent.findOne({
        _id: id,
        role: "agent",
        isDeleted: false,
      }).select(
        "-password -loginSecret -refreshTokenHash"
      );

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Agent fetched successfully",
        data: agent,
      });

    } catch (error) {
      console.error("GET AGENT BY ID ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to get agent",
        error: error.message,
      });
    }
  }


  // =====================================================
  // UPDATE AGENT STATUS
  // =====================================================

  async updateAgentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatus = [
        "active",
        "inactive",
        "blocked",
      ];

      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Allowed values: active, inactive, blocked",
        });
      }

      const agent = await Agent.findOne({
        _id: id,
        role: "agent",
        isDeleted: false,
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      agent.status = status;

      // If agent is disabled, invalidate sessions
      if (status !== "active") {
        agent.loginSecret = undefined;
        agent.refreshTokenHash = undefined;
        agent.refreshTokenExpires = undefined;
      }

      await agent.save();

      return res.status(200).json({
        success: true,
        message: "Agent status updated successfully",
        status: agent.status,
      });

    } catch (error) {
      console.error("UPDATE AGENT STATUS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update agent status",
        error: error.message,
      });
    }
  }


  // =====================================================
  // DELETE AGENT - SOFT DELETE
  // =====================================================

  async deleteAgent(req, res) {
    try {
      const { id } = req.params;

      const agent = await Agent.findOne({
        _id: id,
        role: "agent",
        isDeleted: false,
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      agent.isDeleted = true;

      // Disable account
      agent.status = "inactive";

      // Invalidate sessions
      agent.loginSecret = undefined;
      agent.refreshTokenHash = undefined;
      agent.refreshTokenExpires = undefined;

      await agent.save();

      return res.status(200).json({
        success: true,
        message: "Agent deleted successfully",
      });

    } catch (error) {
      console.error("DELETE AGENT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete agent",
        error: error.message,
      });
    }
  }
};

module.exports =new AgentController();