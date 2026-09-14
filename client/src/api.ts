const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------
// Issue 3 — Authentication
// ---------------------------------------------------------

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface ApiErrorBody {
  error?: string;
  code?: string;
  details?: string[];
}

async function readJsonSafely(
  response: Response
): Promise<ApiErrorBody | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string
): Promise<CurrentUser> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(result?.error ?? "Invalid email or password");
  }

  return result as unknown as CurrentUser;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error("Unable to log out");
  }
}

// Returns null (rather than throwing) for a 401, since "not logged in" is
// the expected, common case when the app first loads.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to retrieve the current user");
  }

  return response.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<CurrentUser> {
  const response = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    const message =
      result?.details && result.details.length > 0
        ? result.details.join("\n")
        : result?.error ?? "Unable to change password";

    throw new Error(message);
  }

  return result as unknown as CurrentUser;
}

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);

  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categoriesRes = await fetch(
    `${API_URL}/api/categories`
  );

  if (!categoriesRes.ok) {
    throw new Error(
      "Unable to retrieve categories from API"
    );
  }

  const categories: Category[] =
    await categoriesRes.json();

  return {
    online: true,
    categories,
  };
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/api/categories`);

  if (!response.ok) {
    throw new Error("Unable to retrieve categories from API");
  }

  return response.json();
}

// ---------------------------------------------------------
// Ticket types
// ---------------------------------------------------------

export type RequestedPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

// Full Lab 3 status set (server/src/app.ts's `allowedStatuses`).
export type CurrentStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

// ---------------------------------------------------------
// My Tickets
// ---------------------------------------------------------

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  createdAt: string;
  summary: string;
  categoryName: string;
  relatedSystemName: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: CurrentStatus;
  lastUpdated: string;
  attachmentCount: number;
  ownerName: string | null;
  problemAppearsResolved: boolean;
}

export interface TicketListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: TicketListItem[];
  meta: TicketListMeta;
}

export interface TicketListParams {
  search?: string;
  categoryId?: number;
  priority?: RequestedPriority;
  status?: CurrentStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getMyTickets(
  params: TicketListParams
): Promise<TicketListResponse> {
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.categoryId !== undefined) {
    query.set(
      "categoryId",
      String(params.categoryId)
    );
  }

  if (params.priority) {
    query.set("priority", params.priority);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }

  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }

  query.set(
    "page",
    String(params.page ?? 1)
  );

  query.set(
    "pageSize",
    String(params.pageSize ?? 10)
  );

  const response = await fetch(
    `${API_URL}/api/tickets?${query.toString()}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve tickets from API"
    );
  }

  return response.json();
}

// ---------------------------------------------------------
// Related Systems
// ---------------------------------------------------------
export interface RelatedSystem {
  id: number;
  name: string;
  isActive: boolean;
}

export async function getRelatedSystems(): Promise<
  RelatedSystem[]
> {
  const response = await fetch(
    `${API_URL}/api/related-systems`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve related systems"
    );
  }

  return response.json();
}


// ---------------------------------------------------------
// Create Ticket
// ---------------------------------------------------------

export interface CreateTicketData {
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: RequestedPriority;
  summary: string;
  description: string;
  attachments?: File[];
}

export async function createTicket(
  data: CreateTicketData
) {
  const formData = new FormData();

  formData.append("categoryId", String(data.categoryId));
  formData.append(
    "relatedSystemId",
    String(data.relatedSystemId)
  );
  formData.append(
    "requestedPriority",
    data.requestedPriority
  );
  formData.append("summary", data.summary);
  formData.append("description", data.description);

  data.attachments?.forEach((file) => {
    formData.append("attachments", file);
  });

  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    if (result.errors) {
      const messages = Object.values(result.errors).join("\n");
      throw new Error(messages);
    }

    throw new Error(
      result.message ?? "Unable to create ticket"
    );
  }

  return result;
}

// ---------------------------------------------------------
// Ticket Detail
// ---------------------------------------------------------

export interface TicketAttachment {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  isRemoved: boolean;
  removedAt: string | null;
  removedReason: string | null;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: CurrentStatus;
  problemAppearsResolved: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    name: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  owner: {
    id: number;
    name: string;
  } | null;
  attachments: TicketAttachment[];
}

export async function getTicketDetail(
  ticketId: number
): Promise<TicketDetail> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve ticket details"
    );
  }

  return response.json();
}

export async function addAttachments(
  ticketId: number,
  files: File[]
) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("attachments", file);
  });

  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ?? "Unable to add attachments"
    );
  }

  return result;
}

export async function removeAttachment(
  ticketId: number,
  attachmentId: number,
  reason: string
) {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ?? "Unable to remove attachment"
    );
  }

  return result;
}

export function getAttachmentDownloadUrl(
  ticketId: number,
  attachmentId: number
): string {
  return `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download`;
}

export async function downloadAttachment(
  ticketId: number,
  attachmentId: number
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(
      result?.message ?? "Unable to download attachment"
    );
  }

  return response.blob();
}

// ---------------------------------------------------------
// Issue 5 — IT Staff Ticket Queue (GitHub Issue #32)
// ---------------------------------------------------------

export interface StaffTicketListItem {
  id: number;
  ticketNumber: string;
  createdAt: string;
  summary: string;
  categoryName: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: CurrentStatus;
  ownerId: number | null;
  ownerName: string | null;
  lastUpdated: string;
}

export interface StaffTicketListResponse {
  data: StaffTicketListItem[];
  meta: TicketListMeta;
}

export type StaffQueueSortField =
  | "createdAt"
  | "updatedAt"
  | "ticketNumber"
  | "priority";

export interface StaffTicketQueueParams {
  q?: string;
  status?: CurrentStatus;
  priority?: RequestedPriority;
  requestedPriority?: RequestedPriority;
  categoryId?: number;
  ownerId?: "me" | "unassigned" | number;
  sort?: StaffQueueSortField;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getStaffTicketQueue(
  params: StaffTicketQueueParams
): Promise<StaffTicketListResponse> {
  const query = new URLSearchParams();

  if (params.q) {
    query.set("q", params.q);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.priority) {
    query.set("priority", params.priority);
  }

  if (params.requestedPriority) {
    query.set("requestedPriority", params.requestedPriority);
  }

  if (params.categoryId !== undefined) {
    query.set("categoryId", String(params.categoryId));
  }

  if (params.ownerId !== undefined) {
    query.set("ownerId", String(params.ownerId));
  }

  query.set("sort", params.sort ?? "updatedAt");
  query.set("dir", params.dir ?? "desc");
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));

  const response = await fetch(
    `${API_URL}/api/staff/tickets?${query.toString()}`,
    { credentials: "include" }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ??
        "Unable to retrieve the ticket queue"
    );
  }

  return result as unknown as StaffTicketListResponse;
}

export interface StaffTicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  currentStatus: CurrentStatus;
  problemAppearsResolved: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string };
  owner: { id: number; name: string } | null;
  attachments: TicketAttachment[];
}

export async function getStaffTicketDetail(
  ticketId: number
): Promise<StaffTicketDetail> {
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    credentials: "include",
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ?? "Unable to retrieve ticket"
    );
  }

  return result as unknown as StaffTicketDetail;
}

// ---------------------------------------------------------
// Issue 6 — IT Staff Ticket Detail operations (GitHub Issue #33)
// ---------------------------------------------------------

export interface EligibleOwner {
  id: number;
  name: string;
  role: UserRole;
}

export async function getEligibleOwners(): Promise<EligibleOwner[]> {
  const response = await fetch(`${API_URL}/api/staff/eligible-owners`, {
    credentials: "include",
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ??
        "Unable to retrieve eligible Ticket Owners"
    );
  }

  return result as unknown as EligibleOwner[];
}

// Omit ownerId to self-claim; pass it to assign/reassign to another
// eligible (active IT Staff/Administrator) user (BR-06).
export async function claimTicket(
  ticketId: number,
  ownerId?: number
): Promise<{ id: number; owner: { id: number; name: string } | null }> {
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/claim`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ownerId === undefined ? {} : { ownerId }),
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ?? "Unable to update Ticket Owner"
    );
  }

  return result as unknown as {
    id: number;
    owner: { id: number; name: string } | null;
  };
}

export async function updateItPriority(
  ticketId: number,
  itPriority: RequestedPriority
): Promise<{ id: number; itPriority: RequestedPriority }> {
  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/priority`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itPriority }),
    }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ?? "Unable to update IT Priority"
    );
  }

  return result as unknown as { id: number; itPriority: RequestedPriority };
}

export async function updateTicketStatus(
  ticketId: number,
  currentStatus: CurrentStatus
): Promise<{ id: number; currentStatus: CurrentStatus }> {
  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStatus }),
    }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ?? "Unable to update ticket status"
    );
  }

  return result as unknown as { id: number; currentStatus: CurrentStatus };
}

