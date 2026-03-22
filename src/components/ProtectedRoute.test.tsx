import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { BROWSE_SESSION_KEY } from "@/lib/cockpitAccess";
import ProtectedRoute from "@/components/ProtectedRoute";

function Child() {
  return <div data-testid="protected-child">inside</div>;
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    localStorage.removeItem("claw_wallet_session");
    localStorage.removeItem("clawgpt_demo_wallet_connected");
  });

  it("renders children when session exists", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1" },
      session: {},
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Child />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-child")).toBeInTheDocument();
  });

  it("renders children when browse-cockpit flag is set (non-strict auth)", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    localStorage.setItem(BROWSE_SESSION_KEY, "1");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Child />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-child")).toBeInTheDocument();
  });

  it("renders children when wallet session flag is set (non-strict auth)", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    localStorage.setItem("claw_wallet_session", "1");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Child />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-child")).toBeInTheDocument();
  });

  it("shows loader while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Child />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });
});
