const fs = require('fs');
let code = fs.readFileSync('app/routes/app.settings.jsx', 'utf8');

// Update CustomToggle
code = code.replace(
  /function CustomToggle\(\{\s*checked,\s*onChange\s*\}\)\s*\{/g,
  'function CustomToggle({ checked, onChange, activeColor = "#2c2e2f", inactiveColor = "#c4cdd5" }) {'
);

code = code.replace(
  /background:\s*checked\s*\?\s*"#2c2e2f"\s*:\s*"#c4cdd5",/g,
  'background: checked ? activeColor : inactiveColor,'
);

// Update Preview Panel styles and HTML
code = code.replace(
  /<style>\{`[\s\S]*?`\}<\/style>/g,
  `<style>{\`
    .widget-preview-container {
      --p-color-bg-surface: \${colors.appBackground};
      --p-color-text: \${colors.labelText};
      --p-color-text-subdued: \${colors.helpText};
      --p-color-text-critical: \${colors.requiredCharacter};
      --p-color-border-strong: \${colors.inputBorder};
    }
    .widget-preview-container .Polaris-Text--root { color: \${colors.labelText} !important; }
    .widget-preview-container .Polaris-Text--toneSubdued { color: \${colors.helpText} !important; }
    .widget-preview-container .Polaris-Text--toneCritical { color: \${colors.requiredCharacter} !important; }
    
    .widget-preview-container .Polaris-TextField__Input { 
      background-color: \${colors.inputBackground} !important; 
      color: \${colors.inputText} !important; 
      border-color: \${colors.inputBorder} !important; 
    }
    .widget-preview-container .Polaris-Select__Input { 
      background-color: \${colors.dropdownBackground} !important; 
      color: \${colors.dropdownText} !important; 
      border-color: \${colors.dropdownBorder} !important; 
    }
    
    .widget-preview-container .Polaris-ChoiceList__Choice { 
      color: \${colors.checkboxRadioText} !important; 
    }
    
    /* Radio and Checkbox circle/box overrides */
    .widget-preview-container .Polaris-Choice__Control input[type="radio"]:checked + .Polaris-Choice__Backdrop {
      border-color: \${colors.checkboxRadioActive} !important;
      background-color: \${colors.checkboxRadioActive} !important;
    }
    .widget-preview-container .Polaris-Choice__Control input[type="checkbox"]:checked + .Polaris-Choice__Backdrop {
      border-color: \${colors.checkboxRadioActive} !important;
      background-color: \${colors.checkboxRadioActive} !important;
    }
    .widget-preview-container .Polaris-Choice__Control input[type="radio"] + .Polaris-Choice__Backdrop,
    .widget-preview-container .Polaris-Choice__Control input[type="checkbox"] + .Polaris-Choice__Backdrop {
      border-color: \${colors.inputBorder} !important;
    }

    .widget-preview-container .Polaris-Button { 
      background: \${colors.buttonBackground} !important; 
      color: \${colors.buttonText} !important; 
      border-color: \${colors.inputBorder} !important; 
    }
    .widget-preview-container .Polaris-Button:hover { 
      background: \${colors.buttonBackgroundHover} !important; 
      color: \${colors.buttonTextHover} !important; 
    }
    .widget-preview-container .Polaris-Button:active { 
      background: \${colors.buttonBackgroundActive} !important; 
      color: \${colors.buttonTextActive} !important; 
    }
  \`}</style>`
);

// Replace tooltip
code = code.replace(
  /<div style=\{\{\s*display:\s*"inline-block",\s*background:\s*"var\(--p-color-bg-surface-secondary\)",\s*padding:\s*"4px 8px",\s*borderRadius:\s*"4px",\s*fontSize:\s*"12px",\s*marginBottom:\s*"-8px",\s*zIndex:\s*1,\s*border:\s*"1px solid var\(--p-color-border-strong\)"\s*\}\}>/g,
  '<div style={{ display: "inline-block", background: colors.inputBackground, color: colors.helpText, padding: "4px 8px", borderRadius: "4px", fontSize: "12px", marginBottom: "-8px", zIndex: 1, border: `1px solid ${colors.inputBorder}` }}>'
);

// Replace file upload Box
code = code.replace(
  /<Box padding="300" borderStyle="dashed" borderWidth="025" borderColor="border-strong" borderRadius="100">/g,
  '<div style={{ padding: "12px", border: `1px dashed ${colors.inputBorder}`, borderRadius: "4px", background: colors.inputBackground }}>'
);

code = code.replace(
  /<\/Text>\s*<\/BlockStack>\s*<\/Box>\s*\{filePreview\.includes\("image"\)/g,
  '</Text>\n                          </BlockStack>\n                        </div>\n                        {filePreview.includes("image")'
);

// Replace SettingToggle with CustomToggle inside Preview
code = code.replace(
  /<SettingToggle\s*enabled=\{false\}\s*onToggle=\{\(\) => \{\}\}\s*\/>/g,
  '<CustomToggle checked={false} onChange={() => {}} activeColor={colors.switchActiveBackground} inactiveColor={colors.switchBackground} />'
);

// Replace Radio button choices colors
code = code.replace(
  /choices=\{\[\s*\{\s*label:\s*"Radio 1",\s*value:\s*"radio1"\s*\},\s*\{\s*label:\s*"Radio 2",\s*value:\s*"radio2"\s*\}\s*\]\}/g,
  'choices={[{ label: "Radio 1", value: "radio1" }, { label: "Radio 2", value: "radio2" }]} selected={["radio1"]}'
);

fs.writeFileSync('app/routes/app.settings.jsx', code);
console.log('Update complete');
