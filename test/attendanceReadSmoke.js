require('dotenv').config({ quiet: true });
const prisma = require('../src/config/prisma');
const service = require('../src/services/admins/adminAttendanceService');
service.context().then((data) => {
  console.log(JSON.stringify({ batches: data.batches.length, enrolledStudents: data.students.length, schedules: data.schedules.length, attendanceRecords: data.records.length, leaveRequests: data.requests.length }));
}).catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
