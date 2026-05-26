const TICKET_DRAFTS_KEY = "it-ticketing-ticket-drafts-v1";

function readDraftMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(TICKET_DRAFTS_KEY);
    return rawValue ? JSON.parse(rawValue) : {};
  } catch {
    return {};
  }
}

function writeDraftMap(draftMap) {
  if (typeof window === "undefined") {
    return draftMap;
  }

  window.localStorage.setItem(TICKET_DRAFTS_KEY, JSON.stringify(draftMap));
  return draftMap;
}

function sanitizeDraft(values = {}) {
  return {
    title: values.title || "",
    category_id: values.category_id || "",
    priority: values.priority || "Medium",
    description: values.description || "",
    department: values.department || "",
    location: values.location || "",
    contact_number: values.contact_number || "",
    attachment_names: values.attachments?.map((file) => file.name).filter(Boolean) || [],
  };
}

export function hasTicketDraftContent(values = {}) {
  const draft = sanitizeDraft(values);

  return Object.entries(draft).some(([key, value]) => {
    if (key === "priority") {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return Boolean(String(value || "").trim());
  });
}

export function getTicketDraft(userId) {
  if (!userId) {
    return null;
  }

  const draftMap = readDraftMap();
  return draftMap[userId] || null;
}

export function saveTicketDraft(userId, values) {
  if (!userId) {
    return null;
  }

  const nextDraft = {
    ...sanitizeDraft(values),
    saved_at: new Date().toISOString(),
  };

  const draftMap = readDraftMap();
  draftMap[userId] = nextDraft;
  writeDraftMap(draftMap);
  return nextDraft;
}

export function clearTicketDraft(userId) {
  if (!userId) {
    return null;
  }

  const draftMap = readDraftMap();
  delete draftMap[userId];
  writeDraftMap(draftMap);
  return null;
}
