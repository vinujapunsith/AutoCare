import { Router } from "express";
import Vehicle from "../models/Vehicle.js";
import Appointment from "../models/Appointment.js";
import ServiceRequest from "../models/ServiceRequest.js";
import auth from "../middleware/auth.js";
import { adminOnly } from "../middleware/roles.js";

const router = Router();
router.use(auth, adminOnly);

router.get("/", async (req, res, next) => {
  try {
    const [vehicles, upcoming, inProgress, completed, appointments, statuses] = await Promise.all([
      Vehicle.countDocuments(),
      Appointment.countDocuments({ status: { $in: ["Pending", "Confirmed"] } }),
      ServiceRequest.countDocuments({ status: { $in: ["Pending", "In Progress"] } }),
      ServiceRequest.countDocuments({ status: "Completed" }),
      Appointment.find({ status: { $in: ["Pending", "Confirmed"] } })
        .populate({ path: "vehicle", populate: { path: "customer" } })
        .populate("service mechanic")
        .sort({ date: 1, time: 1 })
        .limit(8),
      ServiceRequest.aggregate([
        { $group: { _id: "$status", total: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ])
    ]);

    res.json({
      totals: { vehicles, upcoming, inProgress, completed },
      appointments,
      statuses: statuses.map(x => ({ status: x._id, total: x.total }))
    });
  } catch (e) {
    next(e);
  }
});

export default router;
