import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Email is invalid."],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Hash password with a cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
