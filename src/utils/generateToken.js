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
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "1h",
    },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d",
    },
  );
};

module.exports = { generateLoginSecret, generateAccessToken, generateRefreshToken };
