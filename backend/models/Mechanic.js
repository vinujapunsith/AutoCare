import mongoose from "mongoose";

const mechanicSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, trim: true, maxlength: 30 },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  phone: { type: String, trim: true, maxlength: 25 },
  specialization: { type: String, trim: true, maxlength: 100 },
  status: { type: String, enum: ["Available", "Busy", "Off Duty"], default: "Available" }
}, { timestamps: true });

export default mongoose.model("Mechanic", mechanicSchema);
