const express = require("express");
const router = express.Router();

const authRoute = require("./APIs/authRoutes");
const propertyrouter = require('./APIs/propertyrouter');
const appointmentRoute = require("./APIs/appointmentRoutes");
const reviewRoute = require("./APIs/reviewRoutes");
const leaseRoute = require("./APIs/reviewRoutes");

router.use('/v1/api', authRoute);
router.use("/v2/api", propertyrouter);
router.use('/V3/api', appointmentRoute);
router.use('/V4/api', reviewRoute);
router.use('/V5/api', leaseRoute);




module.exports = router;