const Appointment = require("../../models/appointmentModel");
const Property = require("../../models/property");

const checkAppointmentAccess = async (appointment, user) => {
  // Agent
  if (user.role === "agent") {
    return (
      appointment.agent && appointment.agent.toString() === user._id.toString()
    );
  }

  // Owner
  if (user.role === "owner") {
    const property = await Property.findOne({
      _id: appointment.property,
      owner: user._id,
      isDeleted: false,
    }).select("_id");

    return !!property;
  }

  // Admin
  if (user.role === "admin") {
    return true;
  }

  return false;
};

class AppointmentController {
  // Customer - create appointment:
  async createAppointment(req, res) {
    try {
      const { property, appointmentDate, duration, message } = req.body;

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

      if (propertyData.approvalStatus !== "Approved") {
        return res.status(400).json({
          success: false,
          message: "Appointment cannot be created for this property",
        });
      }

      const existingAppointment = await Appointment.findOne({
        property,
        user: req.user._id,
        status: {
          $in: ["pending", "confirmed", "rescheduled"],
        },
      });

      if (existingAppointment) {
        return res.status(409).json({
          success: false,
          message: "You already have an active appointment for this property",
        });
      }

      const appointment = await Appointment.create({
        property,
        user: req.user._id,
        agent: propertyData.agentId || null,
        appointmentDate,
        duration: duration || 60,
        message: message || "",
        status: "pending",
      });

      return res.status(201).json({
        success: true,
        message: "Property visit scheduled successfully",
        data: appointment,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to create appointment",
        error: error.message,
      });
    }
  }

  // Customer - get all appointments:
  async getMyAppointments(req, res) {
    try {
      const appointments = await Appointment.find({
        user: req.user._id,
      })
        .sort({ appointmentDate: 1 })
        .populate({
          path: "property",
          select:
            "title description propertyType purpose price area bedrooms bathrooms furnishingStatus images status approvalStatus location amenities",
        });

      return res.status(200).json({
        success: true,
        count: appointments.length,
        data: appointments,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get appointments",
        error: error.message,
      });
    }
  }

  // Customer - get single appointment:
  async getAppointmentById(req, res) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "appointment not found",
        });
      }

      // Customer can only see own appointment:
      if (
        req.user.role === "customer" &&
        appointment.user.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Agent can only see assigned appointment:
      if (
        req.user.role === "agent" &&
        appointment.agent &&
        appointment.agent.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      return res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get appointment",
        error: error.message,
      });
    }
  }

  // Agent - get all appointments:
  async getAgentAllAppointments(req, res) {
    try {
      const appointments = await Appointment.find({
        agent: req.user._id,
      })
        .sort({ appointmentDate: 1 })
        .populate({
          path: "property",
          select:
            "title description propertyType purpose price area bedrooms bathrooms furnishingStatus images status approvalStatus location amenities",
        });

      return res.status(200).json({
        success: true,
        cpount: appointments.length,
        data: appointments,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to get agent appointments",
        error: error.message,
      });
    }
  }

  // Owner - get all appointments:
  async getOwnerAllAppointments(req, res) {
  try {
    // 1. Find all owner properties with NO agent assigned
    const properties = await Property.find({
      owner: req.user._id,
      isDeleted: false,
      agentId: null,   // ✅ only properties without an agent
    }).select("_id");

    const propertyIds = properties.map((p) => p._id);

    // 2. If the owner has no unassigned properties, return empty
    if (propertyIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // 3. Find appointments for those properties only
    const appointments = await Appointment.find({
      property: { $in: propertyIds },
    })
      .populate({
        path: "property",
        select:
          "title propertyType purpose price images location agentId",
      })
      .populate({
        path: "user",
        select: "name email phone image",
      })
      .sort({ appointmentDate: 1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("GET OWNER APPOINTMENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get owner appointments",
      error: error.message,
    });
  }
}

  // Owner/Agent - confirm/reject/reschedule/complete appointment:
  async appointmentAction(req, res) {
    try {
      console.log("BODY:", req.body);
      const { id, action, appointmentDate, duration, message } = req.body;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      // Check access:
      const hasAccess = await checkAppointmentAccess(appointment, req.user);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Confirm:
      if (action === "confirm") {
        if (!["pending", "resheduled"].includes(appointment.status)) {
          return res.status(400).json({
            success: false,
            message: "Appointement cannot be confirmed",
          });
        }

        appointment.status = "confirmed";
      }

      // Reject:
      else if (action === "reject") {
        if (!["pending", "rescheduled"].includes(appointment.status)) {
          return res.status(400).json({
            success: false,
            message: "Appointment cannot be rejected",
          });
        }

        appointment.status = "rejected";
      }

      // Reschedule:
      else if (action === "reshedule") {
        if (!["pending", "rescheduled"].includes(appointment.status)) {
          return res.status(400).json({
            success: false,
            message: "Appointment cannot be resheduled",
          });
        }

        appointment.appointmentDate = appointmentDate;

        if (duration !== undefined) {
          appointment.duration = duration;
        }
        if (message !== undefined) {
          appointment.message = message;
        }

        appointment.status = "rescheduled";
      }

      // Complete:
      else if (action === "complete") {
        if (!["confirmed", "rescheduled"].includes(appointment.status)) {
          return res.status(400).json({
            success: false,
            message: "Appointment cannot be completed",
          });
        }

        appointment.status = "completed";
      }

      await appointment.save();

      return res.status(200).json({
        success: true,
        message: `Appointment ${action} successful`,
        appointment,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to process appointment action",
        error: error.message,
      });
    }
  }

  // User/Agent/Owner - cancel appointment:
  async cancelAppointment(req, res) {
    try {
      const { id, cancellationReason } = req.body;

      const appointment = await Appointment.findById(id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      // Customer can cancel only own appointment
      if (req.user.role === "customer") {
        if (appointment.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      } else {
        const hasAccess = await checkAppointmentAccess(appointment, req.user);

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      }

      if (["completed", "cancelled", "rejected"].includes(appointment.status)) {
        return res.status(400).json({
          success: false,
          message: "Appointment cannot be cancelled",
        });
      }

      appointment.status = "cancelled";
      appointment.cancellationReason = cancellationReason || "";

      await appointment.save();

      return res.status(200).json({
        success: true,
        message: "Appointment cancelled successfully",
        appointment,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to cancel appointment",
        error: error.message,
      });
    }
  }

  async getAllAppointments(req, res) {
  try {
    const appointments = await Appointment.find()
      .populate({
        path: "property",
        select:
          "title propertyType purpose price images location agentId owner",
      })
      .populate({
        path: "user",
        select: "name email phone image role",
      })
      .populate({
        path: "agent",
        select: "name email phone image role",
      })
      .sort({ appointmentDate: -1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("GET ALL APPOINTMENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get appointments",
      error: error.message,
    });
  }
}

  // Check access - owner/agent:
}

module.exports = new AppointmentController();
