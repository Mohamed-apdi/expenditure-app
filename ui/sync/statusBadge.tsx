export function getRecordBadge(status?: string): "Conflict" | "Failed" | "Pending" | "Synced" {
  switch (status) {
    case "conflict":
      return "Conflict";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    default:
      return "Synced";
  }
}

