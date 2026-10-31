import { Router } from "express";
import ServiceRequest from "../models/ServiceRequest.js";
import Invoice from "../models/Invoice.js";
import Vehicle from "../models/Vehicle.js";
import Service from "../models/Service.js";
import Mechanic from "../models/Mechanic.js";
import Part from "../models/Part.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";
import { ensureReference, httpError, readDate, readEnum, readNumber, readObjectId, readText, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth, adminOnly);
router.param("id", validateIdParam);
const REQUEST_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

const populated = q => q.populate({
  path: "vehicle",
  populate: { path: "customer" }
}).populate("service mechanic");

async function serviceRequestFields(body) {
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
    total: readNumber(body, "total", "Total", { min: 0, max: 1000000000, defaultValue: 0 }),
    status: readEnum(body, "status", "Status", REQUEST_STATUSES, { defaultValue: "Pending" }),
    notes: readText(body, "notes", "Notes", { maxLength: 1000 }) ?? ""
  };
  if (mechanicId) payload.mechanic = mechanicId;
  return payload;
}

async function getPartsSnapshot(serviceId) {
  const service = await Service.findById(serviceId).populate("partsRequired.part");
  if (!service) throw httpError(400, "Service was not found");

  return (service.partsRequired || []).map(item => {
    if (!item.part) throw httpError(400, "A required part for this service is no longer available");
    return {
      part: item.part._id,
      code: item.part.code,
      name: item.part.name,
      quantity: item.quantity,
      unitPrice: item.part.price || 0
    };
  });
}

async function completeWithStockDeduction(requestId) {
  const current = await ServiceRequest.findById(requestId);
  if (!current) throw httpError(404, "Service request not found");
  if (current.stockDeducted) return current;
  if (current.stockDeductionInProgress) throw httpError(409, "Stock deduction is already being processed. Please try again shortly");

  const previousStatus = current.status;
  const claimed = await ServiceRequest.findOneAndUpdate(
    {
      _id: requestId,
      status: previousStatus,
      stockDeducted: { $ne: true },
      stockDeductionInProgress: { $ne: true }
    },
    { $set: { stockDeductionInProgress: true } },
    { new: true }
  );

  if (!claimed) {
    const latest = await ServiceRequest.findById(requestId);
    if (latest?.stockDeducted) return latest;
    if (latest?.stockDeductionInProgress) throw httpError(409, "Stock deduction is already being processed. Please try again shortly");
    throw httpError(409, "This service request is being updated. Please try again");
  }

  const deducted = [];
  try {
    for (const usedPart of claimed.partsUsed || []) {
      const quantity = Number(usedPart.quantity);
      if (!usedPart.part || !Number.isInteger(quantity) || quantity < 1) {
        throw httpError(400, `The saved quantity for ${usedPart.name || "a required part"} is invalid`);
      }

      const updatedPart = await Part.findOneAndUpdate(
        { _id: usedPart.part, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updatedPart) {
        const existingPart = await Part.findById(usedPart.part).select("name stock");
        if (!existingPart) throw httpError(400, `${usedPart.name || "A required part"} is no longer in inventory`);
        throw httpError(400, `Insufficient stock for ${usedPart.name || existingPart.name}. Available: ${existingPart.stock}; required: ${quantity}`);
      }
      deducted.push({ part: usedPart.part, quantity });
    }

    const completed = await ServiceRequest.findOneAndUpdate(
      { _id: requestId, stockDeductionInProgress: true },
      { $set: { status: "Completed", stockDeducted: true, stockDeductionInProgress: false, stockDeductedAt: new Date() } },
      { new: true }
    );
    if (!completed) throw httpError(409, "The service request could not be finalized. Please try again");
    return completed;
  } catch (error) {
    for (const entry of deducted) {
      await Part.updateOne({ _id: entry.part }, { $inc: { stock: entry.quantity } });
    }
    await ServiceRequest.updateOne(
      { _id: requestId, stockDeductionInProgress: true },
      { $set: { status: previousStatus, stockDeducted: false, stockDeductionInProgress: false, stockDeductedAt: null } }
    );
    throw error;
  }
}

router.get("/", async (req, res, next) => {
  try { res.json(await populated(ServiceRequest.find().sort({ date: -1 }))); } catch (e) { next(e); }
});

router.post("/", requireObjectBody, async (req, res, next) => {
  try {
    const fields = await serviceRequestFields(req.body);
    fields.partsUsed = await getPartsSnapshot(fields.service);
    fields.status = "Pending";
    const count = await ServiceRequest.countDocuments();
    const item = await ServiceRequest.create({
      ...fields,
      code: `SR${String(count + 1).padStart(3, "0")}`
    });
    res.status(201).json(await populated(ServiceRequest.findById(item._id)));
  } catch (e) { next(e); }
});

router.put("/:id", requireObjectBody, async (req, res, next) => {
  try {
    const current = await ServiceRequest.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Service request not found" });
    if (current.stockDeducted || current.stockDeductionInProgress || current.status === "Completed") {
      return res.status(400).json({ message: "A completed service request cannot be edited after stock has been processed" });
    }

    const fields = await serviceRequestFields(req.body);
    fields.status = current.status;
    if (String(fields.service) !== String(current.service)) {
      fields.partsUsed = await getPartsSnapshot(fields.service);
    }
    const item = await ServiceRequest.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
    res.json(await populated(ServiceRequest.findById(item._id)));
  } catch (e) { next(e); }
});

router.put("/:id/status", requireObjectBody, async (req, res, next) => {
  try {
    const status = readEnum(req.body, "status", "Status", REQUEST_STATUSES, { required: true });
    const current = await ServiceRequest.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Service request not found" });

    if (status === "Completed") {
      await completeWithStockDeduction(req.params.id);
    } else {
      if (current.stockDeductionInProgress) {
        return res.status(409).json({ message: "Stock deduction is being processed. Please try again shortly" });
      }
      if (current.stockDeducted) {
        return res.status(400).json({ message: "This request is completed and its stock has already been deducted. Its status cannot be changed" });
      }
      const item = await ServiceRequest.findOneAndUpdate(
        { _id: req.params.id, stockDeducted: { $ne: true } },
        { $set: { status } },
        { new: true }
      );
      if (!item) return res.status(409).json({ message: "This service request is being updated. Please try again" });
    }

    res.json(await populated(ServiceRequest.findById(req.params.id)));
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const item = await ServiceRequest.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Service request not found" });
    if (item.stockDeducted || item.stockDeductionInProgress) {
      return res.status(400).json({ message: "This service request has already processed inventory and cannot be deleted" });
    }
    const invoices = await Invoice.countDocuments({ serviceRequest: item._id });
    if (invoices) {
      return res.status(400).json({ message: "This service request has an invoice. Delete the linked invoice first" });
    }
    await item.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
