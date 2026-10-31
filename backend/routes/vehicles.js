import { Router } from "express";
import Vehicle from "../models/Vehicle.js";
import Customer from "../models/Customer.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Appointment from "../models/Appointment.js";
import auth from "../middleware/auth.js";
import { ensureReference, readEnum, readNumber, readObjectId, readText, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth);
router.param("id", validateIdParam);
const VEHICLE_TYPES = ["Car", "SUV", "Van", "Truck", "Motorcycle"];

async function vehicleFields(body, req, { creating = false } = {}) {
  const payload = {
    registration: readText(body, "registration", "Registration", { required: true, maxLength: 20, uppercase: true }),
    brand: readText(body, "brand", "Brand", { required: true, maxLength: 60 }),
    model: readText(body, "model", "Model", { required: true, maxLength: 60 }),
    type: readEnum(body, "type", "Vehicle type", VEHICLE_TYPES, { required: true, defaultValue: "Car" })
  };
  const year = readNumber(body, "year", "Year", { min: 1900, max: new Date().getFullYear() + 1, integer: true });
  payload.year = year ?? null;

  if (req.user.role === "Admin") {
    const customerId = readObjectId(body, "customer", "Customer", { required: true });
    payload.customer = await ensureReference(Customer, customerId, "Customer", { required: true });
  } else if (creating) {
    if (!req.user.customerId) throw Object.assign(new Error("Customer profile not found"), { status: 400 });
    payload.customer = req.user.customerId;
  }
  return payload;
}

router.get("/", async (req, res, next) => {
  try {
    const filter = req.user.role === "Admin" ? {} : { customer: req.user.customerId };
    res.json(await Vehicle.find(filter).populate("customer").sort({ registration: 1 }));
  } catch (e) { next(e); }
});

router.post("/", requireObjectBody, async (req, res, next) => {
  try {
    const payload = await vehicleFields(req.body, req, { creating: true });
    res.status(201).json(await (await Vehicle.create(payload)).populate("customer"));
  } catch (e) { next(e); }
});

router.put("/:id", requireObjectBody, async (req, res, next) => {
  try {
    const filter = req.user.role === "Admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, customer: req.user.customerId };
    const update = await vehicleFields(req.body, req);
    if (req.user.role !== "Admin") delete update.customer;
    const vehicle = await Vehicle.findOneAndUpdate(filter, update, { new: true, runValidators: true }).populate("customer");
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found or access denied" });
    res.json(vehicle);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const filter = req.user.role === "Admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, customer: req.user.customerId };
    const vehicle = await Vehicle.findOne(filter);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found or access denied" });

    const dependent = await Promise.all([
      ServiceRequest.countDocuments({ vehicle: vehicle._id }),
      Appointment.countDocuments({ vehicle: vehicle._id })
    ]);
    if (dependent.some(Boolean)) {
      return res.status(400).json({ message: "This vehicle has appointments or service records. Remove those records first before deleting the vehicle." });
    }

    await vehicle.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/:id/history", async (req, res, next) => {
  try {
    if (req.user.role !== "Admin") {
      const ownedVehicle = await Vehicle.exists({ _id: req.params.id, customer: req.user.customerId });
      if (!ownedVehicle) return res.status(404).json({ message: "Vehicle not found or access denied" });
    }
    const rows = await ServiceRequest.find({ vehicle: req.params.id })
      .populate("service mechanic")
      .sort({ date: -1 });
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
