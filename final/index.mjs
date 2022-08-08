import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import { config } from "dotenv";

import User from "./models/user.mjs";
import tokenGenerator from "./utils/tokenGenerator.mjs";
import { setCache, getCache, deleteCache } from "./utils/cacheHandler.mjs";
import { sendMagicLink } from "./utils/mailer.mjs";

config({ path: "./env/.env" });
const app = express();

app.use(morgan("combined"));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: "SUCCESS",
      users,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: "FAIL", message: "Failed to fetch users." });
  }
});

app.post("/users/magic_link", async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ status: "FAIL", message: "Email required." });

  try {
    // 1) check if user exists already
    const userExists = await User.findOne({ email });
    if (userExists)
      return res
        .status(400)
        .json({ status: "FAIL", message: "Email already in use." });

    // 2) generate token
    const token = tokenGenerator();

    // 3) store email and token in redisJSON for 24 hours
    const hours24 = 60 * 60 * 24;
    await setCache(token, { email, token }, hours24);

    // 4) send token to user's email address
    sendMagicLink(email, token);

    res.status(200).json({
      status: "SUCCESS",
      message: "Link sent to your email!",
    });
  } catch (err) {
    console.error(err.message);
    res
      .status(500)
      .json({ status: "FAIL", message: "Something went terribly wrong." });
  }
});

app.post("/users/signup", async (req, res) => {
  const { email, name, password } = req.body;
  const { token } = req.query;

  // 1) check if user exists already
  const userExists = await User.findOne({ email });
  if (userExists)
    return res
      .status(400)
      .json({ status: "FAIL", message: "Email already in use." });

  // 2) require token
  if (!token)
    return res.status(400).json({ status: "FAIL", message: "Token required." });

  // 3) validate body
  if (!email || !name || !password)
    return res
      .status(400)
      .json({ status: "FAIL", message: "Invalid request." });

  // 4) check if data exists on redisJSON and client email matches data email. if NOT, return "Access denied"
  const data = await getCache(token);
  if (!data || data.email !== email)
    return res.status(403).json({ status: "FAIL", message: "Access denied." });

  // 5) if exists, create new user account
  let user;

  try {
    user = await User.create({ name, email, password });

    // NOTE: additionally, let's remove the data from redisJSON at this point even though in the end the data will expire and be removed automatically in 24 hours from the moment of existence anyway.
    await deleteCache(email);

    res.status(201).json({
      status: "SUCCESS",
      message: "User saved!",
      user,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: "FAIL", message: "Failed to save user." });
  }
});

mongoose.connect(
  `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@mongodb:27017/migic-link-redis?authSource=admin`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.error("FAILED TO CONNECT TO MONGODB");
      console.error(err);
    } else {
      console.log("CONNECTED TO MONGODB!!");
      app.listen(4000, () =>
        console.log(
          `App listening on port 4000 in ${process.env.NODE_ENV} mode.`
        )
      );
    }
  }
);
