const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const Owner = require("../models/ownerModel");
const Agent = require("../models/agentmodel");
// const Customer = require("../models/customerModel");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // Verify JWT
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!decodedToken || !decodedToken.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    if (decodedToken.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    const { userId, role } = decodedToken;

    console.log("DECODED TOKEN:", decodedToken);
    console.log("USER ID:", userId);
    console.log("ROLE:", role);

    let user;

    // Find user according to role
    if (role === "admin") {
      user = await User.findOne({
        _id: userId,
        isDeleted: false,
      });
    } else if (role === "owner") {

      console.log("Searching Owner:", userId);

      user = await Owner.findOne({
        _id: userId,
        isDeleted: false,
        role: "owner",
      }
    
    );

     console.log("FOUND OWNER:", user);
    } else if (role === "agent") {
      user = await Agent.findOne({
        _id: userId,
        isDeleted: false,
        role: "agent",
      });
    } else if (role === "customer") {
      user = await User.findOne({
        _id: userId,
        isDeleted: false,
        role: "customer",
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid user role",
      });
    }

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check status
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // Store authenticated user
    req.user = user;

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);

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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

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
