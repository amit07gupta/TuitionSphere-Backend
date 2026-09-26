const swaggerJsdoc = require("swagger-jsdoc");

const entityDefinitions = {
  "academic-sessions": {
    tag: "Academic Sessions",
    schema: "AcademicSessionInput",
  },
  boards: { tag: "Boards", schema: "BoardInput" },
  grades: { tag: "Grades", schema: "GradeInput" },
  subjects: { tag: "Subjects", schema: "SubjectInput" },
  tutors: { tag: "Tutors", schema: "TutorInput" },
  batches: { tag: "Batches", schema: "BatchInput" },
  "fee-plans": { tag: "Fee Plans", schema: "FeePlanInput" },
  "demo-setups": { tag: "Demo Setups", schema: "DemoSetupInput" },
};

function successResponse(description = "Successful response") {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/SuccessResponse" },
      },
    },
  };
}

const protectedResponses = {
  401: { description: "Missing, invalid, or expired access token" },
  403: { description: "Admin access is required" },
};

const paths = {
  "/api/health": {
    get: {
      tags: ["System"],
      summary: "Check API health",
      responses: { 200: successResponse("API is running") },
    },
  },
  "/api/v1/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Log in and receive a JWT access token",
      description: "Authenticates active Admin, Super Admin, Tutor or Student accounts. Tutor responses include tutorId for Tutor Portal ownership checks.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginInput" },
          },
        },
      },
      responses: {
        200: successResponse("Login successful"),
        400: { description: "Email and password are required" },
        401: { description: "Invalid credentials" },
      },
    },
  },
  "/api/v1/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Get the currently authenticated user",
      description: "Returns the database-backed account and role profile. Tutor accounts include tutorId, employee code and designation.",
      responses: {
        200: successResponse(),
        401: protectedResponses[401],
        404: { description: "User not found" },
      },
    },
  },
  "/api/v1/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Log out and revoke the current tracked session",
      responses: {
        200: successResponse("Logout successful"),
        401: protectedResponses[401],
      },
    },
  },
};

