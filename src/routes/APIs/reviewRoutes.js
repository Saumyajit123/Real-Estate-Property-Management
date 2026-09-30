const express = require("express");
const router = express.Router();

const reviewController = require("../../controllers/APIs/reviewController");
const {
  authMiddleware,
  authorizeRoles,
} = require("../../middlewares/authMiddleware");
const Validation = require("../../validations/validation");
const {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  propertyReviewSchema,
  reviewActionSchema,
} = require("../../validations/reviewSchema");
const { validate } = require("../../models/reviewModel");

router.post(
  "/reviews/create",
  authMiddleware,
  authorizeRoles("customer"),
  Validation.validate(createReviewSchema),
  reviewController.createReview,
);

router.get(
  "/reviews/my",
  authMiddleware,
  authorizeRoles("customer"),
  reviewController.getMyReviews,
);

router.put(
  "/reviews/update",
  authMiddleware,
  authorizeRoles("customer"),
  Validation.validate(updateReviewSchema),
  reviewController.updateReview,
);

router.get(
  "/reviews/property/:propertyId",
  (req, res, next) => {
    const { error } = propertyReviewSchema.validate(req.params, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    next();
  },
  reviewController.getPropertyReviews,
);

router.get(
  "/reviews/admin/all",
  authMiddleware,
  authorizeRoles("admin"),
  reviewController.getAllReviews,
);

router.get(
  "/reviews/admin/pending",
  authMiddleware,
  authorizeRoles("admin"),
  reviewController.getPendingReviews,
);

router.put(
  "/reviews/admin/action",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(reviewActionSchema),
  reviewController.reviewAction,
);

router.get(
  "/reviews/:id",
  authMiddleware,
  Validation.validate(reviewIdSchema),
  reviewController.getReviewById,
);

router.delete(
  "/reviews/:id",
  authMiddleware,
  authorizeRoles("customer", "admin"),
  reviewController.deleteReview,
);

module.exports = router;
