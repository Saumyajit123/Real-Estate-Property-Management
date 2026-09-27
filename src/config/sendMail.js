const nodemailer = require("nodemailer");

const Otp = require("../models/otpModel");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // True for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Admin gmail ID
    pass: process.env.EMAIL_PASS, // Admin gmail password
  },
});

const verifyEmailOtp = async (req, user) => {
  // Delete previous OTPs for this user
  await Otp.deleteMany({
    userId: user._id,
  });

  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Save otp in Database
  const dataotp = await new Otp({ userId: user._id, otp: otp }).save();

  // OTP verification Link:
  // const otpVerificationLink = `${process.env.FRONTEND_HOST}/account/verify-email`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "OTP - Verify your account",
    text: "",
    html: `<p>Dear ${user.name},</p><p>Thank you for signing up with our website. To complete your registration, please verify your email address by entering the following one-time password (OTP)</p>
    <h2 style="text-align: center; background-color: #a61616ff; padding: 10px;">OTP: ${otp}</h2>
    <p>This OTP is valid for 10 minutes. If you didn't request this OTP, please ignore this email.</p>`,
  });

  return otp;
};

// const sendCredentialsEmail = async (email, name, password, role) => {
//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: "Account Login Credentials",
//     html: `<h2>Welcome ${name}</h2>

//       <p>Your account has been created successfully.</p>

//       <p>
//         <strong>Role:</strong>
//         ${role}
//       </p>

//       <p>
//         <strong>Email:</strong>
//         ${email}
//       </p>

//       <p>
//         <strong>Temporary Password:</strong>
//         ${password}
//       </p>

//       <p>
//         Please login using the above credentials.
//       </p>

//       <p>
//         After login, change your password.
//       </p>

//       <p>
//         Your account must be approved by the Admin
//         before you can access protected resources.
//       </p>
//     `,
//   });
// };

module.exports = {transporter, verifyEmailOtp};
