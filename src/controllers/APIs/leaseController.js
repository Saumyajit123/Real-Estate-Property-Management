const mongoose = require("mongoose");

const Lease = require("../../models/leaseModel");
const Property = require("../../models/property");
const RentalApplication = require("../../models/rentalApplicationModel");
const User = require("../../models/userModel");
const Owner = require('../../models/ownerModel');
const statuscode = require("../../utils/statuscode");

const getLeaseAggregation = async (filters = {}) => {
  const match = {};

  if (filters.agent) {
    match.agent = new mongoose.Types.ObjectId(filters.agent);
  }

  if (filters.owner) {
    match.owner = new mongoose.Types.ObjectId(filters.owner);
  }

  if (filters.tenant) {
    match.tenant = new mongoose.Types.ObjectId(filters.tenant);
  }

  const leases = await Lease.aggregate([
    // 1. Filter
    { $match: match },

    // 2. Property lookup
    {
      $lookup: {
        from: "properties",
        localField: "property",
        foreignField: "_id",
        as: "propertyData",
      },
    },
    {
      $unwind: {
        path: "$propertyData",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 3. Tenant lookup
    {
      $lookup: {
        from: "users",
        localField: "tenant",
        foreignField: "_id",
        as: "tenantData",
      },
    },
    {
      $unwind: {
        path: "$tenantData",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 4. Owner lookup
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerData",
      },
    },
    {
      $unwind: {
        path: "$ownerData",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 5. Agent lookup
    {
      $lookup: {
        from: "users",
        localField: "agent",
        foreignField: "_id",
        as: "agentData",
      },
    },
    {
      $unwind: {
        path: "$agentData",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 6. Reshape output — property becomes the populated object
    {
      $project: {
        _id: 1,
        property: "$propertyData",   // ← replaces raw ID with full object
        tenant: {
          _id: "$tenantData._id",
          name: "$tenantData.name",
          email: "$tenantData.email",
          phone: "$tenantData.phone",
          image: "$tenantData.image",
        },
        owner: {
          _id: "$ownerData._id",
          name: "$ownerData.name",
          email: "$ownerData.email",
          phone: "$ownerData.phone",
          image: "$ownerData.image",
        },
        agent: {
          _id: "$agentData._id",
          name: "$agentData.name",
          email: "$agentData.email",
          phone: "$agentData.phone",
          image: "$agentData.image",
        },
        rentalApplication: 1,
        startDate: 1,
        endDate: 1,
        monthlyRent: 1,
        securityDeposit: 1,
        agreementDocument: 1,
        status: 1,
        terminationReason: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },

    // 7. Newest first
    { $sort: { createdAt: -1 } },
  ]);

  return leases;
};

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
      const owner = await Owner.findOne({
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
    const leases = await Lease.aggregate([
      // =====================================================
      // 1. GET ALL LEASES (sorted newest first)
      // =====================================================
      {
        $sort: { createdAt: -1 },
      },

      // =====================================================
      // 2. LOOKUP PROPERTY
      // =====================================================
      {
        $lookup: {
          from: "properties",
          localField: "property",
          foreignField: "_id",
          as: "propertyData",
        },
      },
      {
        $unwind: {
          path: "$propertyData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // =====================================================
      // 3. LOOKUP TENANT (User collection)
      // =====================================================
      {
        $lookup: {
          from: "users",
          localField: "tenant",
          foreignField: "_id",
          as: "tenantData",
        },
      },
      {
        $unwind: {
          path: "$tenantData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // =====================================================
      // 4. LOOKUP OWNER (Owner collection)
      // =====================================================
      {
        $lookup: {
          from: "owners",
          localField: "owner",
          foreignField: "_id",
          as: "ownerData",
        },
      },
      {
        $unwind: {
          path: "$ownerData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // =====================================================
      // 5. LOOKUP AGENT (Agent collection)
      // =====================================================
      {
        $lookup: {
          from: "agents",
          localField: "agent",
          foreignField: "_id",
          as: "agentData",
        },
      },
      {
        $unwind: {
          path: "$agentData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // =====================================================
      // 6. RESHAPE OUTPUT — matches frontend Lease type
      // =====================================================
      {
        $project: {
          _id: 1,

          // ✅ property → full object
          property: "$propertyData",

          // ✅ tenant → name, email, phone, image only
          tenant: {
            _id: "$tenantData._id",
            name: "$tenantData.name",
            email: "$tenantData.email",
            phone: "$tenantData.phone",
            image: "$tenantData.image",
          },

          // ✅ owner → name, email, phone, image only
          owner: {
            _id: "$ownerData._id",
            name: "$ownerData.name",
            email: "$ownerData.email",
            phone: "$ownerData.phone",
            image: "$ownerData.image",
          },

          // ✅ agent → name, email, phone, image only (null if no agent)
          agent: {
            _id: "$agentData._id",
            name: "$agentData.name",
            email: "$agentData.email",
            phone: "$agentData.phone",
            image: "$agentData.image",
          },

          rentalApplication: 1,
          startDate: 1,
          endDate: 1,
          monthlyRent: 1,
          securityDeposit: 1,
          agreementDocument: 1,
          status: 1,
          terminationReason: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: leases.length,
      data: leases,
    });
  } catch (error) {
    console.error("GET ALL LEASES ERROR:", error);

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
      const leases = await getLeaseAggregation({
        tenant: req.user._id,
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
        message: "Failed to fetch your leases",
        error: error.message,
      });
    }
  }

  // Get owner leases:
  async getOwnerLeases(req, res){
  try {
    const leases = await Lease.aggregate([
      // 1. Get only this owner's leases
      {
        $match: {
          owner: req.user._id,
        },
      },

      // 2. Get property
      {
        $lookup: {
          from: "properties",
          localField: "property",
          foreignField: "_id",
          as: "propertyData",
        },
      },

      {
        $unwind: "$propertyData",
      },

      // 3. Only owner-direct properties
      {
        $match: {
          "propertyData.owner": req.user._id,
          $or: [
            { "propertyData.agentId": null },
            { "propertyData.agentId": { $exists: false } },
          ],
        },
      },

      // 4. Get tenant
      {
        $lookup: {
          from: "users",
          localField: "tenant",
          foreignField: "_id",
          as: "tenantData",
        },
      },

      {
        $unwind: {
          path: "$tenantData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 5. Get owner
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerData",
        },
      },

      {
        $unwind: {
          path: "$ownerData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 6. Get agent
      {
        $lookup: {
          from: "agents",
          localField: "agent",
          foreignField: "_id",
          as: "agentData",
        },
      },

      {
        $unwind: {
          path: "$agentData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 7. Optional: clean response
      // 7. Optional: clean response
{
  $project: {
    // ✅ Rename propertyData → property
    property: "$propertyData",
    tenant: {
      _id: "$tenantData._id",
      name: "$tenantData.name",
      email: "$tenantData.email",
      phone: "$tenantData.phone",
      image: "$tenantData.image",
    },
    owner: {
      _id: "$ownerData._id",
      name: "$ownerData.name",
      email: "$ownerData.email",
      phone: "$ownerData.phone",
      image: "$ownerData.image",
    },
    agent: {
      _id: "$agentData._id",
      name: "$agentData.name",
      email: "$agentData.email",
      phone: "$agentData.phone",
      image: "$agentData.image",
    },
    rentalApplication: 1,
    startDate: 1,
    endDate: 1,
    monthlyRent: 1,
    securityDeposit: 1,
    agreementDocument: 1,
    status: 1,
    terminationReason: 1,
    createdAt: 1,
    updatedAt: 1,
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
      count: leases.length,
      data: leases,
    });
  } catch (error) {
    console.error("GET OWNER LEASES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch owner leases",
      error: error.message,
    });
  }
};

  // Get agent leases:
  async getAgentLeases(req, res) {
    try {
      const leases = await getLeaseAggregation({
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
      } = req.body;

      const lease = await Lease.findById(id);

      if (!lease) {
        return res.status(404).json({
          success: false,
          message: "Lease not found",
        });
      }

      // Only owner and admin can update:
      if (
        lease.agent.toString() !== req.user._id.toString() &&
        lease.owner.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Only the owner or agent can update this lease",
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
        lease.agent.toString() !== req.user._id.toString() &&
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

  async deleteLease(req,res){
    try {
      const{id} = req.params;
      const deleteLease = await Lease.findByIdAndDelete(id);
      return res.status(statuscode.OK).json({
        status:true,
        message:"Lease deteted succesfully"
      })
      
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status:false,
        message:error.message
      })
    }
  }
}

module.exports = new LeaseController();
