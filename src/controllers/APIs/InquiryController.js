const statuscode = require("../../utils/statuscode");
const Property = require("../../models/property");
const Inquiry = require("../../models/inquiryModel");

class InquiryController {
  async createInquiry(req, res) {
    try {
      const { propertyId, name, email, phone, message } = req.body;

      if (!propertyId || !name || !email || !phone || !message) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "place provide Property name , email, phone ,message",
        });
      }

      const existingfProperty = await Property.findById(propertyId);
      if (!existingfProperty) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Property is not found",
        });
      }

      if (existingfProperty.approvalStatus !== "Approved") {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          message: "Inquiry cannot be created for an unapproved property",
        });
      }

      let agentID = null;

      if (existingfProperty.agentId) {
        agentID = existingfProperty.agentId;
      }

      const inquiry = await Inquiry.create({
        property: propertyId,
        user: req.user._id,
        agent: agentID,
        name: name,
        email: email,
        phone: phone,
        message: message,
        status: "pending",
      });

      return res.status(statuscode.OK).json({
        status: true,
        message: "Inquiry created successfully",
        data: inquiry,
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async updateInquiry(req, res) {
    try {
      const { id } = req.params;

      const { name, email, phone, message } = req.body;

      // Check required fields
      if (!name || !email || !phone || !message) {
        return res.status(statuscode.BAD_REQUEST).json({
          status: false,
          message: "Please provide name, email, phone, and message ",
        });
      }

      const inquiry = await Inquiry.findByIdAndUpdate(
        id,
        {
          name,
          email,
          phone,
          message,
        },
        {
          new: true,
          runValidators: true,
        },
      );

      // Inquiry not found
      if (!inquiry) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Inquiry not found",
        });
      }

      return res.status(statuscode.OK).json({
        status: true,
        message: "Inquiry updated successfully",
        data: inquiry,
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async getMyInquiries(req, res) {
  try {
    const inquiries = await Inquiry.find({
      user: req.user._id,
    })
      .populate({
        path: "property",
        select: "title propertyType purpose price images location agentId owner",
      })
      .populate({
        path: "agent",
        select: "name email phone image",
      })
      .sort({ createdAt: -1 });

    return res.status(statuscode.OK).json({
      status: true,
      count: inquiries.length,
      data: inquiries,
    });
  } catch (error) {
    console.error("GET MY INQUIRIES ERROR:", error);
    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}

  async getInquiryById(req, res) {
    try {
      const { id } = req.params;

      const inquiry = await Inquiry.findById(id)
        .populate({
          path: "property",
        })
        .populate({
          path: "user",
          select: "name email phone role",
        })
        .populate({
          path: "agent",
          select: "name email phone role",
        });

      if (!inquiry) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Inquiry not found",
        });
      }

      const currentUserId = req.user._id.toString();

      const inquiryUserId = inquiry.user?._id?.toString();

      const inquiryAgentId = inquiry.agent?._id?.toString();

      const isOwner = inquiryUserId === currentUserId;

      const isAgent = inquiryAgentId === currentUserId;

      const isAdmin = req.user.role === "admin";

      console.log("Logged-in user ID:", currentUserId);
      console.log("Logged-in user role:", req.user.role);
      console.log("Inquiry customer ID:", inquiryUserId);
      console.log("Inquiry agent ID:", inquiryAgentId);

      console.log({
        isOwner,
        isAgent,
        isAdmin,
      });

      if (!isOwner && !isAgent && !isAdmin) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "You are not authorized to view this inquiry",
        });
      }

      return res.status(statuscode.OK).json({
        status: true,
        data: inquiry,
      });
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async getOwnerInquiries(req, res) {
  try {
    // 1. Find properties owned by this owner WITHOUT an agent
    const properties = await Property.find({
      owner: req.user._id,
      isDeleted: false,
      agentId: null,           // ✅ owner handles these
    }).select("_id");

    const propertyIds = properties.map((p) => p._id);

    if (propertyIds.length === 0) {
      return res.status(statuscode.OK).json({
        status: true,
        count: 0,
        data: [],
      });
    }

    // 2. Find inquiries for those properties only
    const inquiries = await Inquiry.find({
      property: { $in: propertyIds },
    })
      .populate({
        path: "property",
        select: "title propertyType purpose price images location agentId owner",
      })
      .populate({
        path: "user",
        select: "name email phone image",
      })
      .sort({ createdAt: -1 });

    return res.status(statuscode.OK).json({
      status: true,
      count: inquiries.length,
      data: inquiries,
    });
  } catch (error) {
    console.error("GET OWNER INQUIRIES ERROR:", error);
    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}

  async getAgentInquiries(req, res) {
  try {
    const inquiries = await Inquiry.find({
      agent: req.user._id,       // ✅ only this agent's inquiries
    })
      .populate({
        path: "property",
        select: "title propertyType purpose price images location agentId",
      })
      .populate({
        path: "user",
        select: "name email phone image",
      })
      .sort({ createdAt: -1 });

    return res.status(statuscode.OK).json({
      status: true,
      count: inquiries.length,
      data: inquiries,
    });
  } catch (error) {
    console.error("GET AGENT INQUIRIES ERROR:", error);
    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}

  async getAllInquiries(req, res) {
    try {
      const inquiries = await Inquiry.find()
        .populate({
          path: "property",
        })
        .populate({
          path: "user",
          select: "name email phone role",
        })
        .populate({
          path: "agent",
          select: "name email phone role",
        })
        .sort({
          createdAt: -1,
        });

      return res.status(statuscode.OK).json({
        status: true,
        count: inquiries.length,
        inquiries,
      });
    } catch (error) {
      console.log("GET ALL INQUIRIES ERROR:", error);

      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async updateInquiryStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "contacted", "resolved", "closed"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid inquiry status",
      });
    }

    const inquiry = await Inquiry.findById(id).populate("property", "owner agentId");

    if (!inquiry) {
      return res.status(404).json({
        status: false,
        message: "Inquiry not found",
      });
    }

    const currentUserId = req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    // ✅ Agent check
    const isAssignedAgent =
      inquiry.agent && inquiry.agent.toString() === currentUserId;

    // ✅ Owner check — owns property AND no agent assigned
    const property = inquiry.property;
    const isOwner =
      property &&
      typeof property === "object" &&
      property.owner &&
      property.owner.toString() === currentUserId &&
      !property.agentId;

    if (!isAssignedAgent && !isOwner && !isAdmin) {
      return res.status(statuscode.FORBIDDEN).json({
        status: false,
        message: "You are not authorized to update this inquiry",
      });
    }

    inquiry.status = status;
    await inquiry.save();

    return res.status(statuscode.OK).json({
      status: true,
      message: "Inquiry status updated successfully",
      inquiry,
    });
  } catch (error) {
    console.error("UPDATE INQUIRY STATUS ERROR:", error);
    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}

  async replyToInquiry(req, res) {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res.status(statuscode.BAD_REQUEST).json({
        status: false,
        message: "Reply is required",
      });
    }

    const inquiry = await Inquiry.findById(id).populate("property", "owner agentId");

    if (!inquiry) {
      return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "Inquiry not found",
      });
    }

    const currentUserId = req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    // ✅ Agent can reply if assigned to this inquiry
    const isAssignedAgent =
      inquiry.agent && inquiry.agent.toString() === currentUserId;

    // ✅ Owner can reply if they own the property AND no agent is assigned
    const property = inquiry.property;
    const isOwner =
      property &&
      typeof property === "object" &&
      property.owner &&
      property.owner.toString() === currentUserId &&
      !property.agentId;

    if (!isAssignedAgent && !isOwner && !isAdmin) {
      return res.status(statuscode.FORBIDDEN).json({
        status: false,
        message: "You are not authorized to reply to this inquiry",
      });
    }

    inquiry.reply = reply;
    inquiry.repliedAt = new Date();
    inquiry.status = "contacted";

    await inquiry.save();

    return res.status(statuscode.OK).json({
      status: true,
      message: "Reply sent successfully",
      inquiry,
    });
  } catch (error) {
    console.error("REPLY INQUIRY ERROR:", error);
    return res.status(statuscode.SERVER_ERROR).json({
      status: false,
      message: error.message,
    });
  }
}

  async deleteInquiry(req, res) {
    try {
      const { id } = req.params;

      const inquiry = await Inquiry.findById(id);

      if (!inquiry) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Inquiry not found",
        });
      }

      const currentUserId = req.user._id.toString();

      const inquiryUserId = inquiry.user.toString();

      const isOwner = inquiryUserId === currentUserId;

      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "You are not authorized to delete this inquiry",
        });
      }

      await Inquiry.findByIdAndDelete(id);

      return res.status(statuscode.OK).json({
        status: true,
        message: "Inquiry deleted successfully",
      });
    } catch (error) {
      console.log("DELETE INQUIRY ERROR:", error);

      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }
}

module.exports = new InquiryController();
