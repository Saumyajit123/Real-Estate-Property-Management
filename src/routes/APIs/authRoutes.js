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
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
  createAgentSchema,
} = require("../../validations/userSchema");

const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} = require("../../validations/categorySchema");

router.post("/register", Validation.validate(registerSchema), authController.register);

router.post(
  "/verify-email",
  Validation.validate(verifyEmailOTPSchema),
  authController.verifyEmailOTP,
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

router.all(
  "/admin/users/create",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(createUserSchema),
  authController.createUser,
);

router.all(
  "/admin/users/:id/update",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateUserSchema),
  authController.updateUser,
);

router.all(
  "/admin/users/:id/role",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateUserRoleSchema),
  authController.updateUserRole,
);

router.all(
  "/admin/users/:id/status",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateUserStatusSchema),
  authController.updateUserStatus,
);

router.all(
  "/admin/users/:id/delete",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(userIdSchema),
  authController.softDeleteUser,
);

router.all(
  "/admin/users",
  authMiddleware,
  authorizeRoles("admin"),
  authController.getAllUsers,
);

router.all(
  "/admin/users/create",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(createAgentSchema),
  authController.createUser,
);

router.all(
  "/admin/users/:id",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(userIdSchema),
  authController.getUserById,
);

router.all(
  "/admin/categories/create",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(createCategorySchema),
  authController.createCategory,
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

module.exports = router;
