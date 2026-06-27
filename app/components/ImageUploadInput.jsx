import { useRef, useState } from "react";
import { Button, InlineStack, Box, Thumbnail, Spinner, Text } from "@shopify/polaris";

/**
 * Universal image upload component.
 *
 * Uploads the selected file to /api/upload which stores it in
 * DigitalOcean Spaces and returns the public CDN URL.
 * Calls onChange(cdnUrl) on success — no Base64 strings anywhere.
 */
export default function ImageUploadInput({ value, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    // Reset so selecting the same file again re-triggers onChange
    e.target.value = null;
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res  = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (json.ok && json.url) {
        onChange(json.url);
      } else {
        setUploadError(json.error || "Upload failed. Please try again.");
      }
    } catch (err) {
      setUploadError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box width="100%">
      {/* Hidden native file picker */}
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {uploading ? (
        /* ── Loading state ── */
        <InlineStack gap="200" blockAlign="center">
          <Spinner accessibilityLabel="Uploading image" size="small" />
          <Text as="span" tone="subdued" variant="bodySm">Uploading…</Text>
        </InlineStack>
      ) : value ? (
        /* ── Image preview ── */
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            style={{
              cursor: "pointer",
              flexShrink: 0,
              borderRadius: "var(--p-border-radius-100)",
              overflow: "hidden",
              border: "1px solid var(--p-color-border)",
            }}
            title="Change image"
          >
            <Thumbnail source={value} alt="Uploaded preview" size="small" />
          </div>
          <Button
            variant="plain"
            tone="critical"
            onClick={(e) => { e.preventDefault(); onChange(""); }}
          >
            Remove
          </Button>
        </InlineStack>
      ) : (
        /* ── Default state ── */
        <Button fullWidth onClick={() => fileInputRef.current?.click()}>
          Upload image
        </Button>
      )}

      {/* Error feedback */}
      {uploadError && (
        <Box paddingBlockStart="100">
          <Text as="p" tone="critical" variant="bodySm">{uploadError}</Text>
        </Box>
      )}
    </Box>
  );
}
