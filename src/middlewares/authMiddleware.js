const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const authMiddleware = async (req, res, next) => {
  try {

    const AuthHeader = req.headers.authorization;
        if (!AuthHeader) {
      if (req.method === "GET") {
        return next();
      }

      return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "Authorrization token is required",
      });
    }

    if(!AuthHeader.startsWith("Bearer ")){
        return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "Invalid authorization format"
      });
    }

    const token = AuthHeader.split(" ")[1];



    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // Decode token only to get user ID
    const decodedToken = jwt.decode(token);

    if (!decodedToken || !decodedToken.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // Find user and retrieve dynamic loginSecret
    const user = await User.findOne({
      _id: decodedToken.id,
      isDeleted: false,
    }).select(
      "_id name email phone role image status isEmailVerified +loginSecret",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check account status
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const verifiedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);


    // Make sure dynamic secret exists
    if (!user.loginSecret) {
      return res.status(401).json({
        success: false,
        message: "Login session is invalid. Please login again",
      });
    }


    // Verify JWT using user's dynamic secret

    // Make sure this is an access token
    if (verifiedToken.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // Store authenticated user
    req.user = user;

    next();
  } catch (error) {
    console.log(error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};


const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  authorizeRoles,
};
