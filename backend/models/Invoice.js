import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, trim: true, maxlength: 30 },
  serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceRequest", required: true },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format"] },
  total: { type: Number, default: 0, min: 0, max: 1000000000 },
  status: { type: String, enum: ["Paid", "Unpaid", "Partially Paid"], default: "Unpaid" }
}, { timestamps: true });

export default mongoose.model("Invoice", invoiceSchema);
