import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import customerRoutes from "./routes/customers.js";
import vehicleRoutes from "./routes/vehicles.js";
import serviceRoutes from "./routes/services.js";
import mechanicRoutes from "./routes/mechanics.js";
import partRoutes from "./routes/parts.js";
import appointmentRoutes from "./routes/appointments.js";
import serviceRequestRoutes from "./routes/serviceRequests.js";
import invoiceRoutes from "./routes/invoices.js";
import dashboardRoutes from "./routes/dashboard.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "AutoCare API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/mechanics", mechanicRoutes);
app.use("/api/parts", partRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  let status = err.status || 500;
  let message = err.message || "Server error";

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON request body";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors || {}).map(item => item.message).filter(Boolean).join("; ") || "The submitted data is invalid";
  } else if (err.name === "CastError") {
    status = 400;
    message = "One of the submitted values has an invalid format";
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    message = `${field} already exists. Please use a different value`;
  } else if (status >= 500) {
    message = "An unexpected server error occurred. Please try again";
  }

  res.status(status).json({ message });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`AutoCare API running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
