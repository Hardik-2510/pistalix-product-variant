import { Popover, Button, ActionList } from "@shopify/polaris";
import { useState, useCallback } from "react";

/**
 * All element types grouped into 5 categories.
 * Shared constant used by both ElementTypePicker and AddOptionMegaMenu.
 */
export const elementCategories = [
  {
    title: "Input",
    items: [
      { label: "Text", type: "Text", icon: "Aa" },
      { label: "Textarea", type: "Textarea", icon: "≣" },
      { label: "Number", type: "Number", icon: "#" },
      { label: "Phone", type: "Phone", icon: "📞" },
      { label: "Email", type: "Email", icon: "✉" },
      { label: "Hidden Field", type: "Hidden Field", icon: "🔒" },
      { label: "Datetime", type: "datetime", icon: "📅" },
      { label: "File Upload", type: "file_upload", icon: "📎" },
      { label: "Color Picker", type: "color_picker", icon: "🎨" },
      { label: "Switch", type: "switch", icon: "⇋" },
      { label: "Range Slider", type: "range_slider", icon: "⬌" },
      { label: "Dimension", type: "dimension", icon: "⤡" },
    ],
  },
  {
    title: "Selection",
    items: [
      { label: "Select", type: "Select", icon: "▾" },
      { label: "Dropdown", type: "Dropdown", icon: "⌄" },
      { label: "Color Dropdown", type: "Color Dropdown", icon: "🎨⌄" },
      { label: "Image Dropdown", type: "Image Dropdown", icon: "🖼️⌄" },
      { label: "Radio Button", type: "Radio Button", icon: "◉" },
      { label: "Checkbox", type: "Checkbox", icon: "☑" },
      { label: "Button", type: "Button", icon: "🔘" },
      { label: "Color Swatch", type: "Color Swatch", icon: "🎨" },
      { label: "Image Swatch", type: "Image Swatch", icon: "🖼️" },
      { label: "Font Picker", type: "font_picker", icon: "A" },
      { label: "Product Links", type: "product_links", icon: "🔗" },
    ],
  },
  {
    title: "Static",
    items: [
      { label: "Heading", type: "heading", icon: "T" },
      { label: "Divider", type: "divider", icon: "—" },
      { label: "Spacing", type: "spacing", icon: "↕" },
      { label: "Paragraph", type: "paragraph", icon: "¶" },
      { label: "HTML", type: "html", icon: "</>" },
      { label: "Pop-up Modal", type: "popup_modal", icon: "↗" },
      { label: "Size chart", type: "size_chart", icon: "📏" },
      { label: "Tabs", type: "tabs", icon: "⊞" },
      { label: "Bundle", type: "bundle", icon: "📦" },
      { label: "Variant Fetcher", type: "variant_fetcher", icon: "🔄" },
    ],
  },
];

/**
 * Returns a default description for each element type.
 */
export function getElementDescription(type) {
  const descriptions = {
    "Text": "Customers enter text.",
    "Textarea": "Customers enter multi-line text.",
    "Number": "Customers enter a number.",
    "Phone": "Customers enter phone number.",
    "Email": "Customers enter email.",
    "Hidden Field": "Hidden data field.",
    "datetime": "Date & time picker.",
    "file_upload": "Customers upload a file.",
    "color_picker": "Customers pick a color.",
    "switch": "Toggle switch control.",
    "range_slider": "Range slider control.",
    "dimension": "Width and height inputs.",
    "Select": "Multiple select options.",
    "Dropdown": "Toggleable menu list.",
    "Color Dropdown": "Color select dropdown.",
    "Image Dropdown": "Image select dropdown.",
    "Radio Button": "Customers select one option.",
    "Checkbox": "Customers check/uncheck.",
    "Button": "Button swatch selector.",
    "Color Swatch": "Color swatch selector.",
    "Image Swatch": "Image swatch selector.",
    "font_picker": "Font picker.",
    "product_links": "Product links selector.",
    "heading": "Form section header.",
    "divider": "Horizontal line divider.",
    "spacing": "Empty spacing block.",
    "paragraph": "Descriptive paragraph.",
    "html": "Custom HTML block.",
    "popup_modal": "Pop-up modal content.",
    "size_chart": "Size chart table.",
    "tabs": "Tabbed content sections.",
    "bundle": "Select multiple products to bundle.",
    "variant_fetcher": "Fetch & display product variants.",
  };
  return descriptions[type] || "Custom field.";
}

