const express = require("express");
const router = express.Router();

const authRoute = require("./APIs/authRoutes");
router.use('/api', authRoute);



module.exports = router;