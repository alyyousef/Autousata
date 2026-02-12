import React from "react";
import ActivityLogsView from "../components/ActivityLogsView";

const AdminActivityAlertsPage: React.FC = () => {
  return (
    <ActivityLogsView
      preset={{
        title: "Security Alerts",
        subtitle:
          "High-risk events (ALERT) and suspicious activity for quick investigation.",
        crumb: "Admin / Activity / Alerts",
        backTo: "/admin/activity",

        // ✅ presets:
        severity: "ALERT",
        suspiciousOnly: true,

        // optional: set date range default
        // from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        // to: new Date().toISOString(),
      }}
    />
  );
};

export default AdminActivityAlertsPage;
