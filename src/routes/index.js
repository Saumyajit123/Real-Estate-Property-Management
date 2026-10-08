const express = require("express");
const router = express.Router();

const authRoute = require("./APIs/authRoutes");
const propertyrouter = require('./APIs/propertyrouter');
const appointmentRoute = require("./APIs/appointmentRoutes");
const reviewRoute = require("./APIs/reviewRoutes");
const leaseRoute = require("./APIs/leaseRoute");
const favoriterouter = require('./APIs/favoriteRouter');
const Inquiryrouter = require('./APIs/InquiryRouter');
const OwnerRouter = require('./APIs/ownerRouter');
const AgentRouter = require('./APIs/agentRouter')
const rentalRouter = require('./APIs/rentalRouter')



router.use('/v1/api', authRoute);
router.use("/v2/api",propertyrouter);
router.use("/v3/api",favoriterouter);
router.use("/v4/api",Inquiryrouter);
router.use('/v5/api', appointmentRoute);
router.use('/V6/api', reviewRoute);
router.use('/v7/api', leaseRoute);
router.use('/v8/api',OwnerRouter);
router.use('/v9/api',AgentRouter)
router.use("/v10/api",rentalRouter)





module.exports = router;