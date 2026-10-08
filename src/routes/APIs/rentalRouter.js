const express = require("express");

const router = express.Router();

const RentalApplicationController = require("../../controllers/APIs/RentalApplicationController");

const {
  authMiddleware,
  authorizeRoles,
} = require("../../middlewares/authMiddleware");

const Validation = require("../../validations/validation");

const {
  createRentalApplicationSchema,
  updateRentalApplicationSchema,
  rentalApplicationActionSchema,
} = require("../../validations/rentalSchema");

// =====================================================
// CUSTOMER ROUTES
// =====================================================

// Create rental application
router.post(
  "/createrentel",
  authMiddleware,
  authorizeRoles("customer"),
  Validation.validate(createRentalApplicationSchema),
  RentalApplicationController.createRentalApplication
);

router.put(
  "/update/:id",
  authMiddleware,
  authorizeRoles("customer"),
  Validation.validate(updateRentalApplicationSchema),
  RentalApplicationController.updateRentalApplication
);

// Get logged-in customer's applications
router.get(
  "/my-applications",
  authMiddleware,
  authorizeRoles("customer"),
  RentalApplicationController.getMyRentalApplications
);

// Withdraw rental application
router.patch(
  "/withdraw/:id",
  authMiddleware,
  authorizeRoles("customer"),
  RentalApplicationController.withdrawRentalApplication
);

// =====================================================
// OWNER ROUTES
// =====================================================

// Get owner's rental applications
router.get(
  "/owner/all",
  authMiddleware,
  authorizeRoles("owner"),
  RentalApplicationController.getOwnerRentalApplications
);

// =====================================================
// AGENT ROUTES
// =====================================================

// Get agent's assigned rental applications
router.get(
  "/agent/all",
  authMiddleware,
  authorizeRoles("agent"),
  RentalApplicationController.getAgentRentalApplications
);

// =====================================================
// COMMON GET BY ID
// Customer / Owner / Agent / Admin
// =====================================================

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("customer", "owner", "agent", "admin"),
  RentalApplicationController.getRentalApplicationById
);

// =====================================================
// APPROVE / REJECT
// Owner / Agent / Admin
// =====================================================

router.patch(
  "/action/:id",
  authMiddleware,
  authorizeRoles("owner", "agent"),
  Validation.validate(rentalApplicationActionSchema),
  RentalApplicationController.rentalApplicationAction
);

module.exports = router;