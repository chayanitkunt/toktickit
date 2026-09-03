const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
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

export async function getRequesters(): Promise<Requester[]> {
  const response = await fetch(
    `${API_URL}/api/requesters`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve requesters from API"
    );
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

export type CurrentStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "PENDING";

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
  currentStatus: CurrentStatus;
  lastUpdated: string;
  attachmentCount: number;
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
  requesterId: number;
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
      headers: {
        "X-Requester-Id": String(
          params.requesterId
        ),
      },
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
  requesterId: number,
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
    headers: {
      "X-Requester-Id": String(requesterId),
    },
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
  currentStatus: CurrentStatus;
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
  attachments: TicketAttachment[];
}

export async function getTicketDetail(
  requesterId: number,
  ticketId: number
): Promise<TicketDetail> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}`,
    {
      headers: {
        "X-Requester-Id": String(requesterId),
      },
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
  requesterId: number,
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
      headers: {
        "X-Requester-Id": String(requesterId),
      },
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
  requesterId: number,
  ticketId: number,
  attachmentId: number,
  reason: string
) {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: {
        "X-Requester-Id": String(requesterId),
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
  requesterId: number,
  ticketId: number,
  attachmentId: number
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download`,
    {
      headers: {
        "X-Requester-Id": String(requesterId),
      },
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
