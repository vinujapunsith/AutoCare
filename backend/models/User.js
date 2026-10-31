import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email must be a valid email address"]
  },
  password: { type: String, required: true, maxlength: 100 },
  role: { type: String, enum: ["Admin", "User"], default: "User" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
