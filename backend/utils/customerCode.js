import Customer from "../models/Customer.js";
import Counter from "../models/Counter.js";

export async function nextCustomerCode() {
  const existingCustomers = await Customer.find({ code: /^C\d+$/ })
    .select("code")
    .lean();

  const highestExisting = existingCustomers.reduce((highest, customer) => {
    const number = Number(String(customer.code || "").slice(1));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);

  try {
    await Counter.updateOne(
      { _id: "customer" },
      { $max: { seq: highestExisting } },
      { upsert: true }
    );
  } catch (error) {
    // Another request may create the counter at the same time.
    if (error.code !== 11000) throw error;
  }

  const counter = await Counter.findOneAndUpdate(
    { _id: "customer" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `C${String(counter.seq).padStart(3, "0")}`;
}
