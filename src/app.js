const adminUserRoutes = require("./routes/adminUserRoutes");
const adminNoticeRoutes = require("./routes/adminNoticeRoutes");
const adminAssignmentRoutes = require("./routes/adminAssignmentRoutes");
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const authRoutes = require("./routes/authRoutes");
const academicSessionRoutes = require("./routes/academicSessionRoutes");
const adminBoardRoutes = require("./routes/adminBoardRoutes");
const adminGradeRoutes = require("./routes/adminGradeRoutes");
const adminSubjectRoutes = require("./routes/adminSubjectRoutes");
const adminTutorRoutes = require("./routes/adminTutorRoutes");
const adminBatchRoutes = require("./routes/adminBatchRoutes");
const adminFeePlanRoutes = require("./routes/adminFeePlanRoutes");
const adminDemoSetupRoutes = require("./routes/adminDemoSetupRoutes");
const publicDemoSetupRoutes = require("./routes/publicDemoSetupRoutes");
const publicDemoRequestRoutes = require("./routes/publicDemoRequestRoutes");
const adminDemoRequestRoutes = require("./routes/adminDemoRequestRoutes");
const adminAdmissionRoutes = require("./routes/adminAdmissionRoutes");
const publicInquiryRoutes = require("./routes/publicInquiryRoutes");
const adminInquiryRoutes = require("./routes/adminInquiryRoutes");
const adminStudentRoutes = require("./routes/adminStudentRoutes");
const adminInvoiceRoutes = require("./routes/adminInvoiceRoutes");
const adminClassScheduleRoutes = require("./routes/adminClassScheduleRoutes");
const tutorScheduleRoutes = require("./routes/tutorScheduleRoutes");
const tutorStudentRoutes = require("./routes/tutorStudentRoutes");
const tutorUpdateRoutes = require("./routes/tutorUpdateRoutes");
const tutorProfileRoutes = require("./routes/tutorProfileRoutes");
const tutorAssignmentRoutes = require("./routes/tutorAssignmentRoutes");
const tutorDashboardRoutes = require("./routes/tutorDashboardRoutes");

const app = express();

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: { persistAuthorization: true },
  }),
);
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TuitionSphere API is working",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin-profile", require("./routes/adminProfileRoutes"));
app.use("/api/v1/academic-sessions", academicSessionRoutes);
app.use("/api/v1/boards", adminBoardRoutes);
app.use("/api/v1/grades", adminGradeRoutes);
app.use("/api/v1/subjects", adminSubjectRoutes);
app.use("/api/v1/tutors", adminTutorRoutes);
app.use("/api/v1/batches", adminBatchRoutes);
app.use("/api/v1/fee-plans", adminFeePlanRoutes);
app.use("/api/v1/demo-setups", adminDemoSetupRoutes);
app.use("/api/v1/public/demo-setups", publicDemoSetupRoutes);
app.use("/api/v1/public/demo-requests", publicDemoRequestRoutes);
app.use("/api/v1/demo-requests", adminDemoRequestRoutes);
app.use("/api/v1/admissions", adminAdmissionRoutes);
app.use("/api/v1/public/inquiries", publicInquiryRoutes);
app.use("/api/v1/inquiries", adminInquiryRoutes);
app.use("/api/v1/students", adminStudentRoutes);
app.use("/api/v1/invoices", adminInvoiceRoutes);
app.use("/api/v1/dashboard", require("./routes/adminDashboardRoutes"));
app.use("/api/v1/admin-users", adminUserRoutes);
app.use("/api/v1/notices", adminNoticeRoutes);
app.use("/api/v1/assignments", adminAssignmentRoutes);
app.use("/api/v1/attendance", adminAttendanceRoutes);
app.use("/api/v1/class-schedules", adminClassScheduleRoutes);
app.use("/api/v1/tutor/schedule", tutorScheduleRoutes);
app.use("/api/v1/tutor/students", tutorStudentRoutes);
app.use("/api/v1/tutor/updates", tutorUpdateRoutes);
app.use("/api/v1/tutor-profile", tutorProfileRoutes);
app.use("/api/v1/tutor/assignments", tutorAssignmentRoutes);
app.use("/api/v1/tutor/dashboard", tutorDashboardRoutes);
app.use("/api/v1/tutor/attendance", require("./routes/tutorAttendanceRoutes"));
app.use("/api/v1/student/profile", require("./routes/studentProfileRoutes"));
app.use("/api/v1/student/schedule", require("./routes/studentScheduleRoutes"));
app.use("/api/v1/student/attendance", require("./routes/studentAttendanceRoutes"));
app.use("/api/v1/student/assignments", require("./routes/studentAssignmentRoutes"));
app.use("/api/v1/student/fees", require("./routes/studentFeeRoutes"));
app.use("/api/v1/student/notices", require("./routes/studentNoticeRoutes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

app.use((error, req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : error.message,
  });
});

module.exports = app;
