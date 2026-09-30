const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateLoginSecret = () => {
  return crypto.randomBytes(64).toString("hex");
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      type: "access"
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || "1d",
    },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      type: "refresh"
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
    },
  );
};

module.exports = { generateLoginSecret, generateAccessToken, generateRefreshToken };
