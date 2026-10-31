import { Router } from "express";
import Customer from "../models/Customer.js";
import { nextCustomerCode } from "../utils/customerCode.js";
import Vehicle from "../models/Vehicle.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";
import { readEmail, readPhone, readText, requireObjectBody, validateIdParam } from "../middleware/validation.js";

const router = Router();
router.use(auth, adminOnly);
router.param("id", validateIdParam);

function customerFields(body) {
  const fields = { name: readText(body, "name", "Customer name", { required: true, maxLength: 100 }) };
  if (body.phone !== undefined) fields.phone = readPhone(body, "phone", "Phone") ?? "";
  if (body.email !== undefined) fields.email = readEmail(body, "email", "Email") ?? "";
  if (body.address !== undefined) fields.address = readText(body, "address", "Address", { maxLength: 250 }) ?? "";
  return fields;
}

router.get("/", async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ name: 1 }).lean();
    const counts = await Vehicle.aggregate([{ $group: { _id: "$customer", count: { $sum: 1 } } }]);
    const map = new Map(counts.map(x => [String(x._id), x.count]));
    res.json(customers.map(c => ({ ...c, vehicleCount: map.get(String(c._id)) || 0 })));
  } catch (e) { next(e); }
});

router.post("/", requireObjectBody, async (req, res, next) => {
  try {
    const customer = await Customer.create({
      ...customerFields(req.body),
      code: await nextCustomerCode()
    });
    res.status(201).json(customer);
  } catch (e) { next(e); }
});

router.put("/:id", requireObjectBody, async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, customerFields(req.body), { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const vehicles = await Vehicle.countDocuments({ customer: customer._id });
    if (vehicles) return res.status(400).json({ message: "Delete the customer's vehicles first" });
    await customer.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
