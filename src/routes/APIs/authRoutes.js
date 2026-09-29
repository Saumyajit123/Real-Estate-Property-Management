const express = require("express");
const router = express.Router();

const authController = require("../../controllers/APIs/authController");
const {
  authMiddleware,
  authorizeRoles,
} = require("../../middlewares/authMiddleware");
const uploadMiddleware = require("../../middlewares/uploadMiddleware");
const Validation = require("../../validations/validation");

const {
  registerSchema,
  verifyEmailOTPSchema,
  resendEmailOTPSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
} = require("../../validations/userSchema");

const {
  updateAgentSchema,
  updateAgentRoleSchema,
  updateAgentStatusSchema,
  agentIdSchema,
  getAllAgentsSchema,
} = require("../../validations/agentSchema");

const {updateOwnerSchema,
  updateOwnerRoleSchema,
  updateOwnerStatusSchema,
  ownerIdSchema,
  getAllOwnersSchema,} = require("../../validations/ownerSchema");

const {
  createCategorySchema,
  getAllCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} = require("../../validations/categorySchema");



router.post("/register", Validation.validate(registerSchema), authController.register);

router.post(
  "/verify-email",
  Validation.validate(verifyEmailOTPSchema),
  authController.verify,
);

router.post(
  "/resend-email-otp",
  Validation.validate(resendEmailOTPSchema),
  authController.resendEmailOTP,
);

router.post("/login", Validation.validate(loginSchema), authController.login);

router.post(
  "/change-password",
  authMiddleware,
  Validation.validate(changePasswordSchema),
  authController.changePassword
);

router.post(
  "/forgot-password",
  Validation.validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.all(
  "/reset-password",
  Validation.validate(resetPasswordSchema),
  authController.resetPassword,
);

router.get("/getprofile",authMiddleware,authController.getProfile)

router.all(
  "/profile/update",
  authMiddleware,
  uploadMiddleware.single("avatar"),
  Validation.validate(updateProfileSchema),
  authController.updateProfile,
);

// ========================== USERS =======================================

// router.all(
//   "/admin/users/:id/update",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(updateUserSchema),
//   authController.updateUser,
// );

// router.all(
//   "/admin/users/:id/role",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(updateUserRoleSchema),
//   authController.updateUserRole,
// );

router.all(
  "/admin/users/:id/status",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateUserStatusSchema),
  authController.updateUserStatus,
);

// router.all(
//   "/admin/users/:id/delete",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(userIdSchema),
//   authController.softDeleteUser,
// );

router.all(
  "/admin/users",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAllUsers,
);


router.all(
  "/admin/users/:id",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getUserById,
);

// ==================================== CATEGORY ========================================

router.all(
  "/admin/categories/create",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(createCategorySchema),
  authController.createCategory,
);

router.all(
  "/admin/categories/getall", 
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(getAllCategorySchema),
  authController.getAllCategories,
);

router.all(
  "/admin/categories/:id/update",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateCategorySchema),
  authController.updateCategory,
);

router.all(
  "/admin/categories/:id/delete",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(categoryIdSchema),
  authController.deleteCategory,
);


//====================================== AGENTS ===================================

router.all(
  "/admin/agents/allagents",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAllAgents,
);

router.all(
  "/admin/agents/:id",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAgentById,
);

// router.all(
//   "/admin/agents/update/:id",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(updateAgentSchema),
//   authController.updateAgent,
// );

// router.all(
//   "/admin/agents/update/:id/role",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(updateAgentRoleSchema),
//   authController.updateAgentRole,
// );

router.all(
  "/admin/agents/update/:id/status",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateAgentStatusSchema),
  authController.updateAgentStatus,
);

// router.all(
//   "/admin/agents/delete/:id",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(agentIdSchema),
//   authController.deleteAgent,
// );

// router.all(
//   "/admin/agents/soft-delete/:id",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(agentIdSchema),
//   authController.softDeleteAgent,
// );


// ===================================== OWNER ==============================================

router.all(
  "/admin/owners/allowners",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAllOwners,
);

router.all(
  "/admin/owners/:id",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getOwnerById,
);

// router.all(
//   "/admin/owners/update/:id",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(updateOwnerSchema),
//   authController.updateOwner,
// );

// router.all(
//   "/admin/owners/update/:id/role",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(updateOwnerRoleSchema),
//   authController.updateOwnerRole,
// );

router.all(
  "/admin/owners/update/:id/status",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateOwnerStatusSchema),
  authController.updateOwnerStatus,
);

// router.all(
//   "/admin/owners/delete/:id",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(ownerIdSchema),
//   authController.deleteOwner,
// );

// router.all(
//   "/admin/owners/soft-delete/:id",
//   authMiddleware,
//   authorizeRoles("admin"),
//   Validation.validate(ownerIdSchema),
//   authController.softDeleteOwner,
// );


// ========================================= PROPERTIES ==========================================

router.all(
  "/admin/prpoerties/allproperties",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAllProperties,
);

router.all(
  "/admin/prpoerties/:id",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getPropertyById,
);

router.all(
  "/admin/prpoerties/:id/approve",
  authMiddleware,
  authorizeRoles("admin"),
  authController.approveProperty,
);

router.all(
  "/admin/prpoerties/:id/reject",
  authMiddleware,
  authorizeRoles("admin"),
  authController.rejectProperty,
);

// ================================= INQUIRIES ==================================

router.all(
  "/admin/inquiries",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAllInquiries,
);

// ================================ APPOINTMENTS ================================

router.all(
  "/admin/appointments",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAllAppointments,
);

// ================================ REPORTS =====================================

router.all(
  "/admin/reports",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getReports,
);

// =============================== ANALYTICS ====================================

router.all(
  "/admin/analytics",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAnalytics,
);




module.exports = router;
