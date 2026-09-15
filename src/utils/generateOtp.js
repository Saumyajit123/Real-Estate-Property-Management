const crypto = require("crypto");

const generateOTP = () => {
  const otp = crypto.randomInt(100000, 1000000).toString();

  const hash = crypto.createHash("sha256").update(otp).digest("hex");

  return {
    otp,
    hash,
  };
};

const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

module.exports = {
  generateOTP,
  hashOTP,
};
