import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  registration: { type: String, required: true, unique: true, trim: true, uppercase: true, minlength: 1, maxlength: 20 },
  brand: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
  model: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
  year: { type: Number, min: 1900, max: new Date().getFullYear() + 1, validate: { validator: value => value == null || Number.isInteger(value), message: "Year must be a whole number" } },
  type: { type: String, enum: ["Car", "SUV", "Van", "Truck", "Motorcycle"], default: "Car" },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true }
}, { timestamps: true });

export default mongoose.model("Vehicle", vehicleSchema);
