const RentalApplication = require("../../models/rentalApplicationModel");
const Property = require("../../models/property");
const User = require("../../models/userModel");

class RentalApplicationController {
  async createRentalApplication(req, res) {
    try {
      const {
        property,
        monthlyIncome,
        employmentStatus,
        occupation,
        documents,
        message,
      } = req.body;

      // Only customer can apply
      if (req.user.role !== "customer") {
        return res.status(403).json({
          success: false,
          message: "Only customers can create rental applications",
        });
      }

      // Check property
      const propertyData = await Property.findOne({
        _id: property,
        isDeleted: false,
      });

      if (!propertyData) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      // Property must be for rent
      if (propertyData.purpose !== "Rent") {
        return res.status(400).json({
          success: false,
          message: "Rental application can only be created for rental properties",
        });
      }

      // Property must be approved
      if (propertyData.approvalStatus !== "Approved") {
        return res.status(400).json({
          success: false,
          message: "Property is not approved for rental",
        });
      }

      // Property should not already be rented
      if (propertyData.status === "Rented") {
        return res.status(409).json({
          success: false,
          message: "Property is already rented",
        });
      }

      // Check applicant
      const applicant = await User.findOne({
        _id: req.user._id,
        isDeleted: false,
      }).select("_id name email role");

      if (!applicant) {
        return res.status(404).json({
          success: false,
          message: "Applicant not found",
        });
      }

      // Check if customer already has active application
      const existingApplication = await RentalApplication.findOne({
        property: propertyData._id,
        applicant: req.user._id,
        status: {
          $in: ["pending", "approved"],
        },
      });

      if (existingApplication) {
        return res.status(409).json({
          success: false,
          message:
            "You already have a pending or approved application for this property",
        });
      }

      // Create application
      const application = await RentalApplication.create({
        property: propertyData._id,
        applicant: req.user._id,
        owner: propertyData.owner,
        agent: propertyData.agentId || null,
        monthlyIncome: monthlyIncome || 0,
        employmentStatus: employmentStatus || "",
        occupation: occupation || "",
        documents: documents || [],
        message: message || "",
        status: "pending",
      });

      return res.status(201).json({
        success: true,
        message: "Rental application submitted successfully",
        data: application,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to create rental application",
        error: error.message,
      });
    }
  }

  async updateRentalApplication(req, res) {
  try {
    const { id } = req.params;

    const {
      monthlyIncome,
      employmentStatus,
      occupation,
      documents,
      message,
    } = req.body;

    const application = await RentalApplication.findOne({
      _id: id,
      applicant: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Rental application not found",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending rental applications can be updated",
      });
    }

    const updatedApplication =
      await RentalApplication.findByIdAndUpdate(
        id,
        {
          $set: {
            monthlyIncome,
            employmentStatus,
            occupation,
            documents,
            message,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message: "Rental application updated successfully",
      data: updatedApplication,
    });
  } catch (error) {
    console.error("UPDATE RENTAL APPLICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update rental application",
      error: error.message,
    });
  }
}


  async getMyRentalApplications(req, res) {
    try {
      const applications = await RentalApplication.find({
        applicant: req.user._id,
      })
        .populate({
          path: "property",
          select:
            "title description propertyType purpose price area bedrooms bathrooms furnishingStatus images status approvalStatus location amenities",
        })
        .populate({
          path: "owner",
          select: "name email phone",
        })
        .populate({
          path: "agent",
          select: "name email phone",
        })
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: applications.length,
        data: applications,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get rental applications",
        error: error.message,
      });
    }
  }

  async getRentalApplicationById(req, res) {
    try {
      const { id } = req.params;

      const application = await RentalApplication.findById(id)
        .populate({
          path: "property",
          select:
            "title description propertyType purpose price area bedrooms bathrooms furnishingStatus images status approvalStatus location amenities",
        })
        .populate({
          path: "applicant",
          select: "name email phone",
        })
        .populate({
          path: "owner",
          select: "name email phone",
        })
        .populate({
          path: "agent",
          select: "name email phone",
        });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Rental application not found",
        });
      }

      // Customer can only see own application
      if (
        req.user.role === "customer" &&
        application.applicant._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this application",
        });
      }

      // Owner can only see applications for his properties
      if (
        req.user.role === "owner" &&
        application.owner._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this application",
        });
      }

      // Agent can only see assigned applications
      if (req.user.role === "agent") {
        if (
          !application.agent ||
          application.agent._id.toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view this application",
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get rental application",
        error: error.message,
      });
    }
  }

  async getOwnerRentalApplications(req, res) {
  try {
    // 1. Find owner's properties that have NO agent assigned
    const properties = await Property.find({
      owner: req.user._id,
      isDeleted: false,
      $or: [
        { agentId: null },
        { agentId: { $exists: false } },
      ],
    }).select("_id");

    const propertyIds = properties.map((property) => property._id);

    // 2. If owner has no direct properties
    if (propertyIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // 3. Get rental applications only for those properties
    const applications = await RentalApplication.find({
      owner: req.user._id,
      property: { $in: propertyIds },
    })
      .populate({
        path: "property",
        select:
          "title description propertyType purpose price area bedrooms bathrooms furnishingStatus images status approvalStatus location amenities agentId",
      })
      .populate({
        path: "applicant",
        select: "name email phone",
      })
      .populate({
        path: "agent",
        select: "name email phone",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("GET OWNER RENTAL APPLICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get owner rental applications",
      error: error.message,
    });
  }
}

  
async getAgentRentalApplications(req, res) {
  try {
    const applications = await RentalApplication.find({
      agent: req.user._id,
    })
      .populate({
        path: "property",
        select:
          "title description propertyType purpose price area bedrooms bathrooms furnishingStatus images status approvalStatus location amenities",
      })
      .populate({
        path: "applicant",
        select: "name email phone image",
      })
      .populate({
        path: "owner",
        select: "name email phone image",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("GET AGENT RENTAL APPLICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get agent rental applications",
      error: error.message,
    });
  }
}

 
  async rentalApplicationAction(req, res) {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.body;

      const application = await RentalApplication.findById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Rental application not found",
        });
      }

      // Application must be pending
      if (application.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Application is already ${application.status}`,
        });
      }

      // Check authorization
      if (req.user.role === "owner") {
        if (
          application.owner.toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to manage this application",
          });
        }
      } else if (req.user.role === "agent") {
        if (
          !application.agent ||
          application.agent.toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to manage this application",
          });
        }
      } else if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to manage this application",
        });
      }

      if (action === "approve") {
        application.status = "approved";
        application.rejectionReason = "";
      }

      if (action === "reject") {
        application.status = "rejected";
        application.rejectionReason = rejectionReason || "";
      }

      await application.save();

      return res.status(200).json({
        success: true,
        message:
          action === "approve"
            ? "Rental application approved successfully"
            : "Rental application rejected successfully",
        data: application,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update rental application",
        error: error.message,
      });
    }
  }

  
  async withdrawRentalApplication(req, res) {
    try {
      const { id } = req.params;

      const application = await RentalApplication.findById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Rental application not found",
        });
      }

      if (
        application.applicant.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to withdraw this application",
        });
      }

      if (application.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending applications can be withdrawn",
        });
      }

      application.status = "withdrawn";

      await application.save();

      return res.status(200).json({
        success: true,
        message: "Rental application withdrawn successfully",
        data: application,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to withdraw rental application",
        error: error.message,
      });
    }
  }
}

module.exports = new RentalApplicationController();