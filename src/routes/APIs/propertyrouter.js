const express = require("express");
const router = express.Router();
const PropertyController = require("../../controllers/APIs/PropertyController");
const upload = require("../../utils/multer");
const Validation = require("../../validations/index");
const PropertySehemaValiadtion = require("../../validations/PropertySchemaValidation");
const {
  authMiddleware,
  authorizeRoles,
} = require("../../middlewares/authMiddleware");

router.post(
  "/create-property",
  upload.array("images", 5),
  authMiddleware,
  authorizeRoles("owner"),
  Validation.validate(PropertySehemaValiadtion.createproperty),
  PropertyController.createProperty,
);

router.get(
  "/property/:id",
  authMiddleware,
  authorizeRoles("owner", "admin", "customer", "agent"),
  PropertyController.getPropertyById,
);

router.put(
  "/property/update/:id",
  upload.array("images", 5),
  authMiddleware,
  authorizeRoles("owner"),
  Validation.validate(PropertySehemaValiadtion.createproperty),
  PropertyController.updateProperty,
);
router.get(
  "/getAllProperty",
  authMiddleware,
  PropertyController.findAllProperty,
);

router.delete(
  "/softdeleteproperty/:id",
  authMiddleware,
  authorizeRoles("owner", "admin"),
  PropertyController.SoftdeleteProperty,
);
router.patch(
  "/retrivedeletedproperty/:id",
  authMiddleware,
  authorizeRoles("owner", "admin"),
  PropertyController.retriveDeletedProperty,
);
router.delete(
  "/delete/property/Permanently/:id",
  authMiddleware,
  authorizeRoles("owner", "admin"),
  PropertyController.deletePropertyPermanent,
);
router.patch(
  "/approveproperty/:id",
  authMiddleware,
  authorizeRoles("admin"),
  PropertyController.approveProperty,
);
router.get(
  "/my-approved-properties",
  authMiddleware,
  authorizeRoles("agent"),
  PropertyController.getMyApprovedProperties,
);

router.get(
  "/public-approved",
  authMiddleware,
  PropertyController.getPublicApprovedProperties
);

module.exports = router;
