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

router.all("/register", Validation.validate(registerSchema), authController.register);

router.all(
  "/verify-email",
  Validation.validate(verifyEmailOTPSchema),
  authController.verifyEmailOTP,
);

router.all(
  "/resend-email-otp",
  Validation.validate(resendEmailOTPSchema),
  authController.resendEmailOTP,
);

router.all("/login", Validation.validate(loginSchema), authController.login);

router.all(
  "/change-password",
  authMiddleware,
  Validation.validate(changePasswordSchema),
  authController.changePassword
);

router.all(
  "/forgot-password",
  Validation.validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.all(
  "/reset-password",
  Validation.validate(resetPasswordSchema),
  authController.resetPassword,
);

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
