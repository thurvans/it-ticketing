export function getTicketDetailPath(role, ticketId) {
  if (role === "user") {
    return `/user/tickets/${ticketId}`;
  }

  if (role === "technician") {
    return `/technician/tickets/${ticketId}`;
  }

  return `/admin/tickets/${ticketId}`;
}

export function getTicketsListPath(role) {
  if (role === "user") {
    return "/user/tickets";
  }

  if (role === "technician") {
    return "/technician/tickets";
  }

  return "/admin/tickets";
}

