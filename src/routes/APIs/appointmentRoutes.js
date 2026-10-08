const express = require("express");
const router = express.Router();

const appointmentController = require("../../controllers/APIs/appointmentController");
const {
  authMiddleware,
  authorizeRoles,
} = require("../../middlewares/authMiddleware");
const Validation = require("../../validations/validation");
const {
  createAppointmentSchema,
  cancelAppointmentSchema,
  appointmentIdSchema,
  appointmentActionSchema,
} = require("../../validations/appointmentSchema");

router.post(
  "/customer/create/appointment",
  authMiddleware,
  authorizeRoles("customer"),
  Validation.validate(createAppointmentSchema),
  appointmentController.createAppointment,
);

router.get(
  "/customer/appointments",
  authMiddleware,
  authorizeRoles("customer"),
  appointmentController.getMyAppointments,
);

router.get(
  "/agent/appointments",
  authMiddleware,
  authorizeRoles("agent"),
  appointmentController.getAgentAllAppointments,
);

router.get(
  "/owner/appointemnts/property",
  authMiddleware,
  authorizeRoles("owner"),
  appointmentController.getOwnerAllAppointments,
);

router.get(
  "/appointment/single/:id",
  authMiddleware,
  Validation.validate(appointmentIdSchema),
  appointmentController.getAppointmentById,
);

router.put(
  "/appointment/action",

  (req, res, next) => {
    console.log("🔥 ROUTE HIT:", req.method, req.originalUrl);
    console.log("   Headers:", req.headers["content-type"]);
    console.log("   Body (before parsing):", req.body);
    next();
  },


  authMiddleware,
  authorizeRoles("agent", "owner"),
  Validation.validate(appointmentActionSchema),
  appointmentController.appointmentAction,
);

router.delete(
  "/appointemnt/cancel",
  authMiddleware,
  authorizeRoles("customer", "agent", "owner"),
  Validation.validate(cancelAppointmentSchema),
  appointmentController.cancelAppointment,
);

router.get(
  "/appointment/all",
  authMiddleware,
  authorizeRoles("admin"),
  appointmentController.getAllAppointments
);



module.exports = router;
