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
  PropertyController.createproperty,
);
router.put(
  "/property/update/:id",
  upload.array("images", 5),
  authMiddleware,
  authorizeRoles("owner"),
  Validation.validate(PropertySehemaValiadtion.createproperty),
  PropertyController.updateProperty,
);
router.get("/getAllProperty",authMiddleware, PropertyController.findAllProperty);

router.delete("/softdeleteproperty/:id",authMiddleware,authorizeRoles('owner'),PropertyController.SoftdeleteProperty);
router.patch("/retrivedeletedproperty/:id",authMiddleware,authorizeRoles('owner'),PropertyController.retriveDeletedProperty);
router.delete("/delete/property/Permanently/:id",authMiddleware,authorizeRoles('owner'),PropertyController.deletePropertyPermanent);
router.patch("/approveproperty",authMiddleware,authorizeRoles('admin'),PropertyController.approveProperty)

module.exports = router;
