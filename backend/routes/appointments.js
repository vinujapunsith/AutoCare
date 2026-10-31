import { Router } from "express";
import Appointment from "../models/Appointment.js";
import Vehicle from "../models/Vehicle.js";
import Service from "../models/Service.js";
import Mechanic from "../models/Mechanic.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";
import { ensureReference, readDate, readEnum, readObjectId, readText, readTime, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth);
router.param("id", validateIdParam);
const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const populated = q => q.populate({
  path: "vehicle",
  populate: { path: "customer" }
}).populate("service mechanic");

async function appointmentFields(body, { forcePending = false } = {}) {
  const vehicleId = readObjectId(body, "vehicle", "Vehicle", { required: true });
  const serviceId = readObjectId(body, "service", "Service", { required: true });
  const mechanicId = readObjectId(body, "mechanic", "Mechanic");
  await ensureReference(Vehicle, vehicleId, "Vehicle", { required: true });
  await ensureReference(Service, serviceId, "Service", { required: true });
  if (mechanicId) await ensureReference(Mechanic, mechanicId, "Mechanic");

  const payload = {
    vehicle: vehicleId,
    service: serviceId,
    date: readDate(body, "date", "Date"),
    time: readTime(body, "time", "Time"),
    notes: readText(body, "notes", "Notes", { maxLength: 1000 }) ?? "",
    status: forcePending ? "Pending" : readEnum(body, "status", "Status", APPOINTMENT_STATUSES, { defaultValue: "Pending" })
  };
  if (mechanicId) payload.mechanic = mechanicId;
  return payload;
}

router.get("/", async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== "Admin") {
      const vehicles = await Vehicle.find({ customer: req.user.customerId }).select("_id").lean();
      filter = { vehicle: { $in: vehicles.map(v => v._id) } };
    }
    res.json(await populated(Appointment.find(filter).sort({ date: -1, time: -1 })));
  } catch (e) { next(e); }
});

router.post("/", requireObjectBody, async (req, res, next) => {
  try {
    const payload = await appointmentFields(req.body, { forcePending: req.user.role !== "Admin" });
    if (req.user.role !== "Admin") {
      delete payload.mechanic;
      const ownedVehicle = await Vehicle.exists({ _id: payload.vehicle, customer: req.user.customerId });
      if (!ownedVehicle) return res.status(403).json({ message: "You can only book appointments for your own vehicles" });
    }
    const item = await Appointment.create(payload);
    res.status(201).json(await populated(Appointment.findById(item._id)));
  } catch (e) { next(e); }
});

router.put("/:id/cancel", requireObjectBody, async (req, res, next) => {
  try {
    if (req.user.role === "Admin") {
      return res.status(400).json({ message: "Administrators should update the appointment status instead" });
    }
    const vehicles = await Vehicle.find({ customer: req.user.customerId }).select("_id").lean();
    const item = await Appointment.findOne({
      _id: req.params.id,
      vehicle: { $in: vehicles.map(v => v._id) },
      status: "Pending"
    });
    if (!item) return res.status(404).json({ message: "Pending appointment not found" });
    item.status = "Cancelled";
    await item.save();
    res.json(await populated(Appointment.findById(item._id)));
  } catch (e) { next(e); }
});

router.put("/:id", adminOnly, requireObjectBody, async (req, res, next) => {
  try {
    const payload = await appointmentFields(req.body);
    const item = await populated(Appointment.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }));
    if (!item) return res.status(404).json({ message: "Appointment not found" });
    res.json(item);
  } catch (e) { next(e); }
});

router.put("/:id/status", adminOnly, requireObjectBody, async (req, res, next) => {
  try {
    const status = readEnum(req.body, "status", "Status", APPOINTMENT_STATUSES, { required: true });
    const item = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Appointment not found" });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete("/:id", adminOnly, async (req, res, next) => {
  try {
    const item = await Appointment.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Appointment not found" });
    await item.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
