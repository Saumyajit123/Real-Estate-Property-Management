const jwt = require("jsonwebtoken");
const Owner = require("../models/ownerModel");

const ownerAuthMiddleware = async (req, res, next) => {
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

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    if (!decodedToken || !decodedToken.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    const owner = await Owner.findOne({
      _id: decodedToken.userId,
      status: "inactive",
    });

    if (!owner) {
      return res.status(401).json({
        success: false,
        message: "Owner not found",
      });
    }

    req.user = owner;

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

module.exports = ownerAuthMiddleware;