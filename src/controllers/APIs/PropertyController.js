const statuscode = require("../../utils/statuscode");
const Property = require("../../models/property");
const cloudinary = require("../../config/cloudinary.config");
const Owner = require("../../models/ownerModel");
const Agent = require("../../models/agentmodel");

class PropertyController {
  async createProperty(req, res) {
    try {
      const {
        title,
        description,
        propertyType,
        purpose,
        price,
        area,
        bedrooms,
        bathrooms,
        furnishingStatus,
        amenities,
        status,
        location,
        agentId,
      } = req.body;

      const owner = await Owner.findOne({
        _id: req.user._id,
        role: "owner",
        isDeleted: false,
      });

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Owner not found",
        });
      }

      let agent = null;

      if (agentId) {
        console.log("REQ BODY:", req.body);
        console.log("AGENT ID FROM BODY:", agentId);
        agent = await Agent.findOne({
          _id: agentId,
          role: "agent",
          isDeleted: false,
          status: "active",
          isEmailVerified: true,
        });

        if (!agent) {
          return res.status(404).json({
            success: false,
            message: "Agent not found or agent is not active",
          });
        }
      }

      const newProperty = new Property({
        title,
        description,
        propertyType,
        purpose,
        price,
        area,
        bedrooms,
        bathrooms,
        furnishingStatus,
        amenities,
        status: status || "Available",

        approvalStatus: "Pending",

        location,

        owner: owner._id,

        agentId: agent ? agent._id : null,
      });

      if (req.files && req.files.length > 0) {
        newProperty.images = req.files.map((file) => ({
          image: file.path,
          public_id: file.filename,
        }));
      }

      const propertyData = await newProperty.save();

      return res.status(201).json({
        success: true,
        message: "Property created successfully",
        data: propertyData,
      });
    } catch (error) {
      console.error("CREATE PROPERTY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Property creation failed",
        error: error.message,
      });
    }
  }

  async getPropertyById(req, res) {
    try {
      const { id } = req.params;

      const property = await Property.findOne({
        _id: id,
        isDeleted: false,
      })
        .populate("owner", "name email phone image")
        .populate("agentId", "name email phone image");

      if (!property) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Property not found",
        });
      }

      // Owner can only fetch their own property for edit
      if (
        req.user.role === "owner" &&
        property.owner._id.toString() !== req.user._id.toString()
      ) {
        return res.status(statuscode.FORBIDDEN).json({
          status: false,
          message: "You can only edit your own properties",
        });
      }

      return res.status(statuscode.OK).json({
        status: true,
        message: "Property fetched successfully",
        data: property,
      });
    } catch (error) {
      console.error("GET PROPERTY BY ID ERROR:", error);
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async updateProperty(req, res) {
    try {
      const { id } = req.params;

      const {
        title,
        description,
        propertyType,
        purpose,
        price,
        area,
        bedrooms,
        bathrooms,
        furnishingStatus,
        amenities,
        status,
        approvalStatus,
        location,
        agentId,
      } = req.body;
      const propertyById = await Property.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!propertyById) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Property not found",
        });
      }

      let agent = null;

      if (agentId) {
        agent = await Agent.findOne({
          _id: agentId,
          role: "agent",
          isDeleted: false,
          status: "active",
          isEmailVerified: true,
        });

        if (!agent) {
          return res.status(statuscode.NOT_FOUND).json({
            status: false,
            message: "Agent not found or agent is not active",
          });
        }
      }

      // -----------------------------
      // Images
      // -----------------------------

      let images = propertyById.images;

      if (req.files && req.files.length > 0) {
        for (const img of propertyById.images) {
          await cloudinary.uploader.destroy(img.public_id);
        }

        // Add new images
        images = req.files.map((file) => ({
          image: file.path,
          public_id: file.filename,
        }));
      }

      // -----------------------------
      // Update property
      // -----------------------------

      const propertydata = await Property.findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
        },
        {
          title,
          description,
          propertyType,
          purpose,
          price,
          area,
          bedrooms,
          bathrooms,
          furnishingStatus,
          amenities,
          status,
          approvalStatus,
          location,

          // Agent
          agentId: agent ? agent._id : null,

          // Images
          images,
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!propertydata) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Property is not updated",
        });
      }

      return res.status(statuscode.OK).json({
        status: true,
        message: "Property updated successfully",
        data: propertydata,
      });
    } catch (error) {
      console.error("UPDATE PROPERTY ERROR:", error);

      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async findAllProperty(req, res) {
    try {
      const { propertyTitle, minprice, maxprice } = req.query;

      const page = req.query.page || 1;
      const limit = req.query.limit || 5;
      const skip = (page - 1) * limit;

      const query = {};

      if (propertyTitle) {
        req.title = { $rejex: propertyTitle, $options: "i" };
      }

      if (minprice || maxprice) {
        query.price = {};
        if (minprice) {
          query.price.$gt = Number(minprice);
        }
        if (maxprice) {
          query.price.$lt = Number(maxprice);
        }
      }

      if (!req.user) {
        const propertyData = await Property.find({
          ...query,
          approvalStatus: "Approved",
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);

        const totalProperty = await Property.countDocuments({
          ...query,
          approvalStatus: "Approved",
          isDeleted: false,
        });

        return res.status(statuscode.OK).json({
          status: true,
          message: "Published Property",
          count: totalProperty,
          currentPage: page,
          totalpage: Math.ceil(totalProperty / limit),
          data: propertyData,
        });
      }

      const user = req.user;

      if (!user) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "User not found",
        });
      }

      // const secretKey = req.headers["x-secret-key"]
      // if(!secretKey){
      //     return res.status(statuscode.NOT_FOUND).json({
      //         status:false.valueOf,
      //         message:"secret key is required"
      //     })
      // }
      // if(secretKey !== req.user.secretKey){
      //     return res.status(statuscode.NOT_FOUND).json({
      //         status:false.valueOf,
      //         message:"place provide valid secret key"
      //     })
      // }

      if (user.role === "owner") {
        const propertyData = await Property.find({
          ...query,
          owner: user._id,
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);

        const totalProperty = await Property.countDocuments({
          ...query,
          owner: user._id,
          isDeleted: false,
        });

        return res.status(statuscode.OK).json({
          status: true,
          message: "Only see your property",
          totalProperty: totalProperty,
          currentPage: page,
          totalpage: Math.ceil(totalProperty / limit),
          data: propertyData,
        });
      }
      if (user.role === "admin") {
        const propertyData = await Property.find({
          ...query,
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);

        const totalProperty = await Property.countDocuments({
          ...query,
          isDeleted: false,
        });

        return res.status(statuscode.OK).json({
          status: true,
          message: "Only see ypu property",
          totalProperty: totalProperty,
          currentPage: page,
          totalpage: Math.ceil(totalProperty / limit),
          data: propertyData,
        });
      }

      if (user.role === "customer") {
        const propertyData = await Property.find({
          ...query,
          approvalStatus: "Approved",
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);

        const totalProperty = await Property.countDocuments({
          ...query,
          approvalStatus: "Approved",
          isDeleted: false,
        });

        return res.status(statuscode.OK).json({
          status: true,
          message: "Only see ypu property",
          totalProperty: totalProperty,
          currentPage: page,
          totalpage: Math.ceil(totalProperty / limit),
          data: propertyData,
        });
      }
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async SoftdeleteProperty(req, res) {
    try {
      const { id } = req.params;
      const propertyData = await Property.findByIdAndUpdate(
        {
          _id: id,
          isDeleted: false,
        },
        {
          $set: {
            isDeleted: true,
          },
        },
        {
          new: true,
        },
      );

      return res.status(statuscode.OK).json({
        status: true,
        message: "Property deleted succesfully",
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async retriveDeletedProperty(req, res) {
    try {
      const { id } = req.params;
      const propertyData = await Property.findByIdAndUpdate(
        {
          _id: id,
        },
        {
          $set: {
            isDeleted: false,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      return res.status(statuscode.OK).json({
        status: true,
        message: "Retrive Deleted data succesfully",
        data: propertyData,
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async deletePropertyPermanent(req, res) {
    try {
      const { id } = req.params;
      const propertyData = await Property.findByIdAndDelete(id);
      return res.status(statuscode.NOT_FOUND).json({
        status: true,
        message: "Your Property deleted succesfully",
        data: propertyData,
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async approveProperty(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body; // ✅ read from body
      const user = req.user;

      if (!user) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "User is not found",
        });
      }

      if (user.role !== "admin") {
        return res.status(statuscode.FORBIDDEN).json({
          status: false,
          message: "You are not eligible to approve Property",
        });
      }

      const property = await Property.findById(id);

      if (!property) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Property not found",
        });
      }

      if (property.isDeleted === true) {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          message: "Deleted property cannot be approved",
        });
      }

      if (property.approvalStatus === "Approved") {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          message: "Property is already approved",
        });
      }

      // ✅ Apply approval
      property.approvalStatus = "Approved";
      property.approvalStatus = "Approved";
      property.approvalNote = rejectionReason?.trim() || null;
      property.rejectionReason = null; // always clear on approval
      property.reviewedBy = user._id;
      property.reviewedAt = new Date();

      // ✅ If a rejectionReason was previously set, keep it in history
      //    but clear the live field. Or, if admin passes a new reason,
      //    use it as an approval note.
      if (rejectionReason) {
        // Save as an approval note / or track separately if you add a field
        property.rejectionReason = rejectionReason.trim();
      } else if (property.rejectionReason) {
        // Clear stale rejection reason when approving
        property.rejectionReason = null;
      }

      const data = await property.save();

      return res.status(statuscode.OK).json({
        status: true,
        message: "Property published successfully",
        data: data,
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async getMyApprovedProperties(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, purpose } = req.query;

    // ✅ Agent ID always comes from the authenticated user
    const agentId = req.user._id;

    const matchStage = {
      agentId,
      approvalStatus: "Approved",
      isDeleted: false,
    };

    if (purpose) {
      matchStage.purpose = purpose;
    }

    if (search) {
      matchStage.title = { $regex: search, $options: "i" };
    }

    const [properties, total] = await Promise.all([
      Property.find(matchStage)
        .populate("owner", "name email phone image address")
        .populate("agentId", "name email phone image agencyName specialization")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Property.countDocuments(matchStage),
    ]);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Your approved properties fetched successfully",
      totalProperty: total,
      currentPage: page,
      totalpage: Math.ceil(total / limit),
      data: properties,
    });
  } catch (error) {
    console.error("GET MY APPROVED PROPERTIES ERROR:", error);
    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}

async getPublicApprovedProperties(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const {
      search,
      purpose,
      propertyType,
      minprice,
      maxprice,
      bedrooms,
      furnishingStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Only approved + not deleted
    const matchStage = {
      approvalStatus: "Approved",
      isDeleted: false,
    };

    if (search) {
      matchStage.title = { $regex: search, $options: "i" };
    }

    if (purpose) {
      matchStage.purpose = purpose;
    }

    if (propertyType) {
      matchStage.propertyType = propertyType;
    }

    if (furnishingStatus) {
      matchStage.furnishingStatus = furnishingStatus;
    }

    if (bedrooms) {
      matchStage.bedrooms = { $gte: Number(bedrooms) };
    }

    if (minprice || maxprice) {
      matchStage.price = {};
      if (minprice) matchStage.price.$gte = Number(minprice);
      if (maxprice) matchStage.price.$lte = Number(maxprice);
    }

    // Sort whitelist
    const allowedSortFields = ["price", "createdAt", "area", "bedrooms"];
    const finalSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const finalSortOrder = sortOrder === "asc" ? 1 : -1;

    const [properties, total] = await Promise.all([
      Property.find(matchStage)
        .populate("owner", "name email phone image")
        .populate("agentId", "name email phone image agencyName")
        .sort({ [finalSortBy]: finalSortOrder })
        .skip(skip)
        .limit(limit),

      Property.countDocuments(matchStage),
    ]);

    return res.status(statuscode.OK).json({
      status: true,
      message: "Approved properties fetched successfully",
      totalProperty: total,
      currentPage: page,
      totalpage: Math.ceil(total / limit),
      data: properties,
    });
  } catch (error) {
    console.error("GET PUBLIC APPROVED ERROR:", error);
    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}
}
module.exports = new PropertyController();
