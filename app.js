require("dotenv").config();
const express = require("express");
const DBConnect = require("./src/config/dbConnect");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const indexRouter = require("./src/routes/index");

DBConnect();

const app = express();

const Port = process.env.PORT;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET','POST', 'PUT','PATCH',  'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-secret-key']
}));

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

app.set("etag", false);
app.use("/v7/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(indexRouter);

app.listen(Port, () => {
  console.log(`Server is running on port: ${Port}`);
});
