import { useRef } from "react";
import { Box, Text } from "@shopify/polaris";

export default function ColorPickerInput({ value, onChange, label }) {
  const inputRef = useRef(null);
  
  return (
    <Box width="100%">
      {label && (
        <Box paddingBlockEnd="100">
          <Text as="span" variant="bodySm" fontWeight="medium" tone="subdued">
            {label}
          </Text>
        </Box>
      )}
      <div 
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid var(--p-color-border)",
          borderRadius: "var(--p-border-radius-100)",
          padding: "var(--p-space-150) var(--p-space-200)",
          backgroundColor: "var(--p-color-bg-surface)",
          cursor: "pointer",
          width: "100%",
          boxSizing: "border-box",
          boxShadow: "var(--p-shadow-100)"
        }}
      >
        <div style={{
          width: "24px",
          height: "24px",
          backgroundColor: value || "#000000",
          borderRadius: "var(--p-border-radius-050)",
          border: "1px solid var(--p-color-border-strong)",
          marginRight: "var(--p-space-200)",
          flexShrink: 0
        }} />
        <Text as="span" variant="bodyMd" tone="base">
          {value || "#000000"}
        </Text>
        
        {/* Hidden native color input to trigger the popup */}
        <input 
          ref={inputRef}
          type="color" 
          value={value || "#000000"} 
          onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", opacity: 0, width: "0", height: "0", pointerEvents: "none" }}
        />
      </div>
    </Box>
  );
}
