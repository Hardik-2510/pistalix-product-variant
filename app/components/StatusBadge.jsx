import { Badge } from "@shopify/polaris";

export default function StatusBadge({ status }) {
  const tone = status === "active" ? "success" : "attention";
  return <Badge tone={tone}>{status === "active" ? "Active" : "Inactive"}</Badge>;
}
