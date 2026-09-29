const express = require('express');
const router = express.Router();

const leaseController = require("../../controllers/APIs/leaseController");
const {authMiddleware, authorizeRoles} = require("../../middlewares/authMiddleware");
const Validation = require("../../validations/validation");
const {
  createLeaseSchema,
  updateLeaseSchema,
  terminateLeaseSchema,
  expireLeaseSchema,
  leaseIdSchema,
} = require("../../validations/leaseSchema");


router.post(
  "/lease/create",
  authMiddleware,
  authorizeRoles("owner", "admin"),
  Validation.validate(createLeaseSchema),
  leaseController.createLease,
);

router.get(
  "/lease/admin/all",
  authMiddleware,
  authorizeRoles("admin"),
  leaseController.getAllLeases,
);

router.get(
  "/lease/my",
  authMiddleware,
  authorizeRoles("customer"),
  leaseController.getMyLeases,
);

router.get(
  "/lease/owner",
  authMiddleware,
  authorizeRoles("owner"),
  leaseController.getOwnerLeases,
);

router.get(
  "/lease/agent",
  authMiddleware,
  authorizeRoles("agent"),
  leaseController.getAgentLeases,
);

router.put(
  "/lease/update",
  authMiddleware,
  authorizeRoles("owner", "admin"),
  Validation.validate(updateLeaseSchema),
  leaseController.updateLease,
);

router.put(
  "/lease/terminate",
  authMiddleware,
  authorizeRoles("owner", "admin"),
  Validation.validate(terminateLeaseSchema),
  leaseController.terminateLease,
);

router.put(
  "/lease/expire",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(expireLeaseSchema),
  leaseController.expireLease,
);

router.get(
  "/lease/:id",
  authMiddleware,
  Validation.validate(leaseIdSchema),
  leaseController.getLeaseById,
);



module.exports = router;