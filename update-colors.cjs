const fs = require('fs');
let code = fs.readFileSync('app/routes/app.settings.jsx', 'utf8');

// 1. Update ColorSwatchItem definition
code = code.replace(
  /function ColorSwatchItem\(\{\s*label,\s*color,\s*code\s*\}\)\s*\{\s*return\s*\(\s*<Box>[\s\S]*?<\/Box>\s*\);\s*\}/m,
  "function ColorSwatchItem({ label, value, onChange }) {\n" +
  "  return (\n" +
  "    <Box>\n" +
  "      <InlineStack align=\"start\" blockAlign=\"center\" gap=\"300\">\n" +
  "        <div style={{ position: 'relative' }}>\n" +
  "          <div style={{\n" +
  "            width: '40px',\n" +
  "            height: '40px',\n" +
  "            borderRadius: '50%',\n" +
  "            backgroundColor: value,\n" +
  "            border: '1px solid var(--p-color-border-strong)',\n" +
  "            cursor: 'pointer'\n" +
  "          }} />\n" +
  "          <input \n" +
  "            type=\"color\" \n" +
  "            value={value} \n" +
  "            onChange={(e) => onChange(e.target.value)}\n" +
  "            style={{\n" +
  "              opacity: 0,\n" +
  "              position: 'absolute',\n" +
  "              top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer',\n" +
  "              padding: 0, margin: 0, border: 'none'\n" +
  "            }}\n" +
  "          />\n" +
  "        </div>\n" +
  "        <BlockStack gap=\"0\">\n" +
  "          <Text as=\"span\">{label}</Text>\n" +
  "          <Text as=\"p\" tone=\"subdued\">{value}</Text>\n" +
  "        </BlockStack>\n" +
  "      </InlineStack>\n" +
  "    </Box>\n" +
  "  );\n" +
  "}"
);

// 2. Insert colors state inside Settings component
const stateInsertionPoint = '  const [filePreview, setFilePreview] = useState("Show image if the uploaded file is a photo, otherwise show link");';
const colorsState = "\n" +
  "  const [colors, setColors] = useState({\n" +
  "    appBackground: '#ffffff',\n" +
  "    labelText: '#000000',\n" +
  "    requiredCharacter: '#ff0000',\n" +
  "    helpText: '#737373',\n" +
  "    totalText: '#202223',\n" +
  "    totalTextMoney: '#008000',\n" +
  "    inputText: '#000000',\n" +
  "    inputBorder: '#9a9a9a',\n" +
  "    inputBackground: '#ffffff',\n" +
  "    switchBackground: '#dddddd',\n" +
  "    switchActiveBackground: '#ea1255',\n" +
  "    rangeSliderThumb: '#121212',\n" +
  "    rangeSliderBackground: '#dddddd',\n" +
  "    rangeSliderActiveBackground: '#121212',\n" +
  "    dropdownText: '#000000',\n" +
  "    dropdownBorder: '#9a9a9a',\n" +
  "    dropdownBackground: '#ffffff',\n" +
  "    dropdownSelected: '#f8e0e6',\n" +
  "    checkboxRadioText: '#000000',\n" +
  "    checkboxRadioTextHover: '#000000',\n" +
  "    checkboxRadioTextActive: '#000000',\n" +
  "    checkboxRadioHover: '#eb1256',\n" +
  "    checkboxRadioActive: '#eb1256',\n" +
  "    buttonText: '#000000',\n" +
  "    buttonTextHover: '#eb1256',\n" +
  "    buttonTextActive: '#ffffff',\n" +
  "    buttonBackground: '#ffffff',\n" +
  "    buttonBackgroundHover: '#ffffff',\n" +
  "    buttonBackgroundActive: '#eb1256'\n" +
  "  });\n" +
  "\n" +
  "  const handleColorChange = (key, val) => {\n" +
  "    setColors(prev => ({ ...prev, [key]: val }));\n" +
  "  };\n";

code = code.replace(stateInsertionPoint, stateInsertionPoint + colorsState);

// 3. Replace all ColorSwatchItem usages with dynamic ones
const colorKeys = {
  "App background": "appBackground",
  "Label text": "labelText",
  "Required character": "requiredCharacter",
  "Help text": "helpText",
  "Total text": "totalText",
  "Total text money": "totalTextMoney",
  "Input text": "inputText",
  "Input border": "inputBorder",
  "Input background": "inputBackground",
  "Switch background": "switchBackground",
  "Switch active background": "switchActiveBackground",
  "Range slider thumb": "rangeSliderThumb",
  "Range slider background": "rangeSliderBackground",
  "Range slider active background": "rangeSliderActiveBackground",
  "Dropdown text": "dropdownText",
  "Dropdown border": "dropdownBorder",
  "Dropdown background": "dropdownBackground",
  "Dropdown selected": "dropdownSelected",
  "Checkbox & Radio text": "checkboxRadioText",
  "Checkbox & Radio text hover": "checkboxRadioTextHover",
  "Checkbox & Radio text active": "checkboxRadioTextActive",
  "Checkbox & Radio hover": "checkboxRadioHover",
  "Checkbox & Radio active": "checkboxRadioActive",
  "Button text": "buttonText",
  "Button text hover": "buttonTextHover",
  "Button text active": "buttonTextActive",
  "Button background": "buttonBackground",
  "Button background hover": "buttonBackgroundHover",
  "Button background active": "buttonBackgroundActive"
};

code = code.replace(/<ColorSwatchItem\s+label="([^"]+)"\s+color="[^"]+"\s+code="[^"]+"\s*\/>/g, (match, label) => {
  const key = colorKeys[label];
  if (key) {
    return "<ColorSwatchItem label=\"" + label + "\" value={colors." + key + "} onChange={(val) => handleColorChange(\"" + key + "\", val)} />";
  }
  return match;
});

// 4. Update the preview container to inject CSS and use colors
code = code.replace(
  '<div style={{ textAlign: alignment }}>',
  "<div className=\"widget-preview-container\" style={{ textAlign: alignment, background: colors.appBackground, color: colors.labelText, padding: '16px', borderRadius: '8px' }}>\n" +
  "                      <style>{`\n" +
  "                        .widget-preview-container .Polaris-Text--root { color: ${colors.labelText}; }\n" +
  "                        .widget-preview-container .Polaris-Text--toneSubdued { color: ${colors.helpText}; }\n" +
  "                        .widget-preview-container .Polaris-Text--toneCritical { color: ${colors.requiredCharacter}; }\n" +
  "                        .widget-preview-container .Polaris-TextField__Input { background-color: ${colors.inputBackground}; color: ${colors.inputText}; border-color: ${colors.inputBorder}; }\n" +
  "                        .widget-preview-container .Polaris-Select__Input { background-color: ${colors.dropdownBackground}; color: ${colors.dropdownText}; border-color: ${colors.dropdownBorder}; }\n" +
  "                        .widget-preview-container .Polaris-ChoiceList__Choice { color: ${colors.checkboxRadioText}; }\n" +
  "                        .widget-preview-container .Polaris-Button { background: ${colors.buttonBackground}; color: ${colors.buttonText}; border-color: ${colors.buttonBackgroundActive} }\n" +
  "                      `}</style>"
);

// 5. Update the layout of "General" and "Single input" boxes in settingsTab === 1 to match the screenshot better
code = code.replace(/<InlineGrid columns=\{\{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 \}\} gap="300">/g, '<InlineGrid columns={{ xs: 1, md: 2 }} gap="300">');

fs.writeFileSync('app/routes/app.settings.jsx', code);
console.log('Colors setup applied successfully');
