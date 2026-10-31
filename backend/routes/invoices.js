import { Router } from "express";
import Invoice from "../models/Invoice.js";
import ServiceRequest from "../models/ServiceRequest.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";
import { ensureReference, readDate, readEnum, readNumber, readObjectId, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth, adminOnly);
router.param("id", validateIdParam);
const INVOICE_STATUSES = ["Paid", "Unpaid", "Partially Paid"];

const populated = q => q.populate({
  path: "serviceRequest",
  populate: [
    { path: "vehicle", populate: { path: "customer" } },
    { path: "service" },
    { path: "mechanic" }
  ]
});

function invoiceFields(body) {
  return {
    serviceRequest: readObjectId(body, "serviceRequest", "Service request", { required: true }),
    date: readDate(body, "date", "Date"),
    total: readNumber(body, "total", "Total", { required: true, min: 0, max: 1000000000 }),
    status: readEnum(body, "status", "Status", INVOICE_STATUSES, { defaultValue: "Unpaid" })
  };
}

router.get("/", async (req, res, next) => {
  try { res.json(await populated(Invoice.find().sort({ date: -1 }))); } catch (e) { next(e); }
});

router.post("/", requireObjectBody, async (req, res, next) => {
  try {
    const fields = invoiceFields(req.body);
    await ensureReference(ServiceRequest, fields.serviceRequest, "Service request", { required: true });
    const count = await Invoice.countDocuments();
    const invoice = await Invoice.create({ ...fields, code: `INV-${String(count + 1).padStart(3, "0")}` });
    res.status(201).json(await populated(Invoice.findById(invoice._id)));
  } catch (e) { next(e); }
});

router.put("/:id/status", requireObjectBody, async (req, res, next) => {
  try {
    const status = readEnum(req.body, "status", "Status", INVOICE_STATUSES, { required: true });
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    await invoice.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
