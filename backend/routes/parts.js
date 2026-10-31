import { Router } from "express";
import Part from "../models/Part.js";
import Service from "../models/Service.js";
import ServiceRequest from "../models/ServiceRequest.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";
import { readNumber, readText, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth, adminOnly);
router.param("id", validateIdParam);

function partFields(body) {
  const fields = {
    name: readText(body, "name", "Part name", { required: true, maxLength: 100 })
  };
  if (body.category !== undefined) fields.category = readText(body, "category", "Category", { maxLength: 60 }) ?? "";
  if (body.stock !== undefined) fields.stock = readNumber(body, "stock", "Stock quantity", { required: true, min: 0, max: 100000000, integer: true });
  else fields.stock = 0;
  if (body.price !== undefined) fields.price = readNumber(body, "price", "Price", { required: true, min: 0, max: 1000000000 });
  else fields.price = 0;
  if (body.supplier !== undefined) fields.supplier = readText(body, "supplier", "Supplier", { maxLength: 100 }) ?? "";
  return fields;
}

router.get("/", async (req, res, next) => {
  try { res.json(await Part.find().sort({ name: 1 })); } catch (e) { next(e); }
});

router.post("/", requireObjectBody, async (req, res, next) => {
  try {
    const count = await Part.countDocuments();
    res.status(201).json(await Part.create({
      ...partFields(req.body),
      code: `P${String(count + 1).padStart(3, "0")}`
    }));
  } catch (e) { next(e); }
});

router.put("/:id", requireObjectBody, async (req, res, next) => {
  try {
    const item = await Part.findByIdAndUpdate(req.params.id, partFields(req.body), { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Part not found" });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const item = await Part.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Part not found" });
    const [services, requests] = await Promise.all([
      Service.countDocuments({ "partsRequired.part": item._id }),
      ServiceRequest.countDocuments({ "partsUsed.part": item._id })
    ]);
    if (services || requests) {
      return res.status(400).json({ message: "This part is assigned to a service or used in a service request and cannot be deleted" });
    }
    await item.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
