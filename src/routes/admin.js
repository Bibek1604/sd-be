const express = require("express");
const router = express.Router();
const adminService = require("../services/adminService");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const schemas = require("../validators").admin;

router.use(authenticate, requireRole("admin"));

router.get("/results", asyncHandler(async (req, res) => {
  res.json(await adminService.getResults());
}));

router.get("/employees", asyncHandler(async (req, res) => {
  res.json(await adminService.getEmployees());
}));

router.delete("/employees/:id", validate(schemas.employeeId), asyncHandler(async (req, res) => {
  await adminService.deleteEmployee(req.params.id);
  res.json({ message: "Employee deleted" });
}));

module.exports = router;
