const transporter = require("../config/email.config");
const Otp = require("../models/otpModel");

const SendEmailOtp = async (req, user, userModel) => {
  try {
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Delete previous OTP
    await Otp.deleteMany({
      userId: user._id,
      userModel: userModel,
    });

    // Create new OTP
    await Otp.create({
      userId: user._id,
      userModel: userModel,
      otp: otp,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "OTP - Verify your account",
      text: `Your verification OTP is ${otp}`,

      html: `
        <p>Dear ${user.name},</p>

        <p>
          Thank you for signing up with our website.
          To complete your registration, please verify
          your email address by entering the following OTP.
        </p>

        <h2 style="
          text-align: center;
          background-color: #a61616;
          padding: 10px;
        ">
          OTP: ${otp}
        </h2>

        <p>
          This OTP is valid for 15 minutes.
          If you didn't request this OTP, please ignore this email.
        </p>
      `,
    });

    return otp;

  } catch (error) {
    console.error("SEND EMAIL OTP ERROR:", error);
    throw error;
  }
};

module.exports = SendEmailOtp;