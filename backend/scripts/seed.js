import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Customer from "../models/Customer.js";
import Vehicle from "../models/Vehicle.js";
import Service from "../models/Service.js";
import Mechanic from "../models/Mechanic.js";
import Part from "../models/Part.js";
import Appointment from "../models/Appointment.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Invoice from "../models/Invoice.js";

dotenv.config();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@autocare.lk").toLowerCase();

await mongoose.connect(process.env.MONGO_URI);

await Promise.all([
  User.deleteMany({}),
  Customer.deleteMany({}),
  Vehicle.deleteMany({}),
  Service.deleteMany({}),
  Mechanic.deleteMany({}),
  Part.deleteMany({}),
  Appointment.deleteMany({}),
  ServiceRequest.deleteMany({}),
  Invoice.deleteMany({})
]);

await User.create({
  name: "Vinuja Wijesinghe",
  email: ADMIN_EMAIL,
  password: await bcrypt.hash("Admin123!", 10),
  role: "Admin"
});

const customers = await Customer.insertMany([
  { code:"C001", name:"Nimal Perera", phone:"0771234567", email:"nimal@gmail.com", address:"Galle" },
  { code:"C002", name:"Saman Kumara", phone:"0772345678", email:"saman@gmail.com", address:"Matara" },
  { code:"C003", name:"Kasun Silva", phone:"0773456789", email:"kasun@gmail.com", address:"Galle" },
  { code:"C004", name:"Anjali Fernando", phone:"0774567890", email:"anjali@gmail.com", address:"Colombo" }
]);

const vehicles = await Vehicle.insertMany([
  { registration:"BCA 1234", brand:"Toyota", model:"Corolla", year:2018, type:"Car", customer:customers[0]._id },
  { registration:"CAA 5678", brand:"Honda", model:"Civic", year:2020, type:"Car", customer:customers[1]._id },
  { registration:"CAR 9012", brand:"Suzuki", model:"Alto", year:2017, type:"Car", customer:customers[2]._id },
  { registration:"WP C 3456", brand:"Nissan", model:"X-Trail", year:2021, type:"SUV", customer:customers[3]._id }
]);

const services = await Service.insertMany([
  { name:"Oil Change", category:"Maintenance", price:8500, duration:"1 hour" },
  { name:"Brake Service", category:"Brakes", price:15000, duration:"2 hours" },
  { name:"General Checkup", category:"Inspection", price:12000, duration:"1.5 hours" },
  { name:"Tire Replacement", category:"Tires", price:20000, duration:"1 hour" }
]);

const mechanics = await Mechanic.insertMany([
  { code:"M001", name:"Pradeep Silva", phone:"0771112222", specialization:"Engine / Electrical", status:"Available" },
  { code:"M002", name:"Nuwan Perera", phone:"0773334444", specialization:"Brakes / Suspension", status:"Busy" },
  { code:"M003", name:"Sameera Fernando", phone:"0775556666", specialization:"AC & Heating", status:"Available" }
]);

await Part.insertMany([
  { code:"P001", name:"Oil Filter", category:"Filters", stock:45, price:1200, supplier:"Auto Parts Lanka" },
  { code:"P002", name:"Brake Pad", category:"Brakes", stock:12, price:7500, supplier:"BrakeTech" },
  { code:"P003", name:"Air Filter", category:"Filters", stock:28, price:2000, supplier:"Auto Parts Lanka" },
  { code:"P004", name:"Spark Plug", category:"Ignition", stock:35, price:1400, supplier:"NGK Dealer" },
  { code:"P005", name:"Battery", category:"Electrical", stock:8, price:18000, supplier:"Exide Dealer" }
]);

await Appointment.insertMany([
  { vehicle:vehicles[0]._id, service:services[0]._id, mechanic:mechanics[0]._id, date:"2026-09-24", time:"09:00", status:"Confirmed", notes:"Regular maintenance" },
  { vehicle:vehicles[1]._id, service:services[1]._id, mechanic:mechanics[1]._id, date:"2026-09-24", time:"11:30", status:"Confirmed", notes:"Brake inspection" },
  { vehicle:vehicles[2]._id, service:services[2]._id, date:"2026-09-25", time:"10:00", status:"Pending", notes:"Full checkup" }
]);

const requests = await ServiceRequest.insertMany([
  { code:"SR001", vehicle:vehicles[0]._id, service:services[0]._id, mechanic:mechanics[0]._id, date:"2026-09-23", status:"In Progress", total:8500 },
  { code:"SR002", vehicle:vehicles[1]._id, service:services[1]._id, mechanic:mechanics[1]._id, date:"2026-09-20", status:"Completed", total:15000 },
  { code:"SR003", vehicle:vehicles[2]._id, service:services[2]._id, date:"2026-09-18", status:"Pending", total:12000 },
  { code:"SR004", vehicle:vehicles[3]._id, service:services[3]._id, mechanic:mechanics[2]._id, date:"2026-09-15", status:"Completed", total:20000 }
]);

await Invoice.insertMany([
  { code:"INV-001", serviceRequest:requests[1]._id, date:"2026-09-20", total:15000, status:"Paid" },
  { code:"INV-002", serviceRequest:requests[3]._id, date:"2026-09-15", total:20000, status:"Paid" }
]);

console.log("Database seeded.");
console.log(`Login: ${ADMIN_EMAIL} / Admin123!`);
await mongoose.disconnect();
