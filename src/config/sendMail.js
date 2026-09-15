const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // True for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Admin gmail ID
    pass: process.env.EMAIL_PASS, // Admin gmail password
  },
});

const sendCredentialsEmail = async (email, name, password, role) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Account Login Credentials",
    html: `<h2>Welcome ${name}</h2>

      <p>Your account has been created successfully.</p>

      <p>
        <strong>Role:</strong>
        ${role}
      </p>

      <p>
        <strong>Email:</strong>
        ${email}
      </p>

      <p>
        <strong>Temporary Password:</strong>
        ${password}
      </p>

      <p>
        Please login using the above credentials.
      </p>

      <p>
        After login, change your password.
      </p>

      <p>
        Your account must be approved by the Admin
        before you can access protected resources.
      </p>
    `,
  });
};



module.exports = sendCredentialsEmail;