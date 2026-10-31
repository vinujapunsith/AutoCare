import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Customer from "../models/Customer.js";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@autocare.lk").toLowerCase();

export default async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.id).select("name email role");
    if (!user) {
      return res.status(401).json({ message: "Account no longer exists" });
    }

                                                                           
                                                                              
    if (user.email.toLowerCase() === ADMIN_EMAIL && user.role !== "Admin") {
      user.role = "Admin";
      await user.save();
    }
    const actualRole = user.role;

    let customerId = null;
    if (actualRole === "User") {
      let customer = await Customer.findOne({ userId: user._id });

                                                                           
      if (!customer) {
        customer = await Customer.findOne({ email: user.email, userId: { $exists: false } });
        if (customer) {
          customer.userId = user._id;
          customer.name = user.name;
          await customer.save();
        }
      }

      if (!customer) {
        customer = await Customer.create({
          code: `CU-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name: user.name,
          email: user.email,
          userId: user._id
        });
      }
      customerId = String(customer._id);
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: actualRole,
      customerId
    };
    next();
  } catch (error) {
    next(error);
  }
}
