import { Router } from "express";
import Service from "../models/Service.js";
import Appointment from "../models/Appointment.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Part from "../models/Part.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";
import { ensureReference, httpError, readNumber, readObjectId, readText, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth);
router.param("id", validateIdParam);

async function serviceFields(body) {
  const fields = { name: readText(body, "name", "Service name", { required: true, maxLength: 100 }) };
  if (body.category !== undefined) fields.category = readText(body, "category", "Category", { maxLength: 60 }) ?? "";
  fields.price = body.price === undefined ? 0 : readNumber(body, "price", "Price", { required: true, min: 0, max: 1000000000 });
  if (body.duration !== undefined) fields.duration = readText(body, "duration", "Duration", { maxLength: 40 }) ?? "";

  if (body.partsRequired !== undefined) {
    if (!Array.isArray(body.partsRequired)) throw httpError(400, "Parts required must be a list");
    const usedPartIds = new Set();
    fields.partsRequired = [];

    for (const [index, entry] of body.partsRequired.entries()) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw httpError(400, `Part entry ${index + 1} is invalid`);
      }
      const partId = readObjectId(entry, "part", `Part ${index + 1}`, { required: true });
      const quantity = readNumber(entry, "quantity", `Quantity for part ${index + 1}`, { required: true, min: 1, max: 100000, integer: true });
      if (usedPartIds.has(partId)) throw httpError(400, "A part can only be added once to a service");
      await ensureReference(Part, partId, `Part ${index + 1}`, { required: true });
      usedPartIds.add(partId);
      fields.partsRequired.push({ part: partId, quantity });
    }
  }

  return fields;
}

router.get("/", async (req, res, next) => {
  try { res.json(await Service.find().populate({ path: "partsRequired.part", select: "name code" }).sort({ name: 1 })); } catch (e) { next(e); }
});

router.post("/", adminOnly, requireObjectBody, async (req, res, next) => {
  try { res.status(201).json(await Service.create(await serviceFields(req.body))); } catch (e) { next(e); }
});

router.put("/:id", adminOnly, requireObjectBody, async (req, res, next) => {
  try {
    const item = await Service.findByIdAndUpdate(req.params.id, await serviceFields(req.body), { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Service not found" });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete("/:id", adminOnly, async (req, res, next) => {
  try {
    const item = await Service.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Service not found" });
    const [appointments, requests] = await Promise.all([
      Appointment.countDocuments({ service: item._id }),
      ServiceRequest.countDocuments({ service: item._id })
    ]);
    if (appointments || requests) {
      return res.status(400).json({ message: "This service is used by appointments or service requests and cannot be deleted" });
    }
    await item.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
