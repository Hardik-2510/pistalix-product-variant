const fs = require('fs');
let code = fs.readFileSync('app/routes/app.settings.jsx', 'utf8');

// 1. Add imports and CustomToggle
code = code.replace(
  'import english from "@shopify/polaris/locales/en.json";',
  `import english from "@shopify/polaris/locales/en.json";
import {
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  TextDirectionLtrIcon
} from "@shopify/polaris-icons";

function CustomToggle({ checked, onChange }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: "40px", height: "24px", borderRadius: "12px",
        background: checked ? "#2c2e2f" : "#c4cdd5",
        position: "relative", cursor: "pointer",
        transition: "background 0.2s ease"
      }}
    >
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%",
        background: "white",
        position: "absolute", top: "3px",
        left: checked ? "19px" : "3px",
        transition: "left 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
      }} />
    </div>
  );
}
`
);

// 2. Replace SettingToggle with CustomToggle globally
code = code.replace(/<SettingToggle\s+enabled=\{toggleStates\.(\w+)\}\s+onToggle=\{\(\) => handleToggle\("(\w+)"\)\}\s+\/>/g, (match, key1, key2) => {
  return `<CustomToggle checked={toggleStates.${key1}} onChange={() => handleToggle("${key2}")} />`;
});

// 3. Replace the Cards with Boxes and the padding
code = code.replace(/<Box padding="400">\s*\{settingsTab === 0 && \(\s*<BlockStack gap="400">/g, '<Box>\n                  {settingsTab === 0 && (\n                    <BlockStack gap="0">');

code = code.replace(/<Card>\s*<Text variant="headingMd" as="h3">Widget Settings<\/Text>/g, '<Box padding="400" borderBlockEndWidth="025" borderColor="border">\n                        <Text variant="headingMd" as="h3">Widget Settings</Text>');
code = code.replace(/<\/BlockStack>\s*<\/Card>\s*<Card>\s*<Text variant="headingMd" as="h3">Collection page<\/Text>/g, '</BlockStack>\n                      </Box>\n                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">\n                        <Text variant="headingMd" as="h3">Collection page</Text>');
code = code.replace(/<\/BlockStack>\s*<\/Card>\s*<Card>\s*<Text variant="headingMd" as="h3">Product page<\/Text>/g, '</BlockStack>\n                      </Box>\n                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">\n                        <Text variant="headingMd" as="h3">Product page</Text>');
code = code.replace(/<\/BlockStack>\s*<\/Card>\s*<Card>\s*<Text variant="headingMd" as="h3">Cart page<\/Text>/g, '</BlockStack>\n                      </Box>\n                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">\n                        <Text variant="headingMd" as="h3">Cart page</Text>');
code = code.replace(/<\/BlockStack>\s*<\/Card>\s*<Card>\s*<Text variant="headingMd" as="h3">Other pages<\/Text>/g, '</BlockStack>\n                      </Box>\n                      <Box padding="400" borderBlockEndWidth="025" borderColor="border">\n                        <Text variant="headingMd" as="h3">Other pages</Text>');
code = code.replace(/<\/BlockStack>\s*<\/Card>\s*<Card>\s*<Text variant="headingMd" as="h3">Custom fonts<\/Text>/g, '</BlockStack>\n                      </Box>\n                      <Box padding="400">\n                        <Text variant="headingMd" as="h3">Custom fonts</Text>');

// Close the last box
code = code.replace(/<\/Button>\s*<\/BlockStack>\s*<\/Card>\s*<\/BlockStack>\s*\)}/g, '</Button>\n                        </BlockStack>\n                      </Box>\n                    </BlockStack>\n                  )}');

// 4. Update the ButtonGroup
code = code.replace(/<ButtonGroup segmented>\s*<Button pressed=\{alignment === "left"\} onClick=\{\(\) => setAlignment\("left"\)\}>Left<\/Button>\s*<Button pressed=\{alignment === "center"\} onClick=\{\(\) => setAlignment\("center"\)\}>Center<\/Button>\s*<Button pressed=\{alignment === "right"\} onClick=\{\(\) => setAlignment\("right"\)\}>Right<\/Button>\s*<Button pressed=\{alignment === "justify"\} onClick=\{\(\) => setAlignment\("justify"\)\}>Justify<\/Button>\s*<\/ButtonGroup>/g, `<ButtonGroup segmented>
                                <Button icon={TextAlignLeftIcon} pressed={alignment === "left"} onClick={() => setAlignment("left")} />
                                <Button icon={TextAlignCenterIcon} pressed={alignment === "center"} onClick={() => setAlignment("center")} />
                                <Button icon={TextAlignRightIcon} pressed={alignment === "right"} onClick={() => setAlignment("right")} />
                                <Button icon={TextDirectionLtrIcon} pressed={alignment === "justify"} onClick={() => setAlignment("justify")} />
                              </ButtonGroup>`);


fs.writeFileSync('app/routes/app.settings.jsx', code);
console.log('Update complete');
