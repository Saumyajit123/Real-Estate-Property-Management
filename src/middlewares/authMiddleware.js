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

    const decodedToken = jwt.decode(token);

    if (!decodedToken?.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const user = await User.findOne({
      _id: decodedToken.userId,
      isDeleted: false,
    }).select(
      "_id name email phone role avatar status isEmailVerified +loginSecret",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }
    const verifiedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (verifiedToken.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Access token expired"
          : "Invalid access token",
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

module.exports = { authMiddleware, authorizeRoles };
