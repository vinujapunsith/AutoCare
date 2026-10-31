import mongoose from "mongoose";

const usedPartSchema = new mongoose.Schema({
  part: { type: mongoose.Schema.Types.ObjectId, ref: "Part", required: true },
  code: { type: String, trim: true, maxlength: 30 },
  name: { type: String, trim: true, maxlength: 100 },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, default: 0, min: 0 }
}, { _id: false });

const serviceRequestSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, trim: true, maxlength: 30 },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  mechanic: { type: mongoose.Schema.Types.ObjectId, ref: "Mechanic" },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format"] },
  status: { type: String, enum: ["Pending", "In Progress", "Completed", "Cancelled"], default: "Pending" },
  total: { type: Number, default: 0, min: 0, max: 1000000000 },
  notes: { type: String, maxlength: 1000 },
  partsUsed: { type: [usedPartSchema], default: [] },
  stockDeducted: { type: Boolean, default: false },
  stockDeductionInProgress: { type: Boolean, default: false },
  stockDeductedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
