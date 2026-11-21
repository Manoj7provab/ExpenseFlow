const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const os = require("os");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "expense-flow-test-secret-key";

const app = require("../app");
const User = require("../models/User");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

const {
  generateToken,
  COOKIE_NAME,
} = require("../utils/tokenUtils");

let mongoServer;

let userA;
let userB;
let accountA;
let accountB;
let cookieA;
let cookieB;

const createAuthCookie = (userId) => {
  const token = generateToken(userId);
  return `${COOKIE_NAME}=${token}`;
};

describe("Transaction API Tests", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri(), {
      serverSelectionTimeoutMS: 20000,
      runtimeAdapters: { os },
    });

    await User.init();
    await Account.init();
    await Transaction.init();
  }, 60000);

  beforeEach(async () => {
    await Transaction.deleteMany({});
    await Account.deleteMany({});
    await User.deleteMany({});

    const hashedPassword = await bcrypt.hash("Password@123", 10);

    userA = await User.create({
      name: "Test User One",
      email: "userone@example.com",
      password: hashedPassword,
    });

    userB = await User.create({
      name: "Test User Two",
      email: "usertwo@example.com",
      password: hashedPassword,
    });

    accountA = await Account.create({
      user: userA._id,
      name: "Main Cash",
      type: "Cash",
      openingBalance: 1000,
    });

    accountB = await Account.create({
      user: userB._id,
      name: "Bank Account",
      type: "Bank Account",
      openingBalance: 2000,
    });

    cookieA = createAuthCookie(userA._id);
    cookieB = createAuthCookie(userB._id);
  });

  afterAll(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const validTransaction = {
    amount: 500,
    type: "Expense",
    category: "Food",
    accountId: null,
    note: "Lunch expense",
    date: "2026-11-20T10:00:00.000Z",
  };

  const createTransaction = async (cookie, accountId, overrides = {}) => {
    return request(app)
      .post("/api/transactions")
      .set("Cookie", cookie)
      .send({
        ...validTransaction,
        accountId: accountId.toString(),
        ...overrides,
      });
  };

  // 1. CREATE TRANSACTION
  test("should create a transaction successfully", async () => {
    const response = await createTransaction(cookieA, accountA._id);

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.transaction.amount).toBe(500);
    expect(response.body.transaction.type).toBe("Expense");
    expect(response.body.transaction.category).toBe("Food");
    expect(response.body.transaction.user.toString()).toBe(
      userA._id.toString()
    );

    const savedTransaction = await Transaction.findById(
      response.body.transaction._id
    );

    expect(savedTransaction).not.toBeNull();
  });

  // 2. REJECT INVALID TRANSACTION
  test("should reject transaction with invalid amount", async () => {
    const response = await createTransaction(
      cookieA,
      accountA._id,
      { amount: -100 }
    );

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // 3. REJECT INVALID TRANSACTION TYPE
  test("should reject invalid transaction type", async () => {
    const response = await createTransaction(
      cookieA,
      accountA._id,
      { type: "Invalid" }
    );

    expect(response.statusCode).toBe(400);
  });

  // 4. REJECT ACCOUNT BELONGING TO ANOTHER USER
  test("should reject transaction using another user's account", async () => {
    const response = await createTransaction(cookieA, accountB._id);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // 5. GET ALL TRANSACTIONS
  test("should return transactions belonging to logged-in user", async () => {
    await createTransaction(cookieA, accountA._id);

    const response = await request(app)
      .get("/api/transactions")
      .set("Cookie", cookieA);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.transactions).toHaveLength(1);
    expect(response.body.pagination.total).toBe(1);
  });

  // 6. PAGINATION
  test("should return paginated transactions", async () => {
    await createTransaction(cookieA, accountA._id, { amount: 100 });
    await createTransaction(cookieA, accountA._id, { amount: 200 });
    await createTransaction(cookieA, accountA._id, { amount: 300 });

    const response = await request(app)
      .get("/api/transactions?page=1&limit=2")
      .set("Cookie", cookieA);

    expect(response.statusCode).toBe(200);
    expect(response.body.transactions).toHaveLength(2);
    expect(response.body.pagination.total).toBe(3);
    expect(response.body.pagination.totalPages).toBe(2);
    expect(response.body.pagination.hasNextPage).toBe(true);
  });

  // 7. FILTER TRANSACTIONS
  test("should filter transactions by type", async () => {
    await createTransaction(cookieA, accountA._id, {
      type: "Expense",
      category: "Food",
    });

    await createTransaction(cookieA, accountA._id, {
      type: "Income",
      category: "Salary",
    });

    const response = await request(app)
      .get("/api/transactions?type=Income")
      .set("Cookie", cookieA);

    expect(response.statusCode).toBe(200);
    expect(response.body.transactions).toHaveLength(1);
    expect(response.body.transactions[0].type).toBe("Income");
  });

  // 8. GET SINGLE TRANSACTION
  test("should return a single transaction by ID", async () => {
    const createResponse = await createTransaction(
      cookieA,
      accountA._id
    );

    const transactionId =
      createResponse.body.transaction._id;

    const response = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set("Cookie", cookieA);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.transaction._id).toBe(transactionId);
  });

  // 9. UPDATE TRANSACTION
  test("should update a transaction successfully", async () => {
    const createResponse = await createTransaction(
      cookieA,
      accountA._id
    );

    const transactionId =
      createResponse.body.transaction._id;

    const response = await request(app)
      .put(`/api/transactions/${transactionId}`)
      .set("Cookie", cookieA)
      .send({
        amount: 800,
        category: "Shopping",
        note: "Updated shopping expense",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.transaction.amount).toBe(800);
    expect(response.body.transaction.category).toBe("Shopping");
    expect(response.body.transaction.note).toBe(
      "Updated shopping expense"
    );
  });

  // 10. DELETE TRANSACTION
  test("should delete a transaction successfully", async () => {
    const createResponse = await createTransaction(
      cookieA,
      accountA._id
    );

    const transactionId =
      createResponse.body.transaction._id;

    const response = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set("Cookie", cookieA);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const deletedTransaction = await Transaction.findById(
      transactionId
    );

    expect(deletedTransaction).toBeNull();
  });

  // 11. USER DATA ISOLATION - LIST
  test("should not show another user's transactions", async () => {
    await createTransaction(cookieA, accountA._id);

    const response = await request(app)
      .get("/api/transactions")
      .set("Cookie", cookieB);

    expect(response.statusCode).toBe(200);
    expect(response.body.transactions).toHaveLength(0);
  });

  // 12. USER DATA ISOLATION - GET
  test("should prevent another user from viewing a transaction", async () => {
    const createResponse = await createTransaction(
      cookieA,
      accountA._id
    );

    const transactionId =
      createResponse.body.transaction._id;

    const response = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set("Cookie", cookieB);

    expect(response.statusCode).toBe(404);
  });

  // 13. USER DATA ISOLATION - UPDATE
  test("should prevent another user from updating a transaction", async () => {
    const createResponse = await createTransaction(
      cookieA,
      accountA._id
    );

    const transactionId =
      createResponse.body.transaction._id;

    const response = await request(app)
      .put(`/api/transactions/${transactionId}`)
      .set("Cookie", cookieB)
      .send({ amount: 9999 });

    expect(response.statusCode).toBe(404);

    const transaction = await Transaction.findById(transactionId);

    expect(transaction.amount).toBe(500);
  });

  // 14. USER DATA ISOLATION - DELETE
  test("should prevent another user from deleting a transaction", async () => {
    const createResponse = await createTransaction(
      cookieA,
      accountA._id
    );

    const transactionId =
      createResponse.body.transaction._id;

    const response = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set("Cookie", cookieB);

    expect(response.statusCode).toBe(404);

    const transaction = await Transaction.findById(transactionId);

    expect(transaction).not.toBeNull();
  });

  // 15. PROTECTED ROUTE
  test("should reject access without authentication", async () => {
    const response = await request(app)
      .get("/api/transactions");

    expect(response.statusCode).toBe(401);
  });
});