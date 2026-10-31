import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Customer from "../models/Customer.js";
import { nextCustomerCode } from "../utils/customerCode.js";
import auth from "../middleware/auth.js";
import { readPhone, requireObjectBody } from "../middleware/validation.js";

const router = Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@autocare.lk").toLowerCase();

function tokenFor(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

async function createCustomerProfile(user, phone) {
  let customer = await Customer.findOne({ userId: user._id });
  if (!customer) {
    customer = await Customer.findOne({ email: user.email, userId: { $exists: false } });
  }

  if (customer) {
    customer.userId = user._id;
    customer.name = user.name;
    customer.email = user.email;
    if (phone !== undefined) customer.phone = phone;
    await customer.save();
    return customer;
  }

  return Customer.create({
    code: await nextCustomerCode(),
    name: user.name,
    phone: phone || "",
    email: user.email,
    userId: user._id
  });
}

router.post("/register", requireObjectBody, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const phone = readPhone(req.body, "phone", "Phone");
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ message: "Name, phone number, email and password are required" });
    }
    if (name.length > 100) {
      return res.status(400).json({ message: "Name must be 100 characters or fewer" });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ message: "Password must contain between 6 and 128 characters" });
    }
    if (email === ADMIN_EMAIL) {
      return res.status(400).json({ message: "This email is reserved for the administrator" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "User"
    });

    try {
      await createCustomerProfile(user, phone);
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      throw error;
    }

    res.status(201).json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    next(e);
  }
});

router.post("/login", requireObjectBody, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

                                                                           
                                                                            
    if (email === ADMIN_EMAIL && user.role !== "Admin") {
      user.role = "Admin";
      await user.save();
    }
    if (user.role === "User") await createCustomerProfile(user);

    res.json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Account not found" });

    const profile = user.toObject();
    if (user.role === "User") {
      const customer = await Customer.findOne({ userId: user._id }).select("phone").lean();
      profile.phone = customer?.phone || "";
    }
    res.json(profile);
  } catch (e) {
    next(e);
  }
});

router.put("/me", auth, requireObjectBody, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const currentPassword = String(req.body.currentPassword || "");

    if (!name) return res.status(400).json({ message: "Name is required" });
    if (name.length > 100) return res.status(400).json({ message: "Name must be 100 characters or fewer" });
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found" });
    const phone = user.role === "User" ? readPhone(req.body, "phone", "Phone") : undefined;

    const emailChanged = email !== user.email.toLowerCase();
    if (emailChanged) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Enter your current password to change your email" });
      }
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      if (email === ADMIN_EMAIL && user.role !== "Admin") {
        return res.status(400).json({ message: "This email is reserved for the administrator" });
      }

      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) return res.status(409).json({ message: "Email already registered" });
      user.email = email;
    }

    user.name = name;
    await user.save();

    let customerProfile = null;
    if (user.role === "User") {
      customerProfile = await createCustomerProfile(user, phone);
    }

    const updated = await User.findById(user._id).select("-password");
    const profile = updated.toObject();
    if (customerProfile) profile.phone = customerProfile.phone || "";
    res.json(profile);
  } catch (e) {
    next(e);
  }
});

router.put("/change-password", auth, requireObjectBody, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Complete all password fields" });
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ message: "New password must contain between 6 and 128 characters" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirmation do not match" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: "Choose a password different from your current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (e) {
    next(e);
  }
});

export default router;
