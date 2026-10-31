import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  mechanic: { type: mongoose.Schema.Types.ObjectId, ref: "Mechanic" },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format"] },
  time: { type: String, required: true, match: [/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Time must use 24-hour HH:MM format"] },
  status: { type: String, enum: ["Pending", "Confirmed", "Completed", "Cancelled"], default: "Pending" },
  notes: { type: String, maxlength: 1000 }
}, { timestamps: true });

export default mongoose.model("Appointment", appointmentSchema);
