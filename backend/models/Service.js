import mongoose from "mongoose";

const servicePartSchema = new mongoose.Schema({
  part: { type: mongoose.Schema.Types.ObjectId, ref: "Part", required: true },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: value => Number.isInteger(value), message: "Part quantity must be a whole number" }
  }
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  category: { type: String, trim: true, maxlength: 60 },
  price: { type: Number, default: 0, min: 0, max: 1000000000 },
  duration: { type: String, trim: true, maxlength: 40 },
  partsRequired: { type: [servicePartSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("Service", serviceSchema);
