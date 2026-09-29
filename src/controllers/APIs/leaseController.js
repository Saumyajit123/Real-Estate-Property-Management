const mongoose = require("mongoose");

const Lease = require("../../models/leaseModel");
const Property = require("../../models/property");
const RentalApplication = require("../../models/rentalApplicationModel");
const User = require("../../models/userModel");

class LeaseController {
  // Create lease:
  async createLease(req, res) {
    try {
      const {
        rentalApplication,
        startDate,
        endDate,
        monthlyRent,
        securityDeposit,
        agreementDocument,
      } = req.body;

      const application = await RentalApplication.findOne({
        _id: rentalApplication,
        status: "approved",
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Approved rental application not found",
        });
      }

      const existingApplicationLease = await Lease.findOne({
        rentalApplication: application._id,
      });

      if (existingApplicationLease) {
        return res.status(409).json({
          success: false,
          message: "A lease already exists for this rental application",
        });
      }

      const property = await Property.findOne({
        _id: application.property,
        isDeleted: false,
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      // Proprty must be for rent:
      if (property.purpose !== "Rent") {
        return res.status(400).json({
          success: false,
          message: "Lease can only be created for rental properties",
        });
      }

      // Property must be approved:
      if (property.approvalStatus !== "Approved") {
        return res.status({
          success: false,
          message: "Property is not approved for rental",
        });
      }

      // Rented property cant be leased:
      if (property.status === "Rented") {
        return res.status(409).json({
          success: false,
          message: "Property is already rented",
        });
      }

      if (application.owner.toString() !== property.owner.toString()) {
        return res.status(400).json({
          success: false,
          message: "Rental application owner does not match property owner",
        });
      }

      // Verify tenant:
      const tenant = await User.findOne({
        _id: application.applicant,
        isDeleted: false,
      }).select("_id name email role");

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Tenant not found",
        });
      }

      if (tenant.role !== "customer") {
        return res.status(400).json({
          success: false,
          message: "Rental applicant must be a customer",
        });
      }

