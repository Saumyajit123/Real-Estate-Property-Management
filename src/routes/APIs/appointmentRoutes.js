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
  updateAppointmentSchema,
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
  "/appointment/single",
  authMiddleware,
  Validation.validate(appointmentIdSchema),
  appointmentController.getAppointmentById,
);

router.all(
  "/appointment/action",
  authMiddleware,
  authorizeRoles("agent", "owner"),
  Validation.validate(appointmentActionSchema),
  appointmentController.appointmentAction,
);

router.all(
  "/appointemnt/cancel",
  authMiddleware,
  authorizeRoles("customer", "agent", "owner"),
  Validation.validate(cancelAppointmentSchema),
  appointmentController.cancelAppointment,
);



module.exports = router;
