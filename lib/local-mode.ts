export function isLocalDashboardMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.LOCAL_DASHBOARD_MODE === "true"
  );
}
