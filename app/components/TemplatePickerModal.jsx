import { useState, useMemo } from "react";
import { Modal, TextField, Card, Box, Text, Button, InlineStack, BlockStack } from "@shopify/polaris";

const MOCK_TEMPLATES = [
  {
    id: "tpl-1",
    title: "Gift Wrapping Options",
    description: "Add gift wrap, card message, and recipient details.",
    elements: [
      { type: "Checkbox", label: "Add Gift Wrap?", config: { options: [{ label: "Yes, please", value: "yes", addOnValue: 5 }] } },
      { type: "Textarea", label: "Gift Message", config: { placeholder: "Write your message here" } }
    ]
  },
  {
    id: "tpl-2",
    title: "Custom Engraving",
    description: "Text input for engraving with font selection.",
    elements: [
      { type: "Text", label: "Engraving Text", config: { placeholder: "Max 15 characters", maxLength: 15 } },
      { type: "Google Font Selector", label: "Font Style", config: {} }
    ]
  },
  {
    id: "tpl-3",
    title: "Shoe Customization",
    description: "Color swatches for different parts of the shoe.",
    elements: [
      { type: "Color Swatch", label: "Base Color", config: { swatches: [{ label: "Red", color: "#ff0000" }, { label: "Blue", color: "#0000ff" }] } },
      { type: "Color Swatch", label: "Laces Color", config: { swatches: [{ label: "White", color: "#ffffff" }, { label: "Black", color: "#000000" }] } }
    ]
  },
  {
    id: "tpl-4",
    title: "File Upload Request",
    description: "Ask customers to upload artwork or reference images.",
    elements: [
      { type: "File Upload", label: "Upload Artwork", config: { acceptedTypes: ["image/*", ".pdf"] } },
      { type: "Textarea", label: "Design Notes", config: { placeholder: "Any specific instructions?" } }
    ]
  }
];

export default function TemplatePickerModal({ open, onClose, onSelect }) {
  const [search, setSearch] = useState("");

  const filteredTemplates = useMemo(() => {
    return MOCK_TEMPLATES.filter(tpl => 
      tpl.title.toLowerCase().includes(search.toLowerCase()) || 
      tpl.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select a Template"
      large
      primaryAction={{
        content: "Cancel",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <TextField
            label="Search templates"
            labelHidden
            placeholder="Search templates..."
            value={search}
            onChange={setSearch}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setSearch("")}
          />

          {filteredTemplates.length === 0 ? (
            <Box padding="400">
              <Text alignment="center" tone="subdued">No templates found.</Text>
            </Box>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {filteredTemplates.map(tpl => (
                <Card key={tpl.id} padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingMd" as="h3">{tpl.title}</Text>
                    <Text tone="subdued" as="p">{tpl.description}</Text>
                    <Text variant="bodySm" tone="subdued">{tpl.elements.length} elements</Text>
                    
                    <InlineStack align="end">
                      <Button variant="primary" onClick={() => onSelect(tpl.elements)}>
                        Use template
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              ))}
            </div>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