      // Verify owner:
      const owner = await User.findOne({
        _id: application.owner,
        isDeleted: false,
      }).select("_id name email role");

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Property owner not found",
        });
      }

      // Check active lease for property:
      const activeLease = await Lease.findOne({
        property: property._id,
        status: "active",
      });

      if (activeLease) {
        return res.status(409).json({
          success: false,
          message: "Property already has an active lease",
        });
      }

      const lease = await Lease.create({
        property: property._id,
        tenant: application.applicant,
        owner: application.owner,
        agent: application.agent || null,
        rentalApplication: application._id,
        startDate,
        endDate,
        monthlyRent,
        securityDeposit: securityDeposit || 0,
        agreementDocument: agreementDocument || "",
        status: "active",
      });

      await Property.findByIdAndUpdate(
        property._id,
        { status: "Rented" },
        {
          new: true,
          runValidators: true,
        },
      );

      return res.status(201).json({
        success: true,
        message: "Lease created successfully",
        data: lease,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to create lease",
        error: error.message,
      });
    }
  }

  // Get all lease(Admin):
  async getAllLeases(req, res) {
    try {
      const { status, property, tenant, owner, agent } = req.body;

      const matchStage = {};

      if (status) {
        matchStage.status = status;
      }

      if (property) {
        matchStage.property = new mongoose.Types.ObjectId(property);
      }

      if (tenant) {
        matchStage.tenant = new mongoose.Types.ObjectId(tenant);
      }

      if (owner) {
        matchStage.owner = new mongoose.Types.ObjectId(owner);
      }

      if (agent) {
        matchStage.agent = new mongoose.Types.ObjectId(agent);
      }

      const leases = await this.getLeaseAggregation(matchStage);

      return res.status(200).json({
        success: true,
        count: leases.length,
        data: leases,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch leases",
        error: error.message,
      });
    }
  }

  // Get my leases(customer):
  async getMyLeases(req, res) {
    try {
      const leases = await this.getLeaseAggregation({
        tenant: req.user._id,
      }).sort({createdAt: -1});

      return res.status(200).json({
        success: true,
        count: leases.length,
        data: leases,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch your leases",
        error: error.message,
      });
    }
  }

  // Get owner leases:
  async getOwnerLeases(req, res) {
    try {
      const leases = await this.getLeaseAggregation({
        owner: req.user._id,
      });

      return res.status(200).json({
        success: true,
        count: leases.length,
        data: leases,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch owner leases",
        error: error.message,
      });
    }
  }

  // Get agent leases:
  async getAgentLeases(req, res) {
    try {
      const leases = await this.getLeaseAggregation({
        agent: req.user._id,
      });

      return res.status(200).json({
        success: true,
        count: leases.length,
        data: leases,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch agent leases",
        error: error.message,
      });
    }
  }

  // Get lease by Id:
  async getLeaseById(req, res) {
    try {
      const { id } = req.params;

      const lease = await Lease.findById(id);

      if (!lease) {
        return res.status(404).json({
          success: false,
          message: "Lease not found",
        });
      }

      // Admin access:
      if (req.user.role === "admin") {
        return res.status(200).json({
          success: true,
          data: lease,
        });
      }

      // Tenant access:
      if (
        req.user.role === "customer" &&
        lease.tenant.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Owner access:
      if (
        req.user.role === "owner" &&
        lease.owner.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Agent access:
      if (
        req.user.role === "agent" &&
        (!lease.agent || lease.agent.toString() !== req.user._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      return res.status(200).json({
        success: true,
        data: lease,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch lease",
        error: error.message,
      });
    }
  }

  // Update lease:
  async updateLease(req, res) {
    try {
      const {
        id,
        startDate,
        endDate,
        monthlyRent,
        securityDeposit,
        agreementDocument,
      } = req.bosy;

      const lease = await Lease.findById(id);

      if (!lease) {
        return res.status(404).json({
          success: false,
          message: "Lease not found",
        });
      }

      // Only owner and admin can update:
      if (
        req.user.role !== "admin" &&
        lease.owner.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Only the owner or admin can update this lease",
        });
      }

      if (lease.status === "terminated") {
        return res.status(400).json({
          success: false,
          message: "Terminated lease cannot be updated",
        });
      }

      const updateData = {};

      if (startDate !== undefined) {
        updateData.startDate = startDate;
      }

      if (endDate !== undefined) {
        updateData.endDate = endDate;
      }

      if (monthlyRent !== undefined) {
        updateData.monthlyRent = monthlyRent;
      }

      if (securityDeposit !== undefined) {
        updateData.securityDeposit = securityDeposit;
      }

      if (agreementDocument !== undefined) {
        updateData.agreementDocument = agreementDocument;
      }

      // Validate dates:
      const finalStartDate =
        startDate !== undefined ? new Date(startDate) : lease.startDate;
      const finalEndDate =
        endDate !== undefined ? new Date(endDate) : lease.endDate;

      if (finalEndDate <= finalStartDate) {
        return res.status(400).json({
          success: false,
          message: "End date must be greater than start date",
        });
      }

      const updatedLease = await Lease.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: "Lease updated successfully",
        lease: updatedLease,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update lease",
        error: error.message,
      });
    }
  }

  // Terminate lease:
  async terminateLease(req, res) {
    try {
      const { id, terminationReason } = req.body;

      const lease = await Lease.findById(id);

      if (!lease) {
        return res.status(404).json({
          success: false,
          message: "Lease not found",
        });
      }

      if (
        req.user.role !== "admin" &&
        lease.owner.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Only the owner or admin can terminate this lease",
        });
      }

      if (lease.status === "terminated") {
        return res.status(400).json({
          success: false,
          message: "Lease is already terminated",
        });
      }

      if (lease.status === "expired") {
        return res.status(400).json({
          success: false,
          message: "Expired lease cannot be terminated",
        });
      }

      const updatedLease = await Lease.findByIdAndUpdate(
        id,
        {
          status: "terminated",
          terminationReason,
        },
        {
          new: true,
          runValidators: true,
        },
      );

      await Property.findByIdAndUpdate(
        lease.property,
        {
          status: "Available",
        },
        {
          new: true,
          runValidators: true,
        },
      );

      return res.status(200).json({
        success: true,
        message: "Lease terminated successfully",
        lease: updatedLease,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to terminate lease",
        error: error.message,
      });
    }
  }

  // Expire lease:
  async expireLease(req, res) {
    try {
      const { id } = req.body;

      const lease = await Lease.findById(id);

      if (!lease) {
        return res.status(404).json({
          success: false,
          message: "Lease not found",
        });
      }

      if (lease.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Only active leases can be expired",
        });
      }

      // Check end date:
      if (new date() < new Date(lease.endDate)) {
        return res.status(400).json({
          success: false,
          message: "Lease end date has not been reached yet",
        });
      }

      const updatedLease = await Lease.findByIdAndUpdate(
        id,
        {
          status: "expired",
        },
        {
          new: true,
          runValidators: true,
        },
      );

      await Property.findByIdAndUpdate(
        lease.property,
        {
          status: "Available",
        },
        {
          new: true,
          runValidators: true,
        },
      );

      return res.status(200).json({
        success: true,
        message: "Lease expired successfully",
        lease: updatedLease,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to expire lease",
        error: error.message,
      });
    }
  }
}

module.exports = new LeaseController();
