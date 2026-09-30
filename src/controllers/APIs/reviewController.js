const Review = require("../../models/reviewModel");
const Property = require("../../models/property");
const Appointment = require("../../models/appointmentModel");

class ReviewController {
  // Create review:
  async createReview(req, res) {
    try {
      const { property, rating, comment } = req.body;

      const propertyData = await Property.findOne({
        _id: property,
        isDeleted: false,
      }).select("_id title agent owner status");

      if (!propertyData) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      if (propertyData.status !== "approved") {
        return res.status(400).json({
          success: false,
          message: "You can review only an approved property",
        });
      }

      const existingReview = await Review.findOne({
        property,
        user: req.user._id,
      });

      if (existingReview) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this property",
        });
      }

      const completedAppointment = await Appointment.findOne({
        property,
        user: req.user._id,
        status: "completed",
      });

      if (!completedAppointment) {
        return res.status(403).json({
          success: false,
          message:
            "You can review the property only after completing an appointment",
        });
      }

      const rview = await Review.create({
        property,
        user: req.user._id,
        rating,
        comment,
      });

      return res.status(200).json({
        success: true,
        message: "Review completed successfully",
        review,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to create review",
        error: error.message,
      });
    }
  }

  // Admin - get all reviews:
  async getAllReviews(req, res) {
    try {
      const { status, rating, property } = req.query;

      const matchStage = {};

      if (status) {
        matchStage.status = status;
      }

      if (rating) {
        matchStage.rating = Number(rating);
      }

      if (property) {
        matchStage.property = property;
      }

      const reviews = await Review.aggregate([
        {
          $match: matchStage,
        },
        {
          $lookup: {
            from: "properties",
            localfield: "property",
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

        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Hide sensitive user information:
        {
          $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            property: {
              _id: "$propertyData._id",
              title: "$propertyData.title,",
            },
            user: {
              _id: "$userData._id",
              name: "$userData.name",
              email: "$userData.email",
            },
          },
        },
        {
          $sort: { createdAt: 1 },
        },
      ]);

      return res.status(200).json({
        success: true,
        count: reviews.length,
        reviews,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch reviews",
        error: error.message,
      });
    }
  }

  // Get review by id:
  async getReviewById(req, res) {
    try {
      const { id } = req.params;

      const reviews = await Review.aggregate([
        {
          $match: {
            _id: require("mongoose").Types.ObjectId.createFromHexString(id),
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: true,
          },
        },

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

        {
          $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            user: {
              _id: "$userData._id",
              name: "$userData.name",
              email: "$userData.email",
            },
            property: {
              _id: "$propertyData._id",
              title: "$propertyData.title",
            },
          },
        },
      ]);

      if (!reviews.length) {
        return res.status(404).json({
          sucess: false,
          message: "Review not found",
        });
      }

      return res.status(200).json({
        success: true,
        review: reviews[0],
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch review",
        error: error.message,
      });
    }
  }

  // Get reviews of a property:
  async getPropertyReviews(req, res) {
    try {
      const { propertyId } = req.params;

      const property = await Property.findOne({
        _id: propertyId,
        isDeleted: false,
      }).select("_id title");

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      const reviews = await Review.aggregate([
        {
          $match: {
            property: property._id,
            status: "approved",
          },
        },

        {
          $lookup: {
            from: "users",
            localfield: "user",
            foreignField: "_id",
            as: "userData",
          },
        },

        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            createdAt: 1,
            user: {
              _id: "#userData._id",
              name: "$userData.name",
            },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);

      const statistics = await Review.aggregate([
        {
          $match: {
            property: property._id,
            status: "approved",
          },
        },
        {
          $group: {
            _id: "$property",
            totalReviews: {
              $sum: 1,
            },
            averageRating: {
              $avg: "$rating",
            },
            highestTating: {
              $max: "$rating",
            },
            lowestRating: {
              $min: "$rating",
            },
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        property: {
          _id: property._id,
          title: property.title,
        },
        statistics: statistics[0] || {
          totalReviews: 0,
          averageRating: 0,
          highestRating: 0,
          lowestRating: 0,
        },
        data: reviews,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch property reviews",
        error: error.message,
      });
    }
  }

  // Get my reviews:
  async getMyReviews(req, res) {
    try {
      const reviews = await Review.aggregate([
        {
          $match: {
            user: req.user._id,
          },
        },

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

        {
          $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            property: {
              _id: "$propertyData._id",
              title: "$propertyData.title",
            },
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
        count: reviews.length,
        data: reviews,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch your reviews",
        error: error.message,
      });
    }
  }

  // Update review:
  async updateReview(req, res) {
    try {
      const { id, rating, comment } = req.body;

      const review = await Review.findById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      // Only review owner can update:
      if (review.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can update only your own review",
        });
      }

      if (review.status === "rejected") {
        return res.status(400).json({
          success: false,
          message: "Rejected review cannot be updated",
        });
      }

      const updateData = {};

      if (rating !== undefined) {
        updateData.rating = rating;
      }

      if (comment !== undefined) {
        updateData.comment = comment;
      }

      const updatedReview = await Review.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: "Review updated successfully",
        review: updatedReview,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to update review",
        error: error.message,
      });
    }
  }

  // Delete review:
  async deleteReview(req, res) {
    try {
      const { id } = req.params;

      const review = await Review.findById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      // Customer can delete own review
      // Admin can delete any review:
      if (
        req.user.role !== "admin" &&
        review.user.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You can delete only your own review",
        });
      }

      await Review.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Review deleted successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete review",
        error: error.message,
      });
    }
  }

  // Approve/reject review:
  async reviewAction(req, res) {
    try {
      const { id, action, reason } = req.body;

      const review = await Review.findById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      // Approve:
      if (action === "approve") {
        review.status = "approved";
        review.reason = "";

        await review.save();

        return res.status(200).json({
          success: true,
          message: "Review approved successfully",
          review,
        });
      }

      // Reject:
      if (action === "reject") {
        review.status = "rejected";
        review.reason = reason || "";

        await review.save();

        return res.status(200).json({
          success: true,
          message: "Review rejected successfully",
          review,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Action must be approve or reject",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to process review action",
        error: error.message,
      });
    }
  }

  // Pending reviews:
  async getPendingReviews(req, res) {
    try {
      const reviews = await Review.aggregate([
        {
          $match: {
            status: "pending",
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },

        {
          $unwind: {
            path: "$userData",
            preserveNullAndEmptyArrays: true,
          },
        },

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

        {
          $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            status: 1,
            createdAt: 1,

            user: {
              _id: "$userData._id",
              name: "$userData.name",
              email: "$userData.email",
            },

            property: {
              _id: "$propertyData._id",
              title: "$propertyData.title",
            },
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
        count: reviews.length,
        reviews,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch pending reviews",
        error: error.message,
      });
    }
  }
}

module.exports = new ReviewController();
