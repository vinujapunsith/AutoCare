export function adminOnly(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ message: "Administrator access required" });
  }
  next();
}
