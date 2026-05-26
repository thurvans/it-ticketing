export async function sendNotificationEmail(notificationId) {
  if (!notificationId) {
    return { skipped: true };
  }

  return {
    skipped: true,
    reason: "email-backend-not-configured",
  };
}

export async function safeSendNotificationEmail(notificationId) {
  try {
    return await sendNotificationEmail(notificationId);
  } catch (error) {
    console.error("Email notification failed:", error);
    return { skipped: false, error: error?.message || "Email notification failed" };
  }
}
