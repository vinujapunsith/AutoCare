import mongoose from "mongoose";

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function requireObjectBody(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ message: "Request body must be a JSON object" });
  }
  next();
}

export function validateIdParam(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid record ID" });
  }
  next();
}

export function readText(body, field, label, { required = false, maxLength = 255, uppercase = false } = {}) {
  const raw = body?.[field];
  if (raw === undefined || raw === null) {
    if (required) throw httpError(400, `${label} is required`);
    return undefined;
  }
  if (typeof raw !== "string") throw httpError(400, `${label} must be text`);
  const value = raw.trim();
  if (required && !value) throw httpError(400, `${label} is required`);
  if (value.length > maxLength) throw httpError(400, `${label} must be ${maxLength} characters or fewer`);
  return uppercase ? value.toUpperCase() : value;
}

export function readEmail(body, field = "email", label = "Email") {
  const value = readText(body, field, label, { maxLength: 254 });
  if (value === undefined || value === "") return value;
  const normalized = value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw httpError(400, `${label} must be a valid email address`);
  }
  return normalized;
}

export function readPhone(body, field = "phone", label = "Phone") {
  const value = readText(body, field, label, { maxLength: 25 });
  if (value === undefined || value === "") return value;
  if (!/^[+]?[-().\s\d]{7,25}$/.test(value)) {
    throw httpError(400, `${label} may contain digits, spaces, +, -, parentheses and periods only`);
  }
  return value;
}

export function readNumber(body, field, label, {
  required = false,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  integer = false,
  defaultValue = undefined
} = {}) {
  const raw = body?.[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw httpError(400, `${label} is required`);
    return defaultValue;
  }
  if (typeof raw === "boolean" || (typeof raw !== "string" && typeof raw !== "number")) {
    throw httpError(400, `${label} must be a number`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) throw httpError(400, `${label} must be a valid number`);
  if (value < min) throw httpError(400, `${label} must be at least ${min}`);
  if (value > max) throw httpError(400, `${label} must be no more than ${max}`);
  if (integer && !Number.isInteger(value)) throw httpError(400, `${label} must be a whole number`);
  return value;
}

export function readEnum(body, field, label, allowedValues, { required = false, defaultValue = undefined } = {}) {
  const raw = body?.[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw httpError(400, `${label} is required`);
    return defaultValue;
  }
  if (typeof raw !== "string" || !allowedValues.includes(raw)) {
    throw httpError(400, `${label} must be one of: ${allowedValues.join(", ")}`);
  }
  return raw;
}

export function readObjectId(body, field, label, { required = false } = {}) {
  const raw = body?.[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw httpError(400, `${label} is required`);
    return undefined;
  }
  if (typeof raw !== "string" || !mongoose.isValidObjectId(raw)) {
    throw httpError(400, `${label} is invalid`);
  }
  return raw;
}

export async function ensureReference(Model, id, label, { required = false } = {}) {
  if (!id) {
    if (required) throw httpError(400, `${label} is required`);
    return undefined;
  }
  if (!mongoose.isValidObjectId(id)) throw httpError(400, `${label} is invalid`);
  const exists = await Model.exists({ _id: id });
  if (!exists) throw httpError(400, `${label} was not found`);
  return id;
}

export function readDate(body, field = "date", label = "Date", { required = true } = {}) {
  const value = readText(body, field, label, { required, maxLength: 10 });
  if (value === undefined || value === "") return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw httpError(400, `${label} must use YYYY-MM-DD format`);
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw httpError(400, `${label} must be a real calendar date`);
  }
  return value;
}

export function readTime(body, field = "time", label = "Time", { required = true } = {}) {
  const value = readText(body, field, label, { required, maxLength: 5 });
  if (value === undefined || value === "") return value;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw httpError(400, `${label} must use 24-hour HH:MM format`);
  }
  return value;
}
