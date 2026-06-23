import { useState, useCallback } from "react";
import {
  Popover,
  Button,
  Text,
  InlineStack,
  ActionList,
  Tooltip,
} from "@shopify/polaris";
import { useNavigate } from "react-router";

/**
 * Full element categories for the "Add option" mega-menu popover.
 * Organized into 5 columns matching the ElementTypePicker categories.
 */
const elementCategories = [
  {
    title: "Single Input",
    items: [
      { label: "Text", icon: "📝", description: "Customers enter text." },
      { label: "Textarea", icon: "📄", description: "Customers enter multi-line text." },
      { label: "Number", icon: "#️⃣", description: "Customers enter a number." },
      { label: "Phone", icon: "📞", description: "Customers enter phone number." },
      { label: "Email", icon: "✉️", description: "Customers enter email." },
      { label: "Hidden Field", icon: "🔒", description: "Hidden data field." },
      { label: "Datetime", icon: "📅", description: "Date & time picker." },
      { label: "File Upload", icon: "📎", description: "Customers upload a file." },
      { label: "Color Picker", icon: "🎨", description: "Customers pick a color." },
    ],
  },
  {
    title: "Choice List",
    items: [
      { label: "Dropdown", icon: "⌄", description: "Toggleable menu list." },
      { label: "Color Dropdown", icon: "🎨⌄", description: "Color select dropdown." },
      { label: "Image Dropdown", icon: "🖼️⌄", description: "Image select dropdown." },
      { label: "Select", icon: "☑️", description: "Dropdown list selection." },
      { label: "Radio Button", icon: "◉", description: "Customers select one option." },
      { label: "Checkbox", icon: "☐", description: "Customers check/uncheck." },
    ],
  },
  {
    title: "Swatch",
    items: [
      { label: "Button", icon: "🔘", description: "Button swatch selector." },
      { label: "Color Swatch", icon: "🎨", description: "Color swatch selector." },
      { label: "Image Swatch", icon: "🖼️", description: "Image swatch selector." },
    ],
  },
  {
    title: "Static Text",
    items: [
      { label: "Heading", icon: "H", description: "Form section header." },
      { label: "Divider", icon: "—", description: "Horizontal line divider." },
      { label: "Paragraph", icon: "¶", description: "Descriptive paragraph." },
      { label: "HTML", icon: "</>", description: "Custom HTML block." },
      { label: "Pop-up Modal", icon: "↗", description: "Pop-up modal content." },
    ],
  },
  {
    title: "Others",
    items: [
      { label: "Switch", icon: "⇋", description: "Toggle switch control." },
      { label: "Google Font Selector", icon: "Aa", description: "Font picker." },
      { label: "Tabs", icon: "⊞", description: "Tabbed content sections." },
      { label: "Bundle", icon: "📦", description: "Select multiple products to bundle." },
      { label: "Variant Fetcher", icon: "🔄", description: "Fetch & display product variants." },
    ],
  },
];

/**
 * AddOptionMegaMenu — A multi-column popover mega-menu for adding
 * template option elements, categorized by type.
 */
export default function AddOptionMegaMenu({ onSelect, currentTier = "free" }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const toggleActive = useCallback(() => setActive((prev) => !prev), []);

  const handleSelect = useCallback(
    (item) => {
      onSelect({
        type: item.label,
        label: item.label,
        subtext: item.description,
        icon: item.icon,
      });
      setActive(false);
    },
    [onSelect]
  );

  const activator = (
    <Button variant="plain" onClick={toggleActive}>
      <InlineStack gap="100" blockAlign="center">
        <Text as="span" tone="magic" fontWeight="semibold">⊕</Text>
        <Text as="span" tone="magic" fontWeight="medium">Add option</Text>
      </InlineStack>
    </Button>
  );

  return (
    <Popover
      active={active}
      activator={activator}
      onClose={() => setActive(false)}
      preferredAlignment="left"
      preferredPosition="below"
      autofocusTarget="none"
    >
      <Popover.Pane fixedHeight>
        <div style={{ maxHeight: "60vh" }}>
          <ActionList
            actionRole="menuitem"
            sections={elementCategories.map((category) => ({
              title: category.title,
              items: category.items.map((item) => {
                // Standard-tier elements: unlocked at standard+
                const isStandardFeature = ["Datetime", "File Upload", "Color Picker", "Color Dropdown", "Image Dropdown", "Color Swatch", "Image Swatch", "Pop-up Modal", "HTML", "Switch", "Tabs"].includes(item.label);
                // Premium-tier elements: unlocked only at premium
                const isPremiumFeature = ["Google Font Selector", "Bundle", "Variant Fetcher"].includes(item.label);
                
                const locked = (isStandardFeature && currentTier === "basic") || (isPremiumFeature && (currentTier === "basic" || currentTier === "standard"));

                const itemContent = (
                  <span style={{ color: locked ? "var(--p-color-text-subdued)" : "inherit", display: "inline-flex", alignItems: "center" }}>
                    {item.label}
                    {locked && (
                      <svg viewBox="0 0 20 20" style={{ width: '12px', height: '12px', fill: '#EBB424', marginLeft: '6px' }}>
                        <path d="M10 1l2.928 5.933 6.549.952-4.738 4.618 1.118 6.523L10 16.035l-5.857 3.078 1.118-6.523L.523 7.885l6.549-.952L10 1z"/>
                      </svg>
                    )}
                  </span>
                );

                return {
                  content: locked ? (
                    <Tooltip
                      content={
                        <span>
                          🔒 This feature is available on <span role="link" tabIndex={0} onClick={(e) => { e.stopPropagation(); navigate("/app/pricing"); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate("/app/pricing"); } }} style={{color: "#2c6ecb", textDecoration: "underline", cursor: "pointer"}}>higher</span> plan.
                        </span>
                      }
                      dismissOnMouseOut={false}
                    >
                      {itemContent}
                    </Tooltip>
                  ) : itemContent,
                  helpText: item.description,
                  prefix: <span style={{ fontSize: "16px", width: "24px", textAlign: "center", opacity: locked ? 0.4 : 1, filter: locked ? "grayscale(100%)" : "none" }}>{item.icon}</span>,
                  onAction: () => {
                    if (locked) {
                      navigate("/app/pricing");
                      return;
                    }
                    handleSelect(item);
                  },
                };
              }),
            }))}
          />
        </div>
      </Popover.Pane>
    </Popover>
  );
}
