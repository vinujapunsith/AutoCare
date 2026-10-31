import { Router } from "express";
import Mechanic from "../models/Mechanic.js";
import Appointment from "../models/Appointment.js";
import ServiceRequest from "../models/ServiceRequest.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";
import { readEnum, readPhone, readText, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth, adminOnly);
router.param("id", validateIdParam);
const MECHANIC_STATUSES = ["Available", "Busy", "Off Duty"];

function mechanicFields(body) {
  const fields = { name: readText(body, "name", "Mechanic name", { required: true, maxLength: 100 }) };
  if (body.phone !== undefined) fields.phone = readPhone(body, "phone", "Phone") ?? "";
  if (body.specialization !== undefined) fields.specialization = readText(body, "specialization", "Specialization", { maxLength: 100 }) ?? "";
  if (body.status !== undefined) fields.status = readEnum(body, "status", "Status", MECHANIC_STATUSES, { required: true });
  return fields;
}

router.get("/", async (req, res, next) => {
  try { res.json(await Mechanic.find().sort({ name: 1 })); } catch (e) { next(e); }
});

router.post("/", requireObjectBody, async (req, res, next) => {
  try {
    const count = await Mechanic.countDocuments();
    res.status(201).json(await Mechanic.create({
      ...mechanicFields(req.body),
      code: `M${String(count + 1).padStart(3, "0")}`
    }));
  } catch (e) { next(e); }
});

router.put("/:id", requireObjectBody, async (req, res, next) => {
  try {
    const item = await Mechanic.findByIdAndUpdate(req.params.id, mechanicFields(req.body), { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Mechanic not found" });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const item = await Mechanic.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Mechanic not found" });
    const [appointments, requests] = await Promise.all([
      Appointment.countDocuments({ mechanic: item._id }),
      ServiceRequest.countDocuments({ mechanic: item._id })
    ]);
    if (appointments || requests) {
      return res.status(400).json({ message: "This mechanic is assigned to appointments or service requests and cannot be deleted" });
    }
    await item.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
