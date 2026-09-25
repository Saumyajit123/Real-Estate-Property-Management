const express = require("express");
const router = express.Router();

const authRoute = require("./APIs/authRoutes");
const propertyrouter = require('./APIs/propertyrouter')
router.use('/v1/api', authRoute);
router.use("/v2/api",propertyrouter)



module.exports = router;