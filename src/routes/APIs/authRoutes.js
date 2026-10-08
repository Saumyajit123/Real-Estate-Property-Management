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
  
} = require("../../validations/userSchema");

const {
  createCategorySchema,
  getAllCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} = require("../../validations/categorySchema");
const upload = require('../../utils/multer')



router.post("/register",upload.single('image'), Validation.validate(registerSchema), authController.register);

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
router.get("/logout",authMiddleware,authController.logout);

router.post(
  "/change-password",
  authMiddleware,
  Validation.validate(changePasswordSchema),
  authController.changePassword
);

router.post(
  "/forgot-password",
  Validation.validate(forgotPasswordSchema),
  authController.resetPasswordLink,
);

router.post(
  "/reset-password/:id/:token",
  Validation.validate(resetPasswordSchema),
  authController.resetPassword,
);

router.get("/getprofile",authMiddleware,authController.getProfile)

router.put(
  "/profile/update",
  authMiddleware,
  upload.single('image'),
  Validation.validate(updateProfileSchema),
  authController.updateprofile,
);

// ========================== USERS =======================================


router.patch(
  "/admin/users/status/:id",
  authMiddleware,
  authorizeRoles("admin"),
  authController.updateUserStatus,
);



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

router.all(
  "/admin/user/delete/:id",
  authMiddleware,
  authorizeRoles("admin"),
  authController.deleteUser,
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




// ===================================== OWNER ==============================================




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