for (const [resource, definition] of Object.entries(entityDefinitions)) {
  const collectionPath = `/api/v1/${resource}`;
  const itemPath = `${collectionPath}/{id}`;
  const requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${definition.schema}` },
      },
    },
  };

  paths[collectionPath] = {
    get: {
      tags: [definition.tag],
      summary: `List ${definition.tag.toLowerCase()}`,
      responses: { 200: successResponse(), ...protectedResponses },
    },
    post: {
      tags: [definition.tag],
      summary: `Create ${definition.tag.toLowerCase()}`,
      requestBody,
      responses: {
        201: successResponse("Created successfully"),
        400: { description: "Validation failed" },
        409: { description: "A matching record already exists" },
        ...protectedResponses,
      },
    },
  };

  paths[itemPath] = {
    get: {
      tags: [definition.tag],
      summary: `Get one ${definition.tag.toLowerCase()} record`,
      parameters: [{ $ref: "#/components/parameters/ResourceId" }],
      responses: {
        200: successResponse(),
        404: { description: "Record not found" },
        ...protectedResponses,
      },
    },
    put: {
      tags: [definition.tag],
      summary: `Update ${definition.tag.toLowerCase()}`,
      parameters: [{ $ref: "#/components/parameters/ResourceId" }],
      requestBody,
      responses: {
        200: successResponse("Updated successfully"),
        400: { description: "Validation failed" },
        404: { description: "Record not found" },
        ...protectedResponses,
      },
    },
  };

  if (resource !== "academic-sessions") {
    paths[itemPath].delete = {
      tags: [definition.tag],
      summary: `Delete ${definition.tag.toLowerCase()}`,
      parameters: [{ $ref: "#/components/parameters/ResourceId" }],
      responses: {
        200: successResponse("Deleted successfully"),
        404: { description: "Record not found" },
        ...protectedResponses,
      },
    };
  }
}

paths["/api/v1/academic-sessions/{id}/activate"] = {
  patch: {
    tags: ["Academic Sessions"],
    summary: "Activate an academic session",
    parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    responses: { 200: successResponse(), ...protectedResponses },
  },
};

paths["/api/v1/academic-sessions/{id}/archive"] = {
  patch: {
    tags: ["Academic Sessions"],
    summary: "Archive an academic session",
    parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    responses: { 200: successResponse(), ...protectedResponses },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "TuitionSphere API",
      version: "1.0.0",
      description: "API documentation for the TuitionSphere backend.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: "Local development server",
      },
    ],
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "System" },
      { name: "Authentication" },
      { name: "Academic Sessions" },
      { name: "Boards" },
      { name: "Grades" },
      { name: "Subjects" },
      { name: "Tutors" },
      { name: "Batches" },
      { name: "Fee Plans" },
      { name: "Demo Setups" },
      { name: "Demo Requests" },
      { name: "Admissions" },
      { name: "Inquiries" },
      { name: "Students" },
      { name: "Invoices & Payments" },
      { name: "Class Schedules" },
      { name: "Tutor Schedule" },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste the token returned by POST /api/v1/auth/login",
        },
      },
      parameters: {
        ResourceId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object", additionalProperties: true },
          },
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@tuitionsphere.com" },
            password: { type: "string", format: "password", example: "Admin@123" },
          },
        },
        AcademicSessionInput: {
          type: "object",
          required: ["name", "startDate", "endDate"],
          properties: {
            name: { type: "string", example: "2026/2027" },
            startDate: { type: "string", format: "date", example: "2026-04-01" },
            endDate: { type: "string", format: "date", example: "2027-03-31" },
            status: { type: "string", enum: ["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"] },
          },
        },
        BoardInput: {
          type: "object",
          required: ["name", "code"],
          properties: {
            name: { type: "string", example: "Central Board of Secondary Education" },
            code: { type: "string", example: "CBSE" },
            description: { type: "string", nullable: true },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          },
        },
        GradeInput: {
          type: "object",
          required: ["gradeName", "numericValue", "learningStage", "boardIds"],
          properties: {
            gradeName: { type: "string", example: "Grade 1" },
            numericValue: { type: "integer", example: 1 },
            learningStage: { type: "string", example: "Primary Foundation" },
            boardIds: { type: "array", items: { type: "string" } },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          },
        },
        SubjectInput: {
          type: "object",
          required: ["name", "code", "boardId", "gradeIds"],
          properties: {
            name: { type: "string", example: "Mathematics" },
            code: { type: "string", example: "MATH" },
            boardId: { type: "string" },
            gradeIds: { type: "array", items: { type: "string" } },
            streams: { type: "array", items: { type: "string" } },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          },
        },
        TutorInput: {
          type: "object",
          required: ["name", "email", "phone", "employeeCode", "designation", "joiningDate"],
          properties: {
            name: { type: "string", example: "Rahul Verma" },
            email: { type: "string", format: "email", example: "rahul.verma@example.com" },
            phone: { type: "string", example: "9876543210" },
            employeeCode: { type: "string", example: "TUT-001" },
            designation: { type: "string", example: "Mathematics Tutor" },
            qualification: { type: "string", nullable: true },
            availability: { type: "string", example: "Monday to Friday" },
            experience: { type: "number", nullable: true, example: 5 },
            joiningDate: { type: "string", format: "date" },
            boardIds: { type: "array", items: { type: "string" } },
            gradeIds: { type: "array", items: { type: "string" } },
            subjectIds: { type: "array", items: { type: "string" } },
            modes: { type: "array", items: { type: "string" } },
            streams: { type: "array", items: { type: "string" } },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
            password: { type: "string", format: "password" },
          },
        },
        BatchInput: {
          type: "object",
          required: ["name", "academicSessionId", "gradeId", "boardId", "capacity", "subjectAssignments"],
          properties: {
            name: { type: "string", example: "Grade 1 CBSE Batch A" },
            academicSessionId: { type: "string" },
            gradeId: { type: "string" },
            boardId: { type: "string" },
            stream: { type: "string", nullable: true, example: null },
            learningMode: { type: "string", enum: ["ONLINE", "OFFLINE"] },
            capacity: { type: "integer", minimum: 1, example: 20 },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
            subjectAssignments: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["subjectId", "tutorId"],
                properties: {
                  subjectId: { type: "string" },
                  tutorId: { type: "string" },
                },
              },
            },
          },
        },
        FeePlanInput: {
          type: "object",
          required: ["name", "academicSessionId", "gradeId", "admissionFee", "tuitionFee", "billingFrequency", "dueDay", "effectiveFrom", "effectiveTo"],
          properties: {
            name: { type: "string", example: "Grade 3 Monthly Fee" },
            academicSessionId: { type: "string" },
            gradeId: { type: "string" },
            admissionFee: { type: "number", minimum: 0, example: 2000 },
            tuitionFee: { type: "number", exclusiveMinimum: 0, example: 1500 },
            billingFrequency: { type: "string", enum: ["MONTHLY", "QUARTERLY", "FULL_SESSION"] },
            dueDay: { type: "integer", minimum: 1, maximum: 28, example: 5 },
            lateFee: { type: "number", minimum: 0, example: 100 },
            gracePeriodDays: { type: "integer", minimum: 0, example: 3 },
            effectiveFrom: { type: "string", format: "date", example: "2026-04-01" },
            effectiveTo: { type: "string", format: "date", example: "2027-03-31" },
            status: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"] },
          },
        },
        DemoSetupInput: {
          type: "object",
          required: ["name", "academicSessionId", "tutorId", "gradeId", "boardIds", "mode", "demoStartDate", "demoEndDate", "availableDays", "timeSlots"],
          properties: {
            name: { type: "string", example: "Grade 3 CBSE Demo" },
            academicSessionId: { type: "string" },
            tutorId: { type: "string" },
            gradeId: { type: "string" },
            boardIds: { type: "array", minItems: 1, items: { type: "string" } },
            stream: { type: "string", nullable: true },
            mode: { type: "string", enum: ["ONLINE", "OFFLINE"] },
            demoStartDate: { type: "string", format: "date" },
            demoEndDate: { type: "string", format: "date" },
            availableDays: {
              type: "array",
              minItems: 1,
              items: { type: "string", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
            },
            timeSlots: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["startTime", "endTime", "capacity"],
                properties: {
                  startTime: { type: "string", example: "09:00" },
                  endTime: { type: "string", example: "10:00" },
                  capacity: { type: "integer", minimum: 1, example: 10 },
                },
              },
            },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          },
        },
        DemoRequestInput: {
          type: "object",
          required: ["studentName", "parentName", "email", "phone", "demoDate", "demoSetupId", "demoSlotId", "gradeId", "boardId"],
          properties: {
            studentName: { type: "string", example: "Aarav Gupta" },
            parentName: { type: "string", example: "Amit Gupta" },
            email: { type: "string", format: "email", example: "amit@example.com" },
            phone: { type: "string", example: "9876543210" },
            demoDate: { type: "string", format: "date" },
            demoSetupId: { type: "string" },
            demoSlotId: { type: "string" },
            gradeId: { type: "string" },
            boardId: { type: "string" },
            stream: { type: "string", nullable: true },
          },
        },
        AdmissionInput: {
          type: "object",
          required: ["studentName", "parentName", "email", "phone", "academicSessionId", "gradeId", "boardId", "batchId", "feePlanId", "source", "joiningDate"],
          properties: {
            demoRequestId: { type: "string", nullable: true },
            studentName: { type: "string" },
            parentName: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string", example: "9876543210" },
            academicSessionId: { type: "string" },
            gradeId: { type: "string" },
            boardId: { type: "string" },
            batchId: { type: "string" },
            feePlanId: { type: "string" },
            source: { type: "string", enum: ["Walk-in", "Phone Call", "Referral", "Inquiry", "Direct Admission", "Book Demo"] },
            joiningDate: { type: "string", format: "date" },
          },
        },
        InquiryInput: {
          type: "object",
          required: ["name", "phone", "gradeId", "inquiryType", "contactMethod", "preferredTime"],
          properties: {
            name: { type: "string" },
            phone: { type: "string", example: "9876543210" },
            email: { type: "string", format: "email", nullable: true },
            gradeId: { type: "string" },
            inquiryType: { type: "string", enum: ["course", "demo", "fees", "batch", "other"] },
            message: { type: "string", nullable: true },
            contactMethod: { type: "string", enum: ["call", "whatsapp", "email"] },
            preferredTime: { type: "string", enum: ["morning", "afternoon", "evening"] },
            learningMode: { type: "string", enum: ["flexible", "online", "offline"] },
          },
        },
      },
    },
  },
  apis: [],
});

swaggerSpec.paths["/api/v1/batches"].get.parameters = [
  { name: "search", in: "query", schema: { type: "string" } },
  { name: "academicSessionId", in: "query", schema: { type: "string" } },
  { name: "gradeId", in: "query", schema: { type: "string" } },
  { name: "boardId", in: "query", schema: { type: "string" } },
  { name: "learningMode", in: "query", schema: { type: "string", enum: ["ONLINE", "OFFLINE"] } },
  { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
];

swaggerSpec.paths["/api/v1/fee-plans"].get.parameters = [
  { name: "academicSessionId", in: "query", schema: { type: "string" } },
  { name: "gradeId", in: "query", schema: { type: "string" } },
  { name: "billingFrequency", in: "query", schema: { type: "string", enum: ["MONTHLY", "QUARTERLY", "FULL_SESSION"] } },
  { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "ACTIVE", "ARCHIVED"] } },
];

swaggerSpec.paths["/api/v1/demo-setups"].get.parameters = [
  { name: "academicSessionId", in: "query", schema: { type: "string" } },
  { name: "gradeId", in: "query", schema: { type: "string" } },
  { name: "boardId", in: "query", schema: { type: "string" } },
  { name: "tutorId", in: "query", schema: { type: "string" } },
  { name: "mode", in: "query", schema: { type: "string", enum: ["ONLINE", "OFFLINE"] } },
  { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
];

swaggerSpec.paths["/api/v1/public/demo-setups"] = {
  get: {
    tags: ["Demo Setups"],
    summary: "List active demo setups available for public booking",
    security: [],
    responses: { 200: successResponse() },
  },
};

swaggerSpec.paths["/api/v1/public/demo-requests"] = {
  post: {
    tags: ["Demo Setups"],
    summary: "Submit a public demo booking request",
    security: [],
    requestBody: {
      required: true,
      content: { "application/json": { schema: { $ref: "#/components/schemas/DemoRequestInput" } } },
    },
    responses: {
      201: successResponse("Demo request submitted successfully"),
      400: { description: "Invalid booking details" },
      409: { description: "Duplicate booking, unavailable schedule, or full slot" },
    },
  },
};

swaggerSpec.paths["/api/v1/demo-requests"] = {
  get: {
    tags: ["Demo Requests"],
    summary: "List demo requests for the admin workflow",
    parameters: [
      { name: "search", in: "query", schema: { type: "string" } },
      { name: "demoSetupId", in: "query", schema: { type: "string" } },
      { name: "tutorId", in: "query", schema: { type: "string" } },
      { name: "gradeId", in: "query", schema: { type: "string" } },
      { name: "boardId", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { type: "string", enum: ["NEW", "CONTACTED", "CONFIRMED", "ADMISSION_STARTED", "ENROLLED", "CANCELLED"] } },
    ],
    responses: { 200: successResponse(), ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/demo-requests/{id}"] = {
  get: {
    tags: ["Demo Requests"],
    summary: "Get one demo request",
    parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    responses: { 200: successResponse(), 404: { description: "Demo request not found" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/demo-requests/{id}/status"] = {
  patch: {
    tags: ["Demo Requests"],
    summary: "Move a demo request to its next workflow status",
    parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["CONTACTED", "CONFIRMED", "ADMISSION_STARTED", "CANCELLED"] } },
          },
        },
      },
    },
    responses: { 200: successResponse(), 409: { description: "Invalid status transition" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/admissions"] = {
  get: {
    tags: ["Admissions"],
    summary: "List admissions",
    parameters: [
      { name: "academicSessionId", in: "query", schema: { type: "string" } },
      { name: "gradeId", in: "query", schema: { type: "string" } },
      { name: "batchId", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { type: "string", enum: ["ENROLLED", "CANCELLED"] } },
    ],
    responses: { 200: successResponse(), ...protectedResponses },
  },
  post: {
    tags: ["Admissions"],
    summary: "Create a student account and admission",
    requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdmissionInput" } } } },
    responses: {
      201: successResponse("Student account and admission created"),
      400: { description: "Invalid or mismatched admission details" },
      409: { description: "Duplicate student, admission, or full batch" },
      ...protectedResponses,
    },
  },
};

swaggerSpec.paths["/api/v1/admissions/{id}"] = {
  get: {
    tags: ["Admissions"],
    summary: "Get one admission",
    parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    responses: { 200: successResponse(), 404: { description: "Admission not found" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/public/inquiries"] = {
  post: {
    tags: ["Inquiries"],
    summary: "Submit a public contact inquiry",
    security: [],
    requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InquiryInput" } } } },
    responses: { 201: successResponse("Inquiry submitted"), 400: { description: "Invalid inquiry details" }, 409: { description: "Recently submitted duplicate inquiry" } },
  },
};

swaggerSpec.paths["/api/v1/inquiries"] = {
  get: {
    tags: ["Inquiries"],
    summary: "List inquiries",
    parameters: [
      { name: "search", in: "query", schema: { type: "string" } },
      { name: "gradeId", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { type: "string", enum: ["NEW", "CONTACTED", "FOLLOW_UP_REQUIRED", "READY_FOR_ADMISSION", "CLOSED"] } },
    ],
    responses: { 200: successResponse(), ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/inquiries/{id}"] = {
  get: {
    tags: ["Inquiries"], summary: "Get one inquiry", parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    responses: { 200: successResponse(), 404: { description: "Inquiry not found" }, ...protectedResponses },
  },
  patch: {
    tags: ["Inquiries"], summary: "Update inquiry status or follow-up note", parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, followUpNote: { type: "string" } } } } } },
    responses: { 200: successResponse(), 409: { description: "Invalid status transition" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/students"] = {
  get: {
    tags: ["Students"],
    summary: "List enrolled students",
    parameters: [
      { name: "search", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "BLOCKED"] } },
      { name: "profileStatus", in: "query", schema: { type: "string", enum: ["INCOMPLETE", "COMPLETE"] } },
      { name: "academicSessionId", in: "query", schema: { type: "string" } },
      { name: "gradeId", in: "query", schema: { type: "string" } },
      { name: "boardId", in: "query", schema: { type: "string" } },
      { name: "batchId", in: "query", schema: { type: "string" } },
    ],
    responses: { 200: successResponse(), ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/students/{id}"] = {
  get: {
    tags: ["Students"], summary: "Get student profile and enrollment", parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    responses: { 200: successResponse(), 404: { description: "Student not found" }, ...protectedResponses },
  },
  patch: {
    tags: ["Students"], summary: "Update student profile or account status", parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, parentName: { type: "string" }, parentPhone: { type: "string" }, dateOfBirth: { type: "string", format: "date" }, gender: { type: "string" }, address: { type: "string" }, profileStatus: { type: "string", enum: ["INCOMPLETE", "COMPLETE"] }, status: { type: "string", enum: ["ACTIVE", "INACTIVE", "BLOCKED"] } } } } } },
    responses: { 200: successResponse("Student updated"), 400: { description: "Invalid student details" }, 404: { description: "Student not found" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/students/{id}/batch"] = {
  patch: {
    tags: ["Students"], summary: "Transfer a student to a compatible batch", parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["batchId"], properties: { batchId: { type: "string" } } } } } },
    responses: { 200: successResponse("Student batch updated"), 400: { description: "Incompatible batch" }, 409: { description: "Batch is full" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/invoices"] = {
  get: {
    tags: ["Invoices & Payments"],
    summary: "List student invoices",
    parameters: [
      { name: "search", in: "query", schema: { type: "string" } },
      { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] } },
      { name: "studentId", in: "query", schema: { type: "string" } },
      { name: "admissionId", in: "query", schema: { type: "string" } },
      { name: "academicSessionId", in: "query", schema: { type: "string" } },
      { name: "gradeId", in: "query", schema: { type: "string" } },
      { name: "boardId", in: "query", schema: { type: "string" } },
      { name: "batchId", in: "query", schema: { type: "string" } },
    ],
    responses: { 200: successResponse(), ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/invoices/generate"] = {
  post: {
    tags: ["Invoices & Payments"], summary: "Generate invoices from an admission fee plan",
    requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["admissionId"], properties: { admissionId: { type: "string" } } } } } },
    responses: { 201: successResponse("Invoices generated"), 409: { description: "Invoices already exist or admission is not eligible" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/invoices/{id}"] = {
  get: {
    tags: ["Invoices & Payments"], summary: "Get invoice and payment history", parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    responses: { 200: successResponse(), 404: { description: "Invoice not found" }, ...protectedResponses },
  },
};

swaggerSpec.paths["/api/v1/invoices/{id}/payments"] = {
  post: {
    tags: ["Invoices & Payments"], summary: "Record an invoice payment", parameters: [{ $ref: "#/components/parameters/ResourceId" }],
    requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["amount", "paymentMode"], properties: { amount: { type: "number", minimum: 0.01 }, paymentMode: { type: "string", enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"] }, transactionReference: { type: "string" }, paymentDate: { type: "string", format: "date-time" }, notes: { type: "string" } } } } } },
    responses: { 201: successResponse("Payment recorded"), 400: { description: "Invalid amount or payment details" }, 409: { description: "Invoice cannot receive this payment" }, ...protectedResponses },
  },
};

const classScheduleBody = {
  type: "object",
  required: ["batchId", "subjectId", "tutorId", "scheduleType", "startDate", "endDate", "startTime", "endTime"],
  properties: {
    batchId: { type: "string" }, subjectId: { type: "string" }, tutorId: { type: "string" },
    scheduleType: { type: "string", enum: ["SINGLE", "RECURRING"] }, topic: { type: "string" },
    startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date" },
    repeatDays: { type: "array", items: { type: "string", enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] } },
    startTime: { type: "string", example: "09:00" }, endTime: { type: "string", example: "10:00" },
    location: { type: "string" }, meetingUrl: { type: "string", format: "uri" }, status: { type: "string", enum: ["SCHEDULED", "CANCELLED"] },
  },
};

swaggerSpec.paths["/api/v1/class-schedules"] = {
  get: { tags: ["Class Schedules"], summary: "List class schedules", parameters: [{ name: "batchId", in: "query", schema: { type: "string" } }, { name: "tutorId", in: "query", schema: { type: "string" } }, { name: "day", in: "query", schema: { type: "string" } }, { name: "learningMode", in: "query", schema: { type: "string", enum: ["ONLINE", "OFFLINE"] } }], responses: { 200: successResponse(), ...protectedResponses } },
  post: { tags: ["Class Schedules"], summary: "Create one-time or recurring class schedule", requestBody: { required: true, content: { "application/json": { schema: classScheduleBody } } }, responses: { 201: successResponse("Class schedule created"), 409: { description: "Batch, tutor, or room overlap" }, ...protectedResponses } },
};

swaggerSpec.paths["/api/v1/class-schedules/{id}"] = {
  get: { tags: ["Class Schedules"], summary: "Get class schedule", parameters: [{ $ref: "#/components/parameters/ResourceId" }], responses: { 200: successResponse(), 404: { description: "Schedule not found" }, ...protectedResponses } },
  put: { tags: ["Class Schedules"], summary: "Update class schedule", parameters: [{ $ref: "#/components/parameters/ResourceId" }], requestBody: { required: true, content: { "application/json": { schema: classScheduleBody } } }, responses: { 200: successResponse("Class schedule updated"), 409: { description: "Schedule overlap" }, ...protectedResponses } },
};

swaggerSpec.paths["/api/v1/class-schedules/{id}/cancel"] = {
  patch: { tags: ["Class Schedules"], summary: "Cancel complete class schedule", parameters: [{ $ref: "#/components/parameters/ResourceId" }], responses: { 200: successResponse("Class schedule cancelled"), ...protectedResponses } },
};

swaggerSpec.tags.push({ name: "Attendance" }, { name: "Assignments" });

// Admin attendance and assignment monitoring follow the same protected API contract.
const queryParameter = (name, schema = { type: "string" }) => ({ name, in: "query", schema });
const inputBody = (name) => ({ required: true, content: { "application/json": { schema: { $ref: `#/components/schemas/${name}` } } } });
const moduleResponses = { ...protectedResponses, 400: { description: "Invalid input or filter" }, 500: { description: "Internal server error" } };
const dataResponse = (schema, description = "Successful response") => ({ description, content: { "application/json": { schema: { type: "object", required: ["success", "data"], properties: { success: { type: "boolean", example: true }, message: { type: "string" }, data: schema } } } } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
Object.assign(swaggerSpec.components.schemas, {
  AttendanceRecord: { type: "object", properties: { id: { type: "string" }, studentId: { type: "string" }, studentName: { type: "string" }, batchId: { type: "string" }, classId: { type: "string" }, date: { type: "string", format: "date" }, status: { type: "string", enum: ["Present", "Absent", "Leave"] }, leaveRequestId: { type: "string", nullable: true }, subject: { type: "string" }, startTime: { type: "string", example: "10:00" } } },
  AttendanceContext: { type: "object", description: "Filters apply to records and leave requests; batch, student and schedule context remains available for marking.", properties: { batches: { type: "array", items: { type: "object" } }, students: { type: "array", items: { type: "object" } }, schedules: { type: "array", items: { type: "object" } }, records: { type: "array", items: ref("AttendanceRecord") }, requests: { type: "array", items: ref("AdminLeaveRequest") } } },
  AdminLeaveRequest: { type: "object", properties: { id: { type: "string" }, studentId: { type: "string" }, studentName: { type: "string" }, batchId: { type: "string" }, fromDate: { type: "string", format: "date" }, toDate: { type: "string", format: "date" }, reason: { type: "string" }, status: { type: "string", enum: ["Pending", "Approved", "Rejected", "Cancelled"] }, affectedSessions: { type: "array", items: { type: "object" } }, rejectionReason: { type: "string", nullable: true } } },
  AttendanceSaveInput: { type: "object", required: ["date", "records"], properties: { date: { type: "string", format: "date", example: "2026-09-09" }, records: { type: "array", minItems: 1, maxItems: 2000, items: { type: "object", required: ["studentId", "classId", "status"], properties: { studentId: { type: "string" }, classId: { type: "string" }, status: { type: "string", enum: ["Present", "Absent", "Leave"], description: "Leave requires an approved request. Approved leave cannot be overwritten." } } } } } },
  LeaveReviewInput: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["Approved", "Rejected"] }, rejectionReason: { type: "string", description: "Required with at least 5 non-whitespace characters when rejecting." } } },
  AdminAssignment: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, type: { type: "string" }, instructions: { type: "string" }, batchId: { type: "string" }, batchName: { type: "string" }, subjectId: { type: "string" }, subject: { type: "string" }, tutorId: { type: "string" }, tutorName: { type: "string" }, dueDate: { type: "string", format: "date" }, totalMarks: { type: "integer" }, status: { type: "string", enum: ["Draft", "Published", "Archived"] }, submittedCount: { type: "integer" }, reviewedCount: { type: "integer" } } },
  AdminAssignmentSubmission: { type: "object", properties: { id: { type: "string" }, studentId: { type: "string" }, studentName: { type: "string" }, studentCode: { type: "string" }, status: { type: "string", enum: ["Submitted", "Reviewed"] }, marks: { type: "integer", nullable: true }, feedback: { type: "string", nullable: true }, submittedAt: { type: "string", format: "date-time" }, fileName: { type: "string", nullable: true }, fileData: { type: "string", nullable: true, description: "Download-only application/octet-stream base64 data URL." } } },
  AdminAssignmentDetail: { allOf: [ref("AdminAssignment"), { type: "object", properties: { attachmentName: { type: "string", nullable: true }, attachmentData: { type: "string", nullable: true, description: "Download-only application/octet-stream base64 data URL." }, submissions: { type: "array", items: ref("AdminAssignmentSubmission") } } }] },
  AssignmentArchiveInput: { type: "object", required: ["action", "expectedStatus"], properties: { action: { type: "string", enum: ["archive", "restore"] }, expectedStatus: { type: "string", enum: ["Draft", "Published", "Archived"], description: "Status currently displayed, used to reject stale actions." } } },
});
swaggerSpec.paths["/api/v1/attendance"] = {
  get: { tags: ["Attendance"], summary: "Load attendance context and filtered history/leave requests", parameters: [queryParameter("batchId"), queryParameter("studentId"), queryParameter("date", { type: "string", format: "date" }), queryParameter("status", { type: "string", enum: ["Present", "Absent", "Leave"] }), queryParameter("leaveStatus", { type: "string", enum: ["Pending", "Approved", "Rejected", "Cancelled"] }), queryParameter("month", { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$", example: "2026-09", description: "Leave periods overlapping this month" })], responses: { 200: dataResponse(ref("AttendanceContext")), ...moduleResponses } },
  put: { tags: ["Attendance"], summary: "Save or update attendance atomically", description: "Requires enrollment and a scheduled class that has started (IST). Duplicate student/class records are rejected. Approved leave is preserved.", requestBody: inputBody("AttendanceSaveInput"), responses: { 200: dataResponse(ref("AttendanceContext"), "Attendance saved"), ...moduleResponses } },
};
swaggerSpec.paths["/api/v1/attendance/leave-requests/{id}/review"] = {
  patch: { tags: ["Attendance"], summary: "Review a pending leave request or approve a rejected request", description: "Approval records leave for affected scheduled sessions in the same transaction and clears any previous rejection reason. Cancelled and approved requests cannot be reviewed again.", parameters: [refParameter()], requestBody: inputBody("LeaveReviewInput"), responses: { 200: dataResponse(ref("AttendanceContext")), 404: { description: "Leave request not found" }, 409: { description: "Invalid transition, overlapping approved leave, no valid enrollment or no affected sessions" }, ...moduleResponses } },
};
function refParameter() { return { $ref: "#/components/parameters/ResourceId" }; }
swaggerSpec.paths["/api/v1/assignments"] = {
  get: { tags: ["Assignments"], summary: "List assignments with submission and review counts", parameters: [queryParameter("search"), queryParameter("batchId"), queryParameter("subjectId"), queryParameter("tutorId"), queryParameter("status", { type: "string", enum: ["Draft", "Published", "Archived"] })], responses: { 200: dataResponse({ type: "array", items: ref("AdminAssignment") }), ...moduleResponses } },
};
swaggerSpec.paths["/api/v1/assignments/{id}"] = {
  get: { tags: ["Assignments"], summary: "Get assignment details, attachments and student submissions", parameters: [refParameter()], responses: { 200: dataResponse(ref("AdminAssignmentDetail")), 404: { description: "Assignment not found" }, ...moduleResponses } },
};
swaggerSpec.paths["/api/v1/assignments/{id}/archive"] = {
  patch: { tags: ["Assignments"], summary: "Archive or restore an assignment", description: "Restore preserves the previous draft/published state. The acting admin is recorded.", parameters: [refParameter()], requestBody: inputBody("AssignmentArchiveInput"), responses: { 200: dataResponse(ref("AdminAssignment")), 404: { description: "Assignment not found" }, 409: { description: "Stale status or invalid transition" }, ...moduleResponses } },
};

swaggerSpec.tags.push({ name: "Notices" });
swaggerSpec.components.schemas.NoticeInput = {
  type: "object", required: ["title", "message", "category", "priority", "audienceType", "publishDate", "status"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 }, message: { type: "string", minLength: 10, maxLength: 10000 },
    category: { type: "string", enum: ["Academic", "Schedule", "Exam", "Fee", "General"] },
    priority: { type: "string", enum: ["Normal", "Important", "Urgent"] },
    audienceType: { type: "string", enum: ["All", "Grade", "Batch", "Tutors", "Tutor", "Everyone"] },
    audienceValue: { type: "string", description: "Grade ID or Batch ID, required for targeted audiences; use all for All. New targets must be active." },
    publishDate: { type: "string", format: "date", example: "2026-09-09" },
    expiryDate: { type: "string", nullable: true, description: "Optional YYYY-MM-DD, empty string or null for no expiry; cannot precede publishDate." },
    status: { type: "string", enum: ["Draft", "Published", "Archived"] },
  },
};
swaggerSpec.components.schemas.Notice = {
  allOf: [ref("NoticeInput"), { type: "object", properties: {
    id: { type: "string" }, audienceLabel: { type: "string" }, gradeId: { type: "string", nullable: true }, batchId: { type: "string", nullable: true },
    createdById: { type: "string" }, updatedById: { type: "string" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
  } }],
};
swaggerSpec.paths["/api/v1/notices"] = {
  get: { tags: ["Notices"], summary: "List and filter admin notices", description: "Administrative register includes drafts, archived, future and expired notices. This is not a student visibility endpoint.", parameters: [queryParameter("search"), queryParameter("status", { type: "string", enum: ["Draft", "Published", "Archived"] }), queryParameter("category", { type: "string", enum: ["Academic", "Schedule", "Exam", "Fee", "General"] }), queryParameter("priority", { type: "string", enum: ["Normal", "Important", "Urgent"] }), queryParameter("audienceType", { type: "string", enum: ["All", "Grade", "Batch", "Tutors", "Tutor", "Everyone"] }), queryParameter("gradeId"), queryParameter("batchId"), queryParameter("tutorId")], responses: { 200: dataResponse({ type: "array", items: ref("Notice") }), ...moduleResponses } },
  post: { tags: ["Notices"], summary: "Create a notice", requestBody: inputBody("NoticeInput"), responses: { 201: dataResponse(ref("Notice"), "Notice created"), ...moduleResponses } },
};
swaggerSpec.paths["/api/v1/notices/{id}"] = {
  get: { tags: ["Notices"], summary: "Get notice details", parameters: [refParameter()], responses: { 200: dataResponse(ref("Notice")), 404: { description: "Notice not found" }, ...moduleResponses } },
  put: { tags: ["Notices"], summary: "Update a notice", description: "Replace editable fields. Existing inactive audience targets may be retained. Switching audience clears the previous grade/batch reference.", parameters: [refParameter()], requestBody: inputBody("NoticeInput"), responses: { 200: dataResponse(ref("Notice"), "Notice updated"), 404: { description: "Notice not found" }, ...moduleResponses } },
};
swaggerSpec.paths["/api/v1/notices/{id}/archive"] = {
  patch: { tags: ["Notices"], summary: "Archive a notice", parameters: [refParameter()], responses: { 200: dataResponse(ref("Notice"), "Notice archived"), 404: { description: "Notice not found" }, ...moduleResponses } },
};

swaggerSpec.tags.push({ name: "Admin Users" });
swaggerSpec.components.schemas.AdminUserInput = {
  type: "object", required: ["name", "email", "role", "status"], properties: {
    name: { type: "string", minLength: 2, maxLength: 100 }, email: { type: "string", format: "email", maxLength: 254 },
    phone: { type: "string", description: "Optional 10-digit phone number; spaces, parentheses and hyphens are normalized." },
    role: { type: "string", enum: ["ADMIN", "SUPER_ADMIN"] }, status: { type: "string", enum: ["ACTIVE", "INACTIVE", "BLOCKED"] },
  },
};
swaggerSpec.components.schemas.AdminUserCreateInput = { allOf: [ref("AdminUserInput"), { type: "object", required: ["password"], properties: { password: { type: "string", format: "password", writeOnly: true, minLength: 8, description: "Initial password; maximum 72 UTF-8 bytes. Stored as a bcrypt hash and never returned." } } }] };
swaggerSpec.components.schemas.AdminUser = { type: "object", properties: { ...swaggerSpec.components.schemas.AdminUserInput.properties, id: { type: "string" }, phone: { type: "string", nullable: true }, lastLoginAt: { type: "string", format: "date-time", nullable: true }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } };
swaggerSpec.components.schemas.AdminUserStatusInput = { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["ACTIVE", "INACTIVE", "BLOCKED"] } } };
const adminUserResponses = { ...moduleResponses, 403: { description: "Only an active Super Admin may access this module" }, 409: { description: "Duplicate email/phone, self-lockout, last active Super Admin protection or concurrent account change" } };
swaggerSpec.paths["/api/v1/admin-users"] = {
  get: { tags: ["Admin Users"], summary: "List administrators (Super Admin only)", parameters: [queryParameter("search"), queryParameter("role", { type: "string", enum: ["ADMIN", "SUPER_ADMIN"] }), queryParameter("status", { type: "string", enum: ["ACTIVE", "INACTIVE", "BLOCKED"] })], responses: { 200: dataResponse({ type: "array", items: ref("AdminUser") }), ...adminUserResponses } },
  post: { tags: ["Admin Users"], summary: "Create an administrator", requestBody: inputBody("AdminUserCreateInput"), responses: { 201: dataResponse(ref("AdminUser")), ...adminUserResponses } },
};
swaggerSpec.paths["/api/v1/admin-users/{id}"] = {
  get: { tags: ["Admin Users"], summary: "Get an administrator", parameters: [refParameter()], responses: { 200: dataResponse(ref("AdminUser")), 404: { description: "Administrator not found" }, ...adminUserResponses } },
  put: { tags: ["Admin Users"], summary: "Update administrator profile, role and status", description: "Password cannot be changed through this endpoint. Self-deactivation, blocking and demotion are rejected. The last active Super Admin is protected. Role/status changes are enforced on the next authenticated request.", parameters: [refParameter()], requestBody: inputBody("AdminUserInput"), responses: { 200: dataResponse(ref("AdminUser")), 404: { description: "Administrator not found" }, ...adminUserResponses } },
};
swaggerSpec.paths["/api/v1/admin-users/{id}/status"] = {
  patch: { tags: ["Admin Users"], summary: "Activate, deactivate or block an administrator", parameters: [refParameter()], requestBody: inputBody("AdminUserStatusInput"), responses: { 200: dataResponse(ref("AdminUser")), 404: { description: "Administrator not found" }, ...adminUserResponses } },
};

swaggerSpec.components.schemas.ChangePasswordInput = {
  type: "object", required: ["currentPassword", "newPassword", "confirmPassword"],
  properties: { currentPassword: { type: "string", format: "password", writeOnly: true }, newPassword: { type: "string", format: "password", writeOnly: true, minLength: 8, description: "Maximum 72 UTF-8 bytes; must differ from current password" }, confirmPassword: { type: "string", format: "password", writeOnly: true } },
};
swaggerSpec.paths["/api/v1/auth/change-password"] = { post: {
  tags: ["Auth"], summary: "Change the signed-in administrator's password",
  description: "Admin and Super Admin only. Verifies current password and invalidates all existing sessions, including this session. Sign in again after success.",
  requestBody: inputBody("ChangePasswordInput"), responses: { ...moduleResponses, 200: { description: "Password changed; sign in again" }, 409: { description: "Account changed concurrently; sign in and retry" } },
} };

swaggerSpec.paths["/api/v1/dashboard"] = { get: {
  tags: ["Dashboard"], summary: "Get administrator dashboard overview",
  description: "Admin/Super Admin only. Session scopes students, active batches, collections, today's classes and attendance/leave queues. Inquiries, demos and admissions overview are all-time, all-session counts. Monthly payments use IST boundaries; overdue balances are included in outstanding. Pending attendance counts today's completed classes with at least one missing eligible student's record. Schedule returns up to four classes, with a separate full total.",
  parameters: [queryParameter("month", { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$", example: "2026-09" }), queryParameter("academicSessionId", { type: "string", description: "Academic session ID or all" })],
  responses: { ...moduleResponses, 404: { description: "Academic session not found" }, 200: dataResponse({ type: "object", properties: {
    today: { type: "string", format: "date" }, month: { type: "string" }, sessions: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } } },
    students: { type: "integer" }, batches: { type: "integer" }, pendingInquiries: { type: "integer" },
    admissions: { type: "object", properties: { inquiries: { type: "integer" }, demos: { type: "integer" }, enrolled: { type: "integer" } } },
    collection: { type: "object", properties: Object.fromEntries(["total", "outstanding", "overdueAmount", "overdueCount", "paymentCount"].map((key) => [key, { type: "number" }]).concat([["daily", { type: "array", items: { type: "number" } }]])) },
    schedule: { type: "object", properties: { total: { type: "integer" }, classes: { type: "array", items: { type: "object", properties: Object.fromEntries(["id", "startTime", "endTime", "subject", "batchName", "mentor", "mode"].map((key) => [key, { type: "string" }])) } } } },
    attention: { type: "object", properties: { pendingLeaves: { type: "integer" }, pendingAttendance: { type: "integer" } } },
  } }) },
} };
swaggerSpec.paths["/api/v1/students/{id}/overview"] = { get: {
  tags: ["Students"], summary: "Get student attendance and financial history", parameters: [refParameter()],
  description: "Admin/Super Admin only. All sessions for this student. Attendance percentage = present / (present + absent), null with no qualifying records. Leave/unmarked classes excluded. Financial totals exclude draft/cancelled invoices. Returns attendanceHistory, invoices and nested payment records without account credentials.",
  responses: { ...moduleResponses, 404: { description: "Student not found" }, 200: dataResponse({ type: "object", properties: {
    attendance: { type: "object", properties: { total: { type: "integer" }, present: { type: "integer" }, absent: { type: "integer" }, leave: { type: "integer" }, percentage: { type: "number", nullable: true } } },
    fees: { type: "object", properties: { invoiced: { type: "number" }, paid: { type: "number" }, outstanding: { type: "number" } } },
    attendanceHistory: { type: "array", items: { type: "object", properties: { id: { type: "string" }, date: { type: "string", format: "date-time" }, status: { type: "string", enum: ["PRESENT", "ABSENT", "LEAVE"] }, classSchedule: { type: "object" } } } },
    invoices: { type: "array", items: { type: "object", properties: { id: { type: "string" }, invoiceNumber: { type: "string" }, title: { type: "string" }, dueDate: { type: "string", format: "date-time" }, status: { type: "string" }, totalAmount: { type: "number" }, paidAmount: { type: "number" }, outstandingAmount: { type: "number" }, payments: { type: "array", items: { type: "object" } } } } },
  } }) },
} };
swaggerSpec.components.schemas.AdminProfile = {
  type: 'object', properties: {
    id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string', format: 'email' },
    phone: { type: 'string', nullable: true }, role: { type: 'string', enum: ['ADMIN', 'SUPER_ADMIN'] },
    status: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }, lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
  },
};
swaggerSpec.paths['/admin-profile'] = {
  get: { tags: ['My Profile'], summary: 'Get the signed-in administrator profile', security: [{ bearerAuth: [] }], responses: { ...moduleResponses, 200: dataResponse(ref('AdminProfile')), 404: { description: 'Profile not found' } } },
  patch: { tags: ['My Profile'], summary: 'Update your name or phone', description: 'Admin and Super Admin only. Email, role, status and credentials cannot be changed here. Password changes use POST /auth/change-password.', security: [{ bearerAuth: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, minProperties: 1, properties: { name: { type: 'string', minLength: 2, maxLength: 100 }, phone: { type: 'string', nullable: true, description: '10 digits; blank or null clears the phone number' } } } } } },
    responses: { ...moduleResponses, 200: dataResponse(ref('AdminProfile')), 404: { description: 'Profile not found' }, 409: { description: 'Phone number already used' } },
  },
};
swaggerSpec.components.schemas.AdminProfile.properties.avatar = { type: 'string', nullable: true, description: 'Raster image data URL' };
swaggerSpec.components.schemas.AdminProfile.properties.notificationPreferences = { type: 'object', properties: { admissions: { type: 'boolean' }, fees: { type: 'boolean' }, academics: { type: 'boolean' } } };
swaggerSpec.components.schemas.AdminProfile.properties.themePreference = { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] };
swaggerSpec.paths['/admin-profile/settings'] = { patch: {
  tags: ['My Profile'], summary: 'Save avatar or notification preferences', security: [{ bearerAuth: [] }],
  requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, minProperties: 1, properties: { avatar: { type: 'string', nullable: true, maxLength: 180000, description: 'PNG, JPEG or WebP base64 data URL' }, themePreference: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] }, notificationPreferences: { type: 'object', additionalProperties: false, required: ['admissions', 'fees', 'academics'], properties: { admissions: { type: 'boolean' }, fees: { type: 'boolean' }, academics: { type: 'boolean' } } } } } } } },
  responses: { ...moduleResponses, 200: dataResponse(ref('AdminProfile')) },
} };
swaggerSpec.paths['/admin-profile/sessions'] = { get: { tags: ['My Profile'], summary: 'List your active tracked sessions', security: [{ bearerAuth: [] }], responses: { ...moduleResponses, 200: dataResponse({ type: 'object', properties: { trackedCurrentSession: { type: 'boolean' }, sessions: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, userAgent: { type: 'string' }, current: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' }, expiresAt: { type: 'string', format: 'date-time' } } } } } }) } } };
swaggerSpec.paths['/admin-profile/sessions/{id}'] = { delete: { tags: ['My Profile'], summary: 'Revoke one of your sessions', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { ...moduleResponses, 200: { description: 'Session revoked' }, 404: { description: 'Session not found or belongs to another account' } } } };
swaggerSpec.paths['/api/v1/demo-setups/{id}'].put.description = 'Existing slots retain their IDs when times match. Slots with booking history cannot be removed or retimed. Academic details, tutor and mode cannot change on booked setups; schedule changes must retain existing bookings, and capacity cannot fall below bookings per date. Selected weekdays must occur within the date range.';
swaggerSpec.paths['/api/v1/demo-setups/{id}'].put.responses[409] = { description: 'Change conflicts with existing bookings or a concurrent booking update' };
swaggerSpec.paths['/api/v1/tutor/schedule'] = { get: {
  tags: ['Tutor Schedule'],
  summary: 'List classes assigned to the signed-in tutor',
  description: 'Tutor only. The tutor profile is derived from the bearer token; tutorId query input is ignored and cannot be used to access another tutor schedule.',
  parameters: [
    queryParameter('from', { type: 'string', format: 'date' }),
    queryParameter('to', { type: 'string', format: 'date' }),
    queryParameter('batchId'),
    queryParameter('subjectId'),
    queryParameter('status', { type: 'string', enum: ['SCHEDULED', 'CANCELLED'] }),
    queryParameter('learningMode', { type: 'string', enum: ['ONLINE', 'OFFLINE'] }),
    queryParameter('search'),
  ],
  responses: {
    200: dataResponse({ type: 'object', properties: { schedules: { type: 'array', items: classScheduleBody }, academicSession: { nullable: true, type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' } } } } }),
    400: { description: 'Invalid filter or date range' },
    401: { description: 'Missing, invalid, or expired access token' },
    403: { description: 'Tutor access is required or tutor profile is inactive' },
    404: { description: 'Tutor profile not found' },
  },
} };
swaggerSpec.paths['/api/v1/tutor/students'] = { get: {
  tags: ['Tutor Students'], summary: 'List students taught by the signed-in tutor',
  description: 'Tutor only. Returns enrolled students from the active academic session and active batches where the signed-in tutor has a Batch–Subject assignment. The tutor identity is derived from the bearer token; tutorId query input is ignored.',
  parameters: [queryParameter('search'), queryParameter('gradeId'), queryParameter('boardId'), queryParameter('batchId'), queryParameter('status', { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'] })],
  responses: {
    200: dataResponse({ type: 'object', properties: { students: { type: 'array', items: { type: 'object' } }, assignedBatches: { type: 'array', items: { type: 'object' } }, academicSession: { type: 'object', nullable: true } } }),
    400: { description: 'Invalid filter or batch is not assigned to this tutor' }, 401: { description: 'Missing, invalid, or expired access token' },
    403: { description: 'Tutor access is required or tutor profile is inactive' }, 404: { description: 'Tutor profile not found' },
  },
} };
swaggerSpec.paths['/api/v1/tutor/updates'] = {
  get: { tags: ['Tutor Updates'], summary: 'List updates created by the signed-in tutor', description: 'Tutor only. Results are restricted to the signed-in tutor and their currently assigned active batches.', parameters: [queryParameter('search'), queryParameter('status', { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })], responses: { 200: dataResponse({ type: 'object', properties: { updates: { type: 'array', items: ref('Notice') }, assignedBatches: { type: 'array', items: { type: 'object' } } } }), 400: { description: 'Invalid filter' }, 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' } } },
  post: { tags: ['Tutor Updates'], summary: 'Create a batch update', description: 'Tutor can target only an active batch assigned to their account. Fee category is reserved for administrators.', requestBody: inputBody('NoticeInput'), responses: { 201: dataResponse(ref('Notice')), 400: { description: 'Invalid update details' }, 401: { description: 'Authentication required' }, 403: { description: 'Batch ownership or tutor access failure' } } },
};
swaggerSpec.paths['/api/v1/tutor/updates/{id}'] = { put: { tags: ['Tutor Updates'], summary: 'Update a tutor-owned update', parameters: [refParameter()], requestBody: inputBody('NoticeInput'), responses: { 200: dataResponse(ref('Notice')), 400: { description: 'Invalid update details' }, 401: { description: 'Authentication required' }, 403: { description: 'Batch ownership or tutor access failure' }, 404: { description: 'Update not found or not owned by tutor' } } } };
swaggerSpec.paths['/api/v1/tutor/updates/{id}/archive'] = { patch: { tags: ['Tutor Updates'], summary: 'Archive a tutor-owned update', parameters: [refParameter()], responses: { 200: dataResponse(ref('Notice')), 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' }, 404: { description: 'Update not found or not owned by tutor' } } } };
swaggerSpec.paths['/api/v1/tutor-profile'] = {
  get: { tags: ['Tutor Profile'], summary: 'Get the signed-in tutor profile', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' }, 404: { description: 'Tutor profile not found' } } },
  patch: { tags: ['Tutor Profile'], summary: 'Update tutor-owned contact details and availability', description: 'Only name, phone and availability are editable. Academic assignments and employment fields remain administrator-controlled.', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, phone: { type: 'string', nullable: true }, availability: { type: 'string' } } } } } }, responses: { 200: dataResponse({ type: 'object' }), 400: { description: 'Invalid profile details' }, 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' }, 409: { description: 'Phone already in use' } } },
};
swaggerSpec.paths['/api/v1/tutor-profile/settings'] = { patch: { tags: ['Tutor Profile'], summary: 'Save tutor avatar, theme or notification preferences', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, minProperties: 1, properties: { avatar: { type: 'string', nullable: true }, themePreference: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] }, notificationPreferences: { type: 'object' } } } } } }, responses: { 200: dataResponse({ type: 'object' }), 400: { description: 'Invalid settings' }, 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' } } } };
swaggerSpec.paths['/api/v1/tutor-profile/sessions'] = { get: { tags: ['Tutor Profile'], summary: 'List active tutor sessions', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' } } } };
swaggerSpec.paths['/api/v1/tutor-profile/sessions/{id}'] = { delete: { tags: ['Tutor Profile'], summary: 'Revoke a tutor-owned session', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Session signed out' }, 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' }, 404: { description: 'Session not found' } } } };
swaggerSpec.tags.push({ name: 'Tutor Assignments' });
swaggerSpec.components.schemas.TutorAssignmentInput = {
  type: 'object', required: ['title', 'type', 'batchId', 'subjectId', 'instructions', 'dueDate', 'totalMarks', 'status'], additionalProperties: false,
  properties: { title: { type: 'string', maxLength: 200 }, type: { type: 'string', enum: ['Homework', 'Worksheet', 'Practice Work', 'Project'] }, batchId: { type: 'string' }, subjectId: { type: 'string' }, instructions: { type: 'string', maxLength: 10000 }, dueDate: { type: 'string', format: 'date' }, totalMarks: { type: 'integer', minimum: 1, maximum: 10000 }, status: { type: 'string', enum: ['Draft', 'Published'] }, attachmentName: { type: 'string', nullable: true }, attachmentData: { type: 'string', nullable: true, description: 'PDF, DOC, DOCX, JPG or PNG data URL, maximum decoded size 1 MB.' } },
};
swaggerSpec.components.schemas.TutorAssignmentReviewInput = { type: 'object', required: ['marks', 'feedback'], additionalProperties: false, properties: { marks: { type: 'integer', minimum: 0, description: 'Cannot exceed assignment total marks.' }, feedback: { type: 'string', maxLength: 2000 } } };
swaggerSpec.components.schemas.TutorAssignmentStudentSubmission = {
  type: 'object',
  properties: {
    studentId: { type: 'string' }, studentCode: { type: 'string' }, studentName: { type: 'string' }, initials: { type: 'string' },
    status: { type: 'string', enum: ['Graded', 'Submitted', 'Not Submitted'] }, submissionId: { type: 'string', nullable: true },
    submittedAt: { type: 'string', format: 'date-time', nullable: true }, reviewedAt: { type: 'string', format: 'date-time', nullable: true },
    isLate: { type: 'boolean' }, marks: { type: 'integer', nullable: true }, totalMarks: { type: 'integer' },
    fileName: { type: 'string', nullable: true }, feedback: { type: 'string', nullable: true },
  },
};
swaggerSpec.paths['/api/v1/tutor/assignments'] = {
  get: { tags: ['Tutor Assignments'], summary: 'List assignments owned by the signed-in tutor', description: 'Returns tutor-owned assignments, submission summaries, active assigned batches and their assigned subjects. Tutor identity is always derived from the bearer token.', parameters: [queryParameter('search'), queryParameter('batchId'), queryParameter('subjectId'), queryParameter('status', { type: 'string', enum: ['Draft', 'Published', 'Archived'] })], responses: { 200: dataResponse({ type: 'object', properties: { assignments: { type: 'array', items: ref('AdminAssignment') }, assignedBatches: { type: 'array', items: { type: 'object' } }, academicSession: { type: 'object', nullable: true } } }), 400: { description: 'Invalid filter' }, 401: { description: 'Authentication required' }, 403: { description: 'Tutor or batch ownership failure' } } },
  post: { tags: ['Tutor Assignments'], summary: 'Create an assignment for an assigned batch and subject', requestBody: inputBody('TutorAssignmentInput'), responses: { 201: dataResponse(ref('AdminAssignment')), 400: { description: 'Invalid assignment or attachment' }, 401: { description: 'Authentication required' }, 403: { description: 'Batch and subject are not assigned to tutor' } } },
};
swaggerSpec.paths['/api/v1/tutor/assignments/{id}'] = {
  get: { tags: ['Tutor Assignments'], summary: 'Get a tutor-owned assignment with submission files', parameters: [refParameter()], responses: { 200: dataResponse(ref('AdminAssignmentDetail')), 404: { description: 'Assignment not found or not owned by tutor' } } },
  put: { tags: ['Tutor Assignments'], summary: 'Update a tutor-owned assignment', description: 'Batch, subject and total marks are locked after the first submission.', parameters: [refParameter()], requestBody: inputBody('TutorAssignmentInput'), responses: { 200: dataResponse(ref('AdminAssignment')), 404: { description: 'Assignment not found or not owned by tutor' }, 409: { description: 'Assignment is archived or locked by submissions' } } },
};
swaggerSpec.paths['/api/v1/tutor/assignments/{id}/submissions'] = { get: { tags: ['Tutor Assignments'], summary: 'List every enrolled batch student with assignment submission status', description: 'Includes students who have not submitted. Returns Submitted, Graded and Pending summary counts without loading file bytes.', parameters: [refParameter()], responses: { 200: dataResponse({ type: 'object', properties: { assignment: { type: 'object' }, summary: { type: 'object', properties: { total: { type: 'integer' }, submitted: { type: 'integer' }, graded: { type: 'integer' }, pending: { type: 'integer' }, notSubmitted: { type: 'integer' }, late: { type: 'integer' } } }, students: { type: 'array', items: ref('TutorAssignmentStudentSubmission') } } }), 404: { description: 'Assignment not found or not owned by tutor' } } } };
swaggerSpec.paths['/api/v1/tutor/assignments/{id}/submissions/{submissionId}/file'] = { get: { tags: ['Tutor Assignments'], summary: 'Open one student submission file', parameters: [refParameter(), { name: 'submissionId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: dataResponse({ type: 'object', properties: { fileName: { type: 'string' }, fileData: { type: 'string', description: 'Submission file data URL.' } } }), 404: { description: 'Assignment, submission or file not found' } } } };
swaggerSpec.paths['/api/v1/tutor/assignments/{id}/archive'] = { patch: { tags: ['Tutor Assignments'], summary: 'Archive or restore a tutor-owned assignment', parameters: [refParameter()], requestBody: inputBody('AssignmentArchiveInput'), responses: { 200: dataResponse(ref('AdminAssignment')), 404: { description: 'Assignment not found or not owned by tutor' }, 409: { description: 'Stale assignment state' } } } };
swaggerSpec.paths['/api/v1/tutor/assignments/{id}/submissions/{submissionId}/review'] = { patch: { tags: ['Tutor Assignments'], summary: 'Review a submission for a tutor-owned assignment', parameters: [refParameter(), { name: 'submissionId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: inputBody('TutorAssignmentReviewInput'), responses: { 200: dataResponse(ref('AdminAssignmentSubmission')), 400: { description: 'Invalid marks or feedback' }, 404: { description: 'Assignment or submission not found' } } } };
swaggerSpec.tags.push({ name: 'Tutor Dashboard' });
swaggerSpec.paths['/api/v1/tutor/dashboard'] = { get: { tags: ['Tutor Dashboard'], summary: 'Get live dashboard counts for the signed-in tutor', description: 'Counts today’s recurring and single classes in Asia/Kolkata, active enrolled students, visible published updates and unreviewed assignment submissions directly from the database.', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object', properties: { academicSession: { type: 'object', nullable: true }, todayClasses: { type: 'integer' }, assignedStudents: { type: 'integer' }, activeUpdates: { type: 'integer' }, assignmentsToReview: { type: 'integer' }, nextClass: { type: 'object', nullable: true } } }), 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' } } } };
swaggerSpec.tags.push({ name: 'Tutor Attendance' });
swaggerSpec.paths['/api/v1/tutor/attendance'] = {
  get: { tags: ['Tutor Attendance'], summary: 'Get attendance context for the signed-in tutor and date', description: 'Returns only classes assigned to the authenticated tutor, their actively enrolled students, and saved attendance.', security: [{ bearerAuth: [] }], parameters: [{ name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } }], responses: { 200: dataResponse({ type: 'object' }), 400: { description: 'Invalid date' }, 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' }, 404: { description: 'Tutor profile not found' } } },
  put: {
    tags: ['Tutor Attendance'],
    summary: 'Save attendance for a tutor-owned class',
    description: 'Validates tutor ownership, class occurrence, class start time and active enrollment before saving.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['date', 'records'],
            properties: {
              date: { type: 'string', format: 'date' },
              records: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['studentId', 'classId', 'status'],
                  properties: {
                    studentId: { type: 'string' },
                    classId: { type: 'string' },
                    status: { type: 'string', enum: ['Present', 'Absent', 'Leave'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: { 200: dataResponse({ type: 'object' }), 400: { description: 'Invalid or ineligible attendance data' }, 401: { description: 'Authentication required' }, 403: { description: 'Tutor access required' }, 404: { description: 'Tutor profile not found' } },
  },
};
swaggerSpec.tags.push({ name: 'Student Profile' });
swaggerSpec.paths['/api/v1/student/profile'] = {
  get: { tags: ['Student Profile'], summary: 'Get the signed-in student profile and current enrollment', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 403: { description: 'Student access required' } } },
  patch: { tags: ['Student Profile'], summary: 'Update self-service personal and guardian details', description: 'Student identity and academic enrollment are read-only. Profile completeness is calculated by the server.', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, properties: { dateOfBirth: { type: 'string', format: 'date' }, gender: { type: 'string', enum: ['Male', 'Female', 'Other'] }, address: { type: 'string' }, parentPhone: { type: 'string' }, emergencyContact: { type: 'string' } } } } } }, responses: { 200: dataResponse({ type: 'object' }), 400: { description: 'Invalid profile details' }, 401: { description: 'Authentication required' }, 403: { description: 'Student access required' } } },
};
swaggerSpec.paths['/api/v1/student/profile/photo'] = { patch: { tags: ['Student Profile'], summary: 'Update the signed-in student avatar', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['avatar'], properties: { avatar: { type: 'string', nullable: true, description: 'PNG, JPEG or WebP data URL under 130 KB' } } } } } }, responses: { 200: dataResponse({ type: 'object' }), 400: { description: 'Invalid photo' }, 401: { description: 'Authentication required' } } } };
swaggerSpec.paths['/api/v1/student/profile/theme'] = { patch: { tags: ['Student Profile'], summary: 'Save the signed-in student theme preference', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['themePreference'], properties: { themePreference: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] } } } } } }, responses: { 200: dataResponse({ type: 'object', properties: { themePreference: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] } } }), 400: { description: 'Invalid theme' }, 401: { description: 'Authentication required' }, 403: { description: 'Student access required' }, 404: { description: 'Student profile not found' } } } };
swaggerSpec.paths['/api/v1/student/profile/correction-requests'] = { post: { tags: ['Student Profile'], summary: 'Submit an official profile correction request', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['field', 'details'], properties: { field: { type: 'string', enum: ['Contact information', 'Personal information', 'Guardian information', 'Academic information', 'Other correction'] }, details: { type: 'string', minLength: 10, maxLength: 500 } } } } } }, responses: { 201: dataResponse({ type: 'object' }), 400: { description: 'Invalid correction request' }, 401: { description: 'Authentication required' } } } };
swaggerSpec.tags.push({ name: 'Student Fees' });
swaggerSpec.paths['/api/v1/student/fees'] = { get: { tags: ['Student Fees'], summary: 'Get invoices, recorded payments and report statuses for the signed-in student', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object', properties: { student: { type: 'object' }, invoices: { type: 'array', items: { type: 'object' } } } }), 401: { description: 'Authentication required' }, 403: { description: 'Student access required' }, 404: { description: 'Student profile not found' } } } };
swaggerSpec.paths['/api/v1/student/fees/{id}/payment-reports'] = { post: { tags: ['Student Fees'], summary: 'Submit a payment proof for an owned invoice', security: [{ bearerAuth: [] }], parameters: [refParameter()], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['amount', 'paymentMode', 'paymentDate', 'transactionReference', 'proofName', 'proofData'], properties: { amount: { type: 'number', minimum: 0.01 }, paymentMode: { type: 'string', enum: ['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD'] }, paymentDate: { type: 'string', format: 'date' }, transactionReference: { type: 'string', minLength: 3, maxLength: 100 }, proofName: { type: 'string' }, proofData: { type: 'string', description: 'PDF, JPG or PNG data URL, max decoded size 2 MB' }, note: { type: 'string', maxLength: 250 } } } } } }, responses: { 201: dataResponse({ type: 'object' }), 400: { description: 'Invalid payment details or proof' }, 401: { description: 'Authentication required' }, 404: { description: 'Invoice not found for this student' }, 409: { description: 'Invoice is not payable or a report is already pending' } } } };
swaggerSpec.tags.push({ name: 'Student Notices' });
swaggerSpec.paths['/api/v1/student/notices'] = { get: { tags: ['Student Notices'], summary: 'Get active notices for the signed-in student audience', description: 'Returns published, non-expired notices addressed to all students, the current grade, or the current batch, including the persisted read state.', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object', properties: { enrollment: { type: 'object', nullable: true }, notices: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, message: { type: 'string' }, isRead: { type: 'boolean' } } } } } }), 401: { description: 'Authentication required' }, 403: { description: 'Student access required' }, 404: { description: 'Student profile not found' } } } };
swaggerSpec.paths['/api/v1/student/notices/read-all'] = { post: { tags: ['Student Notices'], summary: 'Mark all visible student notices as read', description: 'Persists read receipts for the signed-in student account.', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object', properties: { notices: { type: 'array', items: { type: 'object' } } } }), 401: { description: 'Authentication required' }, 403: { description: 'Student access required' }, 404: { description: 'Student profile not found' } } } };
swaggerSpec.paths['/api/v1/invoices/payment-reports/{reportId}/review'] = { patch: { tags: ['Invoices & Payments'], summary: 'Approve or reject a student payment report', description: 'Approval atomically records the payment and updates the invoice balance; rejection requires a reason.', security: [{ bearerAuth: [] }], parameters: [{ name: 'reportId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['decision'], properties: { decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] }, reviewNote: { type: 'string', maxLength: 500 } } } } } }, responses: { 200: dataResponse({ type: 'object' }), 400: { description: 'Invalid decision or review reason' }, 401: { description: 'Authentication required' }, 403: { description: 'Admin access required' }, 404: { description: 'Payment report not found' }, 409: { description: 'Report already reviewed, duplicate reference or changed invoice balance' } } } };
swaggerSpec.paths['/api/v1/invoices/payment-reports/{reportId}/proof'] = { get: { tags: ['Invoices & Payments'], summary: 'Download a student payment proof (admin only)', security: [{ bearerAuth: [] }], parameters: [{ name: 'reportId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: dataResponse({ type: 'object', properties: { fileName: { type: 'string' }, fileData: { type: 'string' } } }), 401: { description: 'Authentication required' }, 403: { description: 'Admin access required' }, 404: { description: 'Payment report not found' } } } };
swaggerSpec.tags.push({ name: 'Student Schedule' });
swaggerSpec.paths['/api/v1/student/schedule'] = { get: { tags: ['Student Schedule'], summary: 'Get class schedules for the signed-in student’s enrolled batch', description: 'The enrolled batch is resolved from the authenticated student account. Returns scheduled and cancelled classes with batch details.', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 403: { description: 'Student access required' }, 404: { description: 'Student profile not found' } } } };
swaggerSpec.tags.push({ name: 'Student Attendance' });
swaggerSpec.paths['/api/v1/student/attendance'] = { get: { tags: ['Student Attendance'], summary: 'Get attendance and leave requests for the signed-in student', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 403: { description: 'Student access required' } } } };
const studentLeaveBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fromDate', 'toDate', 'type', 'reason'], properties: { fromDate: { type: 'string', format: 'date' }, toDate: { type: 'string', format: 'date' }, type: { type: 'string', enum: ['Medical', 'Family Emergency', 'Personal', 'School Examination', 'Other'] }, reason: { type: 'string', minLength: 10, maxLength: 500 } } } } } };
swaggerSpec.paths['/api/v1/student/attendance/leave-requests'] = { post: { tags: ['Student Attendance'], summary: 'Submit a leave request for the signed-in student', security: [{ bearerAuth: [] }], requestBody: studentLeaveBody, responses: { 201: dataResponse({ type: 'object' }), 400: { description: 'Invalid leave request' }, 401: { description: 'Authentication required' }, 409: { description: 'No scheduled classes or overlapping leave' } } } };
swaggerSpec.paths['/api/v1/student/attendance/leave-requests/{id}'] = { patch: { tags: ['Student Attendance'], summary: 'Edit an owned pending leave request', security: [{ bearerAuth: [] }], parameters: [refParameter()], requestBody: studentLeaveBody, responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 404: { description: 'Leave request not found' }, 409: { description: 'Request is no longer pending' } } } };
swaggerSpec.paths['/api/v1/student/attendance/leave-requests/{id}/cancel'] = { patch: { tags: ['Student Attendance'], summary: 'Cancel an owned pending leave request', security: [{ bearerAuth: [] }], parameters: [refParameter()], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 404: { description: 'Leave request not found' }, 409: { description: 'Request is no longer pending' } } } };
swaggerSpec.tags.push({ name: 'Student Assignments' });
swaggerSpec.paths['/api/v1/student/assignments'] = {
  get: { tags: ['Student Assignments'], summary: 'List published assignments for the signed-in student’s enrolled batch', description: 'Includes only this student’s submission metadata; document bytes are returned by the detail endpoint.', security: [{ bearerAuth: [] }], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 403: { description: 'Student access required' }, 404: { description: 'Student profile not found' } } },
};
swaggerSpec.paths['/api/v1/student/assignments/{id}'] = {
  get: { tags: ['Student Assignments'], summary: 'Get an assigned document and the signed-in student’s submitted document', security: [{ bearerAuth: [] }], parameters: [refParameter()], responses: { 200: dataResponse({ type: 'object' }), 401: { description: 'Authentication required' }, 404: { description: 'Published assignment not found for this batch' } } },
};
swaggerSpec.paths['/api/v1/student/assignments/{id}/submission'] = {
  post: { tags: ['Student Assignments'], summary: 'Submit or replace an unreviewed answer document', description: 'Accepts a PDF, DOC, DOCX, JPG or PNG data URL up to 1 MB. A reviewed submission cannot be replaced.', security: [{ bearerAuth: [] }], parameters: [refParameter()], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required: ['fileName', 'fileData'], properties: { fileName: { type: 'string', maxLength: 255 }, fileData: { type: 'string', description: 'Base64 data URL' } } } } } }, responses: { 201: dataResponse({ type: 'object' }), 400: { description: 'Invalid document' }, 401: { description: 'Authentication required' }, 404: { description: 'Published assignment not found for this batch' }, 409: { description: 'No active enrollment or submission already reviewed' } } },
};
swaggerSpec.paths['/api/v1/students/{id}/profile-requests'] = { get: { tags: ['Students'], summary: 'List profile correction requests for an enrolled student', parameters: [refParameter()], responses: { 200: dataResponse({ type: 'array', items: { type: 'object' } }), 401: { description: 'Authentication required' }, 403: { description: 'Admin access required' }, 404: { description: 'Student not found' } } } };
module.exports = swaggerSpec;
