import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, trim: true, maxlength: 30 },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  phone: { type: String, trim: true, maxlength: 25 },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 254,
    validate: { validator: value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message: "Email must be a valid email address" }
  },
  address: { type: String, trim: true, maxlength: 250 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true }
}, { timestamps: true });

export default mongoose.model("Customer", customerSchema);