/**
 * Returns the default config JSON shape for an element type.
 */
export function getDefaultConfig(type) {
  switch (type) {
    case "Text":
    case "Textarea":
    case "Number":
    case "Phone":
    case "Email":
      return { placeholder: "", required: false, minLength: null, maxLength: null, addOnPrice: null, addOnType: "fixed" };
    case "Dropdown":
    case "Select":
    case "Radio Button":
    case "Checkbox":
    case "Button":
      return { options: [{ label: "Option 1", value: "option-1", addOnPrice: null }, { label: "Option 2", value: "option-2", addOnPrice: null }], required: false };
    case "Color Swatch":
      return { swatches: [
        { label: "Red", color: "#ff0000", addOnPrice: null },
        { label: "Blue", color: "#0000ff", addOnPrice: null }
      ] };
    case "Image Swatch":
      return { swatches: [
        { label: "Pattern 1", color: "#eeeeee", imageUrl: null, addOnPrice: null },
        { label: "Pattern 2", color: "#cccccc", imageUrl: null, addOnPrice: null }
      ] };
    case "Color Dropdown":
      return { options: [
        { label: "Red", value: "red", addOnPrice: null },
        { label: "Blue", value: "blue", addOnPrice: null }
      ], required: false };
    case "Image Dropdown":
      return { options: [
        { label: "Pattern 1", value: "pattern-1", addOnPrice: null },
        { label: "Pattern 2", value: "pattern-2", addOnPrice: null }
      ], required: false };
    case "file_upload":
      return { maxFiles: 1, maxSizeMB: 10, acceptedTypes: ["image/*", ".pdf"] };
    case "datetime":
      return { minDate: null, maxDate: null, disablePast: false };
    case "heading":
    case "paragraph":
      return { content: "", style: {} };
    case "divider":
      return { style: {} };
    case "spacing":
      return { height: 20 };
    case "html":
      return { content: "<div></div>", style: {} };
    case "popup_modal":
      return { triggerText: "View Details", content: "<p>Pop-up modal content goes here.</p>", style: {} };
    case "Hidden Field":
      return { value: "" };
    case "switch":
      return { defaultValue: false };
    case "color_picker":
      return { defaultColor: "#000000" };
    case "font_picker":
      return { fonts: ["Inter", "Roboto", "Open Sans"], placeholder: "Select a font" };
    case "dimension":
      return { unit: "cm", enableHeight: true };
    case "tabs":
      return { tabs: [{ label: "Description", content: "Product description" }, { label: "Shipping", content: "Shipping info" }] };
    case "product_links":
      return { products: [{ title: "Sample Product", id: "1" }, { title: "Another Product", id: "2" }] };
    case "size_chart":
      return { triggerText: "Size Chart", content: "<table><tr><th>Size</th><th>Chest</th></tr><tr><td>S</td><td>36</td></tr></table>" };
    case "range_slider":
      return { min: 0, max: 100, step: 1 };
    case "bundle":
      return { bundleProducts: [] };
    case "variant_fetcher":
      return { displayStyle: "button", hideOriginalSelectors: true };
    default:
      return {};
  }
}

/**
 * ElementTypePicker — Grouped popover dropdown for selecting element types.
 * Shows all 5 categories with icons. Used in the Option Set builder.
 */
export default function ElementTypePicker({ onSelect }) {
  const [active, setActive] = useState(false);
  const toggleActive = useCallback(() => setActive((prev) => !prev), []);

  const handleAction = useCallback(
    (item) => {
      const typeStr = item.type || item.label;
      onSelect({
        type: typeStr,
        label: item.label,
        icon: item.icon,
        description: getElementDescription(typeStr),
        config: getDefaultConfig(typeStr),
      });
      setActive(false);
    },
    [onSelect]
  );

  const activator = (
    <Button variant="primary" onClick={toggleActive}>
      Add element
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
              items: category.items.map((item) => ({
                content: item.label,
                prefix: <span style={{ fontSize: "16px", width: "24px", textAlign: "center" }}>{item.icon}</span>,
                onAction: () => handleAction(item),
              })),
            }))}
          />
        </div>
      </Popover.Pane>
    </Popover>
  );
}
