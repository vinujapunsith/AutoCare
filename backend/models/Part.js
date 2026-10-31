import mongoose from "mongoose";

const partSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, trim: true, maxlength: 30 },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  category: { type: String, trim: true, maxlength: 60 },
  stock: { type: Number, default: 0, min: 0, validate: { validator: value => Number.isInteger(value), message: "Stock must be a whole number" } },
  price: { type: Number, default: 0, min: 0, max: 1000000000 },
  supplier: { type: String, trim: true, maxlength: 100 }
}, { timestamps: true });

export default mongoose.model("Part", partSchema);
