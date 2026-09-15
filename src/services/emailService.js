const sendMail = require("../config/sendMail");

const sendVerificationEmail = async (email, otp) => {
  return sendMail({
    to: email,
    subject: "Real Estate - Email Verification",
    html: `
      <h2>Email Verification</h2>
      <p>Your verification OTP is:</p>

      <h1>${otp}</h1>

      <p>This OTP expires in 10 minutes.</p>
    `,
  });
};

const sendPasswordResetEmail = async (email, otp) => {
  return sendMail({
    to: email,
    subject: "Real Estate - Password Reset",
    html: `
      <h2>Password Reset</h2>
      <p>Your password reset OTP is:</p>

      <h1>${otp}</h1>

      <p>This OTP expires in 10 minutes.</p>
    `,
  });
};

const sendPropertyApprovalEmail = async (
  email,
  title,
  approved,
  reason = "",
) => {
  return sendMail({
    to: email,
    subject: approved ? "Property Approved" : "Property Rejected",

    html: `
      <h2>
        Property ${approved ? "Approved" : "Rejected"}
      </h2>

      <p>Property: ${title}</p>

      ${reason ? `<p>Reason: ${reason}</p>` : ""}
    `,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPropertyApprovalEmail,
};
