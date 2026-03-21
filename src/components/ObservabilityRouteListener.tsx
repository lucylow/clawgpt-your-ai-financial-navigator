import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initInteractionDataAttributes, initWebVitals, trackPageView } from "@/lib/observability";

/**
 * Registers Web Vitals + delegated [data-track] clicks once, and records SPA route changes.
 */
export default function ObservabilityRouteListener() {
  const location = useLocation();

  useEffect(() => {
    initWebVitals();
    initInteractionDataAttributes();
  }, []);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return null;
}