// ---------------------------------------------------------------------------
// Internal Notes (BR-04) — IT Staff/Administrator only, both to read and to
// create. Deliberately a separate resource/type from TicketComment: never
// rendered in the Requester's TicketDetail, and a Requester's session never
// reaches these routes at all (403 before any note content is computed).
// ---------------------------------------------------------------------------
export interface TicketNote {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: UserRole;
  };
}

export async function getInternalNotes(
  ticketId: number
): Promise<TicketNote[]> {
  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/notes`,
    { credentials: "include" }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ??
        "Unable to retrieve Internal Notes"
    );
  }

  return result as unknown as TicketNote[];
}

export async function postInternalNote(
  ticketId: number,
  content: string
): Promise<TicketNote> {
  const response = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/notes`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ?? "Unable to post Internal Note"
    );
  }

  return result as unknown as TicketNote;
}

// ---------------------------------------------------------
// Issue 4 — Public Comments (BR-04, shared Requester/IT Staff/Admin route)
// ---------------------------------------------------------

export interface TicketComment {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: UserRole;
  };
}

export async function getComments(
  ticketId: number
): Promise<TicketComment[]> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/comments`,
    {
      credentials: "include",
    }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ??
        "Unable to retrieve comments"
    );
  }

  return result as unknown as TicketComment[];
}

export async function postComment(
  ticketId: number,
  content: string
): Promise<TicketComment> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/comments`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(result?.error ?? "Unable to post comment");
  }

  return result as unknown as TicketComment;
}

// ---------------------------------------------------------
// Issue 4 — "Problem Appears Resolved" (FR-08/BR-05, Requester-only)
// ---------------------------------------------------------

export async function setProblemAppearsResolved(
  ticketId: number,
  problemAppearsResolved: boolean
): Promise<{
  id: number;
  problemAppearsResolved: boolean;
  currentStatus: CurrentStatus;
}> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/resolution-flag`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ problemAppearsResolved }),
    }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(result?.error ?? "Unable to update ticket");
  }

  return result as unknown as {
    id: number;
    problemAppearsResolved: boolean;
    currentStatus: CurrentStatus;
  };
}

// ---------------------------------------------------------------------------
// Issue 7 — Administrator User Management (FR-15..FR-19, BR-13..BR-16)
// docs/lab-03/api-spec.md §Administrator User Management.
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  meta: TicketListMeta;
}

export interface AdminUserListParams {
  q?: string;
  role?: UserRole;
  page?: number;
  pageSize?: number;
}

export async function getAdminUsers(
  params: AdminUserListParams
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();

  if (params.q) {
    query.set("q", params.q);
  }

  if (params.role) {
    query.set("role", params.role);
  }

  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 50));

  const response = await fetch(`${API_URL}/api/admin/users?${query.toString()}`, {
    credentials: "include",
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ?? "Unable to retrieve users"
    );
  }

  return result as unknown as AdminUserListResponse;
}

export interface CreateAdminUserData {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  initialPassword: string;
}

export async function createAdminUser(
  data: CreateAdminUserData
): Promise<AdminUser> {
  const response = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    const message =
      (result as unknown as ApiErrorBody)?.details &&
      (result as unknown as ApiErrorBody).details!.length > 0
        ? (result as unknown as ApiErrorBody).details!.join("\n")
        : (result as unknown as ApiErrorBody)?.error ?? "Unable to create user";

    throw new Error(message);
  }

  return result as unknown as AdminUser;
}

export interface UpdateAdminUserData {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export async function updateAdminUser(
  userId: number,
  data: UpdateAdminUserData
): Promise<AdminUser> {
  const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      (result as unknown as ApiErrorBody)?.error ?? "Unable to update user"
    );
  }

  return result as unknown as AdminUser;
}

export async function resetAdminUserPassword(
  userId: number,
  newInitialPassword: string
): Promise<AdminUser> {
  const response = await fetch(
    `${API_URL}/api/admin/users/${userId}/reset-password`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newInitialPassword }),
    }
  );

  const result = await readJsonSafely(response);

  if (!response.ok) {
    const message =
      (result as unknown as ApiErrorBody)?.details &&
      (result as unknown as ApiErrorBody).details!.length > 0
        ? (result as unknown as ApiErrorBody).details!.join("\n")
        : (result as unknown as ApiErrorBody)?.error ?? "Unable to reset password";

    throw new Error(message);
  }

  return result as unknown as AdminUser;
}
