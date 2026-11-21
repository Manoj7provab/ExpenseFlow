process.env.JWT_SECRET = "expenseflow_test_secret_123456789";
process.env.JWT_EXPIRES_IN = "1d";
process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/User");
const os = require("os");

jest.setTimeout(30000);

let mongoServer;

const testUser = {
  name: "Test User",
  email: "testuser@example.com",
  password: "Password123",
};

// DATABASE SETUP
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  await mongoose.connect(mongoServer.getUri(), {
    serverSelectionTimeoutMS: 20000,

    // Workaround for MongoDB driver 7.6+ Jest issue
    runtimeAdapters: {
      os: os,
    },
  });

  await User.init();
}, 60000);
// CLEAR DATABASE BEFORE EACH TEST
beforeEach(async () => {
  await User.deleteMany({});
});

// DATABASE CLEANUP
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error("Test cleanup error:", error);
  }
}, 30000);

describe("Authentication API Tests", () => {

  // TEST 1: User registration
  test("should register a new user successfully", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Registration successful"
    );

    expect(response.body.user).toHaveProperty("id");
    expect(response.body.user.name).toBe(testUser.name);
    expect(response.body.user.email).toBe(testUser.email);

    // Password must never be returned
    expect(response.body.user.password).toBeUndefined();

    const savedUser = await User.findOne({
      email: testUser.email,
    }).select("+password");

    expect(savedUser).toBeTruthy();
    expect(savedUser.password).not.toBe(testUser.password);
  });

  // TEST 2: Duplicate email registration
  test("should reject registration with an existing email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    const response = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "Email is already registered"
    );
  });

  // TEST 3: Registration validation
  test("should reject registration with invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "invalid-email",
        password: "Password123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // TEST 4: Successful login
  test("should login a registered user successfully", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    const agent = request.agent(app);

    const response = await agent
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Login successful"
    );

    // Verify authentication cookie
    const cookies = response.headers["set-cookie"] || [];

    expect(
      cookies.some((cookie) =>
        cookie.startsWith("expense_token=")
      )
    ).toBe(true);

    // Verify HttpOnly security
    expect(
      cookies.some((cookie) =>
        cookie.toLowerCase().includes("httponly")
      )
    ).toBe(true);
  });

  // TEST 5: Invalid password
  test("should reject login with an incorrect password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword123",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "Invalid email or password"
    );
  });

  // TEST 6: Protected route without authentication
  test("should reject access to protected route without login", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "Authentication required. Please login."
    );
  });

  // TEST 7: Protected route with valid authentication
  test("should return current user after successful login", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.user.email).toBe(
      testUser.email
    );

    expect(response.body.user.name).toBe(
      testUser.name
    );
  });

  // TEST 8: Logout
  test("should logout user and clear authentication cookie", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    const logoutResponse = await agent.post(
      "/api/auth/logout"
    );

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    expect(logoutResponse.body.message).toBe(
      "Logout successful"
    );

    // Verify user cannot access protected route after logout
    const meResponse = await agent.get("/api/auth/me");

    expect(meResponse.status).toBe(401);
  });

});