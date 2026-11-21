import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import Login from "../pages/Login";

const { mockLogin, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

// Mock authentication context
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// Mock toast notifications
vi.mock("react-hot-toast", () => ({
  default: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

// Track current route
const LocationDisplay = () => {
  const location = useLocation();

  return (
    <div data-testid="current-location">
      {location.pathname}
    </div>
  );
};

// Render login component with router
const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Login />
      <LocationDisplay />
    </MemoryRouter>
  );

describe("Login Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TEST 1: Render login form
  test("should render login form", () => {
    renderLogin();

    expect(screen.getByText("Welcome Back!")).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Enter your email")
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Enter your password")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Login" })
    ).toBeInTheDocument();
  });

  // TEST 2: Show and hide password
  test("should show and hide password", async () => {
    const user = userEvent.setup();

    renderLogin();

    const passwordInput = screen.getByPlaceholderText(
      "Enter your password"
    );

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click Show Password
    await user.click(
      screen.getByRole("button", { name: "Show password" })
    );

    // Password should become visible
    expect(passwordInput).toHaveAttribute("type", "text");

    // Click Hide Password
    await user.click(
      screen.getByRole("button", { name: "Hide password" })
    );

    // Password should become hidden again
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // TEST 3: Successful login
  test("should login successfully and navigate to dashboard", async () => {
    const user = userEvent.setup();

    mockLogin.mockResolvedValueOnce({});

    renderLogin();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "test@example.com"
    );

    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "Password@123"
    );

    await user.click(
      screen.getByRole("button", { name: "Login" })
    );

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password@123",
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Login successful!"
    );

    expect(
      screen.getByTestId("current-location")
    ).toHaveTextContent("/dashboard");
  });

  // TEST 4: Failed login
  test("should show error when login fails", async () => {
    const user = userEvent.setup();

    mockLogin.mockRejectedValueOnce({
      response: {
        data: {
          message: "Invalid credentials",
        },
      },
    });

    renderLogin();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "wrong@example.com"
    );

    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "WrongPassword"
    );

    await user.click(
      screen.getByRole("button", { name: "Login" })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Invalid credentials"
      );
    });
  });
});