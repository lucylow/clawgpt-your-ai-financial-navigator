import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary
    fallback={
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          background: "#0A0F1F",
          color: "#e2e8f0",
        }}
        role="alert"
      >
        <p style={{ maxWidth: 480, textAlign: "center" }}>
          Something went wrong loading the app. Open the browser console for details, or refresh the
          page.
        </p>
      </div>
    }
  >
    <App />
  </ErrorBoundary>,
);
