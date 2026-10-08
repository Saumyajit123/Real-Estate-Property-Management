const express = require('express');
const router = express.Router();
const OwnerController= require('../../controllers/APIs/OwnerController');
const Validation = require('../../validations/validation');
const {ownerValidation,verifyEmailOTPSchema,resendEmailOTPSchema,loginSchema,updateProfileSchema,changePasswordSchema, resetPasswordSchema,forgotPasswordSchema} = require('../../validations/OwnerSchemaValidation');
const upload = require('../../utils/multer');
const ownerMiddleware = require('../../middlewares/ownerMiddleware');
const { authorizeRoles, authMiddleware } = require('../../middlewares/authMiddleware');
const { updateAgentStatusSchema } = require('../../validations/agentSchema');
const { updateOwnerStatusSchema } = require('../../validations/ownerSchema');
const parseAgentFormData = require('../../middlewares/parseAgentFormData');

router.post("/createowner",upload.single('image'),parseAgentFormData,Validation.validate(ownerValidation),OwnerController.createowner);
router.get("/logout",authMiddleware,OwnerController.logout);
router.get("/getprofile",authMiddleware,OwnerController.getProfile);
router.put("/profile/update",authMiddleware,upload.single('image'),Validation.validate(updateProfileSchema),OwnerController.updateprofile,);
router.post("/change-password",authMiddleware,Validation.validate(changePasswordSchema),OwnerController.changePassword);


router.all(
  "/admin/owners/allowners",
  authMiddleware,
  authorizeRoles("admin"),
  OwnerController.getAllOwners,
);

router.all(
  "/admin/owners/:id",
  authMiddleware,
  authorizeRoles("admin"),
  OwnerController.getOwnerById,
);

router.all(
  "/admin/owners/update/:id/status",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateOwnerStatusSchema),
  OwnerController.updateOwnerStatus,
);

router.all(
  "/admin/owners/delete/:id",
  authMiddleware,
  authorizeRoles("admin"),
  OwnerController.deleteOwner,
);

module.exports=router