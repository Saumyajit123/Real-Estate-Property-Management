require("dotenv").config();
const express = require("express");
const DBConnect = require("./src/config/dbConnect");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require("path");
const indexRouter = require("./src/routes/index");

DBConnect();

const app = express();

const Port = process.env.PORT || 3007;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(indexRouter);

app.listen(Port, () => {
  console.log(`Server is running on port: ${Port}`);
});
