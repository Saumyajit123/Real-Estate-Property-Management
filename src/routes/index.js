const express = require("express");
const router = express.Router();

const authRoute = require("./APIs/authRoutes");
const propertyrouter = require('./APIs/propertyrouter');
const appointmentRoute = require("./APIs/appointmentRoutes");
const reviewRoute = require("./APIs/reviewRoutes");
const leaseRoute = require("./APIs/reviewRoutes");

const favoriterouter = require('./APIs/favoriteRouter');
const Inquiryrouter = require('./APIs/InquiryRouter')
router.use('/v1/api', authRoute);
router.use("/v2/api",propertyrouter);
router.use("/v3/api",favoriterouter);
router.use("/v4/api",Inquiryrouter);
router.use('/V5/api', appointmentRoute);
router.use('/V6/api', reviewRoute);
router.use('/V7/api', leaseRoute);





module.exports = router;