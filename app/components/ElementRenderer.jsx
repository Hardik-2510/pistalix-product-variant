/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import {
  TextField, Select, Text, Box, InlineStack, BlockStack, RadioButton,
  Checkbox as PolarisCheckbox, Button, Popover, ActionList, Tooltip
} from "@shopify/polaris";
import { useState } from "react";
import ColorPickerInput from "./ColorPickerInput";

/**
 * ElementRenderer — Renders a single element type as a live Polaris form field.
 * Used in StorefrontPreview to show how each element will appear to customers.
 */
export default function ElementRenderer({ element, value, onChange }) {
  const { type, label, config = {} } = element;
  const typeStr = (type || "").toLowerCase();
  const [activeTab, setActiveTab] = useState(0);
  const [popoverActive, setPopoverActive] = useState(false);
  const [modalActive, setModalActive] = useState(false);
  const togglePopoverActive = () => setPopoverActive((v) => !v);

  // Normalizing options to support both ElementEditor (choices) and legacy formats (options/swatches)
  const rawOptionsList = config.choices || config.options || config.swatches || [];
  const optionsList = rawOptionsList.map((opt) => {
    let newOpt = { ...opt };
    if (config.textTransform && config.textTransform !== "Default") {
      const transformText = (text) => {
        if (!text) return text;
        if (config.textTransform === "Uppercase") return text.toUpperCase();
        if (config.textTransform === "Lowercase") return text.toLowerCase();
        if (config.textTransform === "Capitalize") return text.replace(/\b\w/g, (c) => c.toUpperCase());
        return text;
      };
      if (newOpt.label) newOpt.label = transformText(newOpt.label);
      if (newOpt.value) newOpt.value = transformText(newOpt.value);
    }
    return newOpt;
  });

  const getDefaultValue = () => {
    if (value !== undefined && value !== null) return value;
    if (typeStr === "checkbox" || typeStr === "select" || config.allowMultiple) {
      return optionsList.filter((o) => o.default).map((o, i) => o.id || o.value || o.label || String(i));
    }
    const defIndex = optionsList.findIndex((o) => o.default);
    if (defIndex !== -1) {
       const defOpt = optionsList[defIndex];
       return defOpt.id || defOpt.value || defOpt.label || String(defIndex);
    }
    if (["text", "textarea", "number", "email", "phone"].includes(typeStr) && config.defaultValue) {
      return config.defaultValue;
    }
    return "";
  };

  const activeValue = getDefaultValue();

  const handleTextChange = (v) => {
    let newVal = v;
    
    // Apply allowedValue filter
    if (config.allowedValue === "Letters") {
      newVal = newVal.replace(/[^a-zA-Z\s]/g, "");
    } else if (config.allowedValue === "Letters & numbers") {
      newVal = newVal.replace(/[^a-zA-Z0-9\s]/g, "");
    }

    // Apply textTransform
    if (config.textTransform === "Uppercase") {
      newVal = newVal.toUpperCase();
    } else if (config.textTransform === "Lowercase") {
      newVal = newVal.toLowerCase();
    } else if (config.textTransform === "Capitalize") {
      // Basic capitalization: first letter of each word
      newVal = newVal.replace(/\b\w/g, (c) => c.toUpperCase());
    }

    onChange && onChange(newVal);
  };

  const handleSelectChange = (v) => onChange && onChange(v);
  const handleChoiceChange = (v) => onChange && onChange(v);

  // show Add-on label next to option if available
  const getAddOnText = (o) => {
    let p = o.price || o.addOnValue;
    if (!p) return "";
    
    // Clean up any existing + or $ that the user might have typed
    p = String(p).replace(/[+$]/g, "").trim();
    if (!p) return "";
    
    return ` (+${p}$)`;
  };

  const getScrollStyle = () => {
    if (!["radio button", "checkbox", "button", "color swatch", "image swatch"].includes(typeStr)) return {};
    
    const isHorizontal = config.directionStyle === "horizontal";
    
    if (config.scrollType === "By fixed height" && config.scrollHeight) {
      if (isHorizontal) {
        return { maxWidth: `${config.scrollHeight}px`, overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px' };
      } else {
        return { maxHeight: `${config.scrollHeight}px`, overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' };
      }
    }
    
    if (config.scrollType === "By number of option values" && config.scrollVisibleItems) {
      const n = parseInt(config.scrollVisibleItems) || 3;
      const isVertical = config.directionStyle === "vertical";
      const gap = (typeStr === "image swatch" && isVertical) ? 12 : 8;
      
      let itemSize = 20; 
      if (typeStr === "image swatch") itemSize = parseInt(isHorizontal ? (config.swatchWidth || 50) : (config.swatchHeight || 50));
      else if (typeStr === "color swatch") itemSize = parseInt(isHorizontal ? (config.swatchWidth || 36) : (config.swatchHeight || 36));
      else if (typeStr === "button") itemSize = isHorizontal ? parseInt(config.swatchWidth || 100) : parseInt(config.swatchHeight || 36);
      else itemSize = isHorizontal ? 100 : 24; // radio/checkbox approx width 100
      
      const totalSize = (itemSize * n) + (gap * (Math.max(0, n - 1)));
      if (isHorizontal) {
        return { maxWidth: `${totalSize}px`, overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px' };
      } else {
        return { maxHeight: `${totalSize}px`, overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' };
      }
    }
    return {};
  };

  const renderLabelContent = (addonOverride) => {
    const textLabel = `${label}${addonOverride !== undefined ? addonOverride : getAddOnText(config)}`;
    if (config.helpText && config.helpTextPosition === "Tooltip") {
      return (
        <InlineStack gap="100" blockAlign="center">
          <Text as="span" variant="bodySm" fontWeight="semibold">{textLabel}</Text>
          <Tooltip content={config.helpText}>
            <Text as="span" tone="subdued" cursor="help">ⓘ</Text>
          </Tooltip>
        </InlineStack>
      );
    }
    return <Text as="span" variant="bodySm" fontWeight="semibold">{textLabel}</Text>;
  };

  const renderHelpText = () => {
    if (config.helpText && config.helpTextPosition !== "Tooltip") {
      return <Box paddingBlockStart="100"><Text as="p" tone="subdued" variant="bodySm">{config.helpText}</Text></Box>;
    }
    return null;
  };

  switch (typeStr) {
    case "text":
    case "number":
    case "phone":
    case "email":
    case "datetime": {
      const today = new Date();
      
      const getLocalDatetime = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      let minDate = undefined;
      let maxDate = undefined;
      
      if (typeStr === "datetime") {
        if (config.disablePast) {
          minDate = getLocalDatetime(today);
          if (config.disableToday) {
             const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
             tmr.setHours(0, 0, 0, 0);
             minDate = getLocalDatetime(tmr);
          }
        }
        if (config.maxFutureDays) {
           const future = new Date(today);
           future.setDate(future.getDate() + parseInt(config.maxFutureDays, 10));
           future.setHours(23, 59, 59, 999);
           maxDate = getLocalDatetime(future);
        } else if (config.disableFuture) {
           maxDate = getLocalDatetime(today);
           if (config.disableToday) {
             const yest = new Date(today); yest.setDate(yest.getDate() - 1);
             yest.setHours(23, 59, 59, 999);
             maxDate = getLocalDatetime(yest);
           }
        }
        
        const isTimeEnabled = config.enableTime !== false;
        
        return (
          <Box>
            <Box paddingBlockEnd="100">{renderLabelContent()}</Box>
            <input 
              type={isTimeEnabled ? "datetime-local" : "date"}
              defaultValue={value || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              min={minDate ? (isTimeEnabled ? minDate : minDate.split("T")[0]) : undefined}
              max={maxDate ? (isTimeEnabled ? maxDate : maxDate.split("T")[0]) : undefined}
              style={{
                width: "100%", padding: "8px 12px", border: "1px solid var(--p-color-border)",
                borderRadius: "4px", fontSize: "14px", fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
            {renderHelpText()}
          </Box>
        );
      }

      const isTextLike = ["text", "email", "phone"].includes(typeStr);
      const currentLength = (value || "").length;
      const maxL = config.maxCharacter;
      const showCount = isTextLike && (config.characterCounter || maxL);
      const charCountText = maxL ? `${currentLength}/${maxL} characters` : `${currentLength} characters`;


      return (
        <Box>
          <TextField
            label={renderLabelContent()}
            type={typeStr === "number" ? "number" : typeStr === "email" ? "email" : typeStr === "phone" ? "tel" : "text"}
            placeholder={config.placeholder || ""}
            value={value || ""}
            onChange={handleTextChange}
            autoComplete="off"
            maxLength={isTextLike && maxL ? maxL : undefined}
            minLength={isTextLike && config.minCharacter ? config.minCharacter : undefined}
            min={typeStr === "number" && config.minValue !== undefined && config.minValue !== "" ? config.minValue : undefined}
            max={typeStr === "number" && config.maxValue !== undefined && config.maxValue !== "" ? config.maxValue : undefined}
            prefix={config.prefixType === "Text" && config.prefixText ? config.prefixText : undefined}
            suffix={config.suffix ? config.suffix : undefined}
            helpText={config.helpText && config.helpTextPosition !== "Tooltip" ? config.helpText : undefined}
          />
          {showCount && (
            <div style={{ textAlign: "right", color: "var(--p-color-text-subdued)", fontSize: "13px", marginTop: "4px" }}>
              {charCountText}
            </div>
          )}
        </Box>
      );
    }



    case "textarea": {
      const currentLength = (value || "").length;
      const maxL = config.maxCharacter;
      const showCount = config.characterCounter || maxL;
      const charCountText = maxL ? `${currentLength}/${maxL} characters` : `${currentLength} characters`;

      return (
        <Box>
          <TextField
            label={renderLabelContent()}
            placeholder={config.placeholder || ""}
            value={value || ""}
            onChange={handleTextChange}
            autoComplete="off"
            multiline={3}
            maxLength={maxL ? maxL : undefined}
            helpText={config.helpText && config.helpTextPosition !== "Tooltip" ? config.helpText : undefined}
          />
          {showCount && (
            <div style={{ textAlign: "right", color: "var(--p-color-text-subdued)", fontSize: "13px", marginTop: "4px" }}>
              {charCountText}
            </div>
          )}
        </Box>
      );
    }

    case "dropdown": {
      const currentValues = Array.isArray(activeValue) ? activeValue : (activeValue ? [activeValue] : []);
      const selectedOption = !config.allowMultiple ? (optionsList.find((o, i) => (o.id || o.value || o.label || String(i)) === activeValue) || (activeValue === "" ? null : optionsList[0])) : null;
      const addonText = selectedOption ? getAddOnText(selectedOption) : "";

      const buttonLabel = config.allowMultiple 
        ? (currentValues.length ? `${currentValues.length} selected` : `Select ${label}...`)
        : (selectedOption ? `${selectedOption.label || selectedOption.value}` : `Select ${label}...`);

      const activator = (
        <Button onClick={togglePopoverActive} disclosure fullWidth textAlign="left">
          <span>{buttonLabel}</span>
        </Button>
      );

      return (
        <Box>
          <Box paddingBlockEnd="100">{renderLabelContent(config.allowMultiple ? "" : ` ${addonText}`)}</Box>
          {selectedOption && !config.allowMultiple && (
             <Text as="p" variant="bodySm" tone="subdued" paddingBlockEnd="100">
                {selectedOption.label || selectedOption.value || ""}
             </Text>
          )}
          {!selectedOption && !config.allowMultiple && <Box paddingBlockEnd="100" />}
          
          {config.allowMultiple ? (
            <Popover
              active={popoverActive}
              activator={activator}
              onClose={() => setPopoverActive(false)}
              fullWidth
            >
              <ActionList
                actionRole="menuitem"
                items={optionsList.map((o, i) => {
                  const val = o.id || o.value || o.label || String(i);
                  return {
                    content: `${o.label || o.value}${getAddOnText(o)}`,
                    active: currentValues.includes(val),
                    onAction: () => { 
                      if (currentValues.includes(val)) handleSelectChange(currentValues.filter(v => v !== val));
                      else handleSelectChange([...currentValues, val]);
                    }
                  };
                })}
              />
            </Popover>
          ) : (
            <Select
              label=""
              labelHidden
              options={[
                { label: `Select ${label}...`, value: "" },
                ...optionsList.map((o, i) => ({ label: `${o.label}${getAddOnText(o)}`, value: o.id || o.value || o.label || String(i) })),
              ]}
              value={activeValue || ""}
              onChange={handleSelectChange}
            />
          )}
          {renderHelpText()}
        </Box>
      );
    }

    case "image dropdown": {
      const currentValues = Array.isArray(activeValue) ? activeValue : (activeValue ? [activeValue] : []);
      const selectedOption = !config.allowMultiple ? (optionsList.find((o, i) => (o.id || o.value || o.label || String(i)) === activeValue) || optionsList[0]) : null;
      const addonText = selectedOption ? getAddOnText(selectedOption) : "";
      
      const buttonLabel = config.allowMultiple 
        ? (currentValues.length ? `${currentValues.length} selected` : `Select ${label}...`)
        : (selectedOption ? `${selectedOption.label || selectedOption.value}` : `Select ${label}...`);
        
      const activator = (
        <Button onClick={togglePopoverActive} disclosure fullWidth textAlign="left">
          <span>{buttonLabel}</span>
        </Button>
      );
      
      const previewW = parseInt(config.swatchWidth || 50);
      const previewH = parseInt(config.swatchHeight || 50);
      const previewRadius = config.swatchShape === "Square" ? "4px" : "50%";
      
      return (
        <Box>
           <Box paddingBlockEnd="100">{renderLabelContent(` ${addonText}`)}</Box>
           {selectedOption && (
              <Text as="p" variant="bodySm" tone="subdued" paddingBlockEnd="100">
                 {selectedOption.label || selectedOption.value || ""}
              </Text>
           )}
           {!selectedOption && <Box paddingBlockEnd="100" />}
           
           <InlineStack gap="300" blockAlign="center" wrap={false}>
             {selectedOption?.image && (
               <Box minWidth={`${previewW}px`}>
                 <img src={selectedOption.image} alt="" style={{width: previewW, height: previewH, objectFit: "cover", borderRadius: previewRadius, border: "1px solid var(--p-color-border-disabled)"}} />
               </Box>
             )}
             <Box width="100%">
               <Popover
                 active={popoverActive}
                 activator={activator}
                 onClose={() => setPopoverActive(false)}
                 fullWidth
               >
                 <ActionList
                   actionRole="menuitem"
                   items={optionsList.map((o, i) => {
                     const val = o.id || o.value || o.label || String(i);
                     return {
                       content: `${o.label || o.value}${getAddOnText(o)}`,
                       active: config.allowMultiple ? currentValues.includes(val) : undefined,
                       onAction: () => { 
                         if (config.allowMultiple) {
                           if (currentValues.includes(val)) handleSelectChange(currentValues.filter(v => v !== val));
                           else handleSelectChange([...currentValues, val]);
                         } else {
                           handleSelectChange(val); 
                           setPopoverActive(false); 
                         }
                       },
                       prefix: o.image ? <img src={o.image} alt="" style={{width: 24, height: 24, objectFit: "cover", borderRadius: 4, border: "1px solid var(--p-color-border-disabled)"}} /> : null
                     };
                   })}
                 />
               </Popover>
             </Box>
           </InlineStack>
           
           {renderHelpText()}
        </Box>
      );
    }

    case "color dropdown": {
      const currentValues = Array.isArray(activeValue) ? activeValue : (activeValue ? [activeValue] : []);
      const selectedOption = !config.allowMultiple ? (optionsList.find((o, i) => (o.id || o.value || o.label || String(i)) === activeValue) || optionsList[0]) : null;
      const addonText = selectedOption ? getAddOnText(selectedOption) : "";
      
      const buttonLabel = config.allowMultiple 
        ? (currentValues.length ? `${currentValues.length} selected` : `Select ${label}...`)
        : (selectedOption ? `${selectedOption.label || selectedOption.color || selectedOption.value}` : `Select ${label}...`);
        
      const previewW = parseInt(config.swatchWidth || 50);
      const previewH = parseInt(config.swatchHeight || 50);
      const previewRadius = config.swatchShape === "Square" ? "4px" : "50%";

      const activator = (
        <Button onClick={togglePopoverActive} disclosure fullWidth textAlign="left">
          <span>{buttonLabel}</span>
        </Button>
      );
      
      return (
        <Box>
           <Box paddingBlockEnd="100">{renderLabelContent(` ${addonText}`)}</Box>
           {selectedOption && (
              <Text as="p" variant="bodySm" tone="subdued" paddingBlockEnd="100">
                 {selectedOption.label || selectedOption.value || ""}
              </Text>
           )}
           {!selectedOption && <Box paddingBlockEnd="100" />}
           
           <InlineStack gap="300" blockAlign="center" wrap={false}>
             {selectedOption && (
               <Box minWidth={`${previewW}px`}>
                 <div style={{width: previewW, height: previewH, backgroundColor: selectedOption.color || "#000", borderRadius: previewRadius, border: "1px solid var(--p-color-border)"}} />
               </Box>
             )}
             <Box width="100%">
               <Popover
                 active={popoverActive}
                 activator={activator}
                 onClose={() => setPopoverActive(false)}
                 fullWidth
               >
             <ActionList
               actionRole="menuitem"
               items={optionsList.map((o, i) => {
                 const val = o.id || o.value || o.label || String(i);
                 return {
                   content: `${o.label || o.color || o.value}${getAddOnText(o)}`,
                   active: config.allowMultiple ? currentValues.includes(val) : undefined,
                   onAction: () => { 
                     if (config.allowMultiple) {
                       if (currentValues.includes(val)) handleSelectChange(currentValues.filter(v => v !== val));
                       else handleSelectChange([...currentValues, val]);
                     } else {
                       handleSelectChange(val); 
                       setPopoverActive(false); 
                     }
                   },
                   prefix: <div style={{width: previewW, height: previewH, backgroundColor: o.color || "#000", borderRadius: previewRadius, border: "1px solid var(--p-color-border)"}} />
                 };
               })}
             />
           </Popover>
           </Box>
           </InlineStack>
           {renderHelpText()}
        </Box>
      );
    }

    case "radio button": {
      return (
        <Box>
          <Box paddingBlockEnd="100">{renderLabelContent()}</Box>
          <Box>
            <div style={getScrollStyle()}>
              <BlockStack gap="100">
                {optionsList.map((o, i) => {
                  const optValue = o.id || o.value || o.label || String(i);
                  return (
                    <RadioButton 
                      key={i} 
                      label={`${o.label}${getAddOnText(o)}`} 
                      checked={activeValue === optValue} 
                      onChange={() => handleChoiceChange(optValue)} 
                    />
                  );
                })}
              </BlockStack>
            </div>
          </Box>
          {renderHelpText()}
        </Box>
      );
    }

    case "select":
    case "checkbox": {
      const currentValues = Array.isArray(activeValue) ? activeValue : (activeValue ? [activeValue] : []);
      return (
        <Box>
          <Box paddingBlockEnd="100">{renderLabelContent()}</Box>
          <Box>
            {typeStr === "select" ? (
              <BlockStack gap="100">
                {optionsList.map((o, i) => {
                  const optValue = o.id || o.value || o.label || String(i);
                  return (
                    <PolarisCheckbox 
                      key={i} 
                      label={`${o.label}${getAddOnText(o)}`} 
                      checked={currentValues.includes(optValue)} 
                      onChange={(checked) => {
                        if (checked) handleChoiceChange([...currentValues, optValue]);
                        else handleChoiceChange(currentValues.filter(v => v !== optValue));
                      }} 
                    />
                  );
                })}
              </BlockStack>
            ) : (
              <div style={getScrollStyle()}>
                <BlockStack gap="100">
                  {optionsList.map((o, i) => {
                    const optValue = o.id || o.value || o.label || String(i);
                    return (
                      <PolarisCheckbox 
                        key={i} 
                        label={`${o.label}${getAddOnText(o)}`} 
                        checked={currentValues.includes(optValue)} 
                        onChange={(checked) => {
                          if (checked) handleChoiceChange([...currentValues, optValue]);
                          else handleChoiceChange(currentValues.filter(v => v !== optValue));
                        }} 
                      />
                    );
                  })}
                </BlockStack>
              </div>
            )}
          </Box>
          {renderHelpText()}
        </Box>
      );
    }

    case "button":
    case "color swatch":
    case "image swatch": {
      const isMulti = config.allowMultiple;
      const currentValues = isMulti 
        ? (Array.isArray(activeValue) ? activeValue : (activeValue ? [activeValue] : []))
        : (Array.isArray(activeValue) ? [activeValue[0]] : [activeValue]);

      const selectedSwatches = optionsList.filter((s, i) => currentValues.includes(s.id || s.value || s.label || String(i)));
      const swatchBorderRadius = config.swatchShape === "Square" ? "4px" : "50%";
      
      return (
        <Box>
          <Box paddingBlockEnd="100">
            {renderLabelContent()}
            {selectedSwatches.length > 0 && (
              <span style={{ fontWeight: "normal", color: "var(--p-color-text-subdued)", marginLeft: "8px" }}>
                {selectedSwatches.map(s => `${s.label} ${getAddOnText(s)}`).join(", ")}
              </span>
            )}
          </Box>
          <Box>
            <div style={{ ...getScrollStyle(), display: 'flex', flexDirection: config.directionStyle === "vertical" ? 'column' : 'row', gap: config.directionStyle === "vertical" ? '12px' : '8px', flexWrap: (config.directionStyle === "horizontal" && config.scrollType && config.scrollType !== "Default") ? 'nowrap' : (config.directionStyle === "vertical" ? 'nowrap' : 'wrap') }}>
              {optionsList.map((s, i) => {
                const optValue = s.id || s.value || s.label || String(i);
                const isSelected = currentValues.includes(optValue);
                
                if (typeStr === "color swatch") {
                  const isVertical = config.directionStyle === "vertical";
                  const swatchDiv = (
                      <div
                        onClick={() => {
                          if (isMulti) {
                            if (isSelected) handleChoiceChange(currentValues.filter(v => v !== optValue));
                            else handleChoiceChange([...currentValues, optValue]);
                          } else {
                            handleChoiceChange(optValue);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isMulti) {
                              if (isSelected) handleChoiceChange(currentValues.filter(v => v !== optValue));
                              else handleChoiceChange([...currentValues, optValue]);
                            } else {
                              handleChoiceChange(optValue);
                            }
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          width: config.swatchWidth ? `${config.swatchWidth}px` : "36px", 
                          height: config.swatchHeight ? `${config.swatchHeight}px` : "36px", 
                          borderRadius: swatchBorderRadius,
                          backgroundColor: s.color || "#ffffff",
                          border: isSelected ? "3px solid var(--p-color-border-brand)" : "2px solid var(--p-color-border)",
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden"
                        }}
                      >
                        {!s.color && (
                          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "10px", color: "#ccc" }}>
                             none
                          </div>
                        )}
                      </div>
                  );
                  return (
                    <div key={i} style={{ display: isVertical ? 'flex' : 'block', width: isVertical ? '100%' : 'auto', alignItems: 'center', gap: '12px' }}>
                      <Tooltip content={`${s.label}${getAddOnText(s)}`} preferredPosition="above">
                        {swatchDiv}
                      </Tooltip>
                      {isVertical && (
                        <Text as="span" variant="bodyMd">{s.label}{getAddOnText(s)}</Text>
                      )}
                    </div>
                  );
                }

                if (typeStr === "image swatch") {
                  const isVertical = config.directionStyle === "vertical";
                  const swatchDiv = (
                      <div
                        onClick={() => {
                          if (isMulti) {
                            if (isSelected) handleChoiceChange(currentValues.filter(v => v !== optValue));
                            else handleChoiceChange([...currentValues, optValue]);
                          } else {
                            handleChoiceChange(optValue);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isMulti) {
                              if (isSelected) handleChoiceChange(currentValues.filter(v => v !== optValue));
                              else handleChoiceChange([...currentValues, optValue]);
                            } else {
                              handleChoiceChange(optValue);
                            }
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          width: `${config.swatchWidth || 50}px`, height: `${config.swatchHeight || 50}px`,
                          borderRadius: swatchBorderRadius,
                          border: isSelected ? "2px solid var(--p-color-border-brand)" : "1px solid var(--p-color-border)",
                          cursor: "pointer",
                          padding: "2px",
                          boxSizing: "border-box",
                          backgroundColor: "#fff"
                        }}
                      >
                        {s.image ? (
                          <img 
                            src={s.image} 
                            alt={s.label} 
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "2px" }} 
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", backgroundColor: "#eee", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                             <Text tone="subdued" variant="bodyXs">No img</Text>
                          </div>
                        )}
                      </div>
                  );

                  return (
                    <div key={i} style={{ display: isVertical ? 'flex' : 'block', width: isVertical ? '100%' : 'auto', alignItems: 'center', gap: '12px' }}>
                      <Tooltip content={`${s.label}${getAddOnText(s)}`} preferredPosition="above">
                        {swatchDiv}
                      </Tooltip>
                      {isVertical && (
                        <Text as="span" variant="bodyMd">{s.label}{getAddOnText(s)}</Text>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (isMulti) {
                        if (isSelected) handleChoiceChange(currentValues.filter(v => v !== optValue));
                        else handleChoiceChange([...currentValues, optValue]);
                      } else {
                        handleChoiceChange(optValue);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isMulti) {
                          if (isSelected) handleChoiceChange(currentValues.filter(v => v !== optValue));
                          else handleChoiceChange([...currentValues, optValue]);
                        } else {
                          handleChoiceChange(optValue);
                        }
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      width: config.swatchWidth ? `${config.swatchWidth}px` : "auto",
                      height: config.swatchHeight ? `${config.swatchHeight}px` : "36px",
                      padding: config.swatchWidth ? "0" : "0 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: config.swatchShape === "Round" ? "50px" : "4px",
                      border: isSelected ? "2px solid var(--p-color-border-brand)" : "1px solid var(--p-color-border)",
                      backgroundColor: isSelected ? "var(--p-color-bg-surface-brand)" : "#ffffff",
                      color: isSelected ? "var(--p-color-text-brand-on-bg-fill)" : "var(--p-color-text)",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      fontWeight: "500",
                      fontSize: "14px",
                      textAlign: "center"
                    }}
                  >
                    {s.label}{getAddOnText(s)}
                  </div>
                );
              })}
            </div>
          </Box>
          {renderHelpText()}
        </Box>
      );
    }

    // static text types
    case "heading":
      return <Text variant="headingMd" as="h3" fontWeight={config.fontWeight || "bold"}>{config.content || label}</Text>;
    case "divider":
      return (
        <hr 
          style={{ 
            border: 'none', 
            borderTop: `${config.thickness || 1}px ${config.style || 'solid'} ${config.color || '#bbbbbb'}`, 
            margin: '10px 0' 
          }} 
        />
      );
    case "spacing":
      return <Box minHeight={`${config.height || 20}px`} />;
    case "paragraph":
      return <div style={{ textAlign: config.align || "left", color: "var(--p-color-text-subdued)" }} dangerouslySetInnerHTML={{ __html: config.content || label }} />;
    case "html":
      return <div dangerouslySetInnerHTML={{ __html: config.content || "<div></div>" }} />;
    case "popup_modal":
    case "pop-up modal":
    case "size_chart":
      return (
        <>
          <Button variant="plain" onClick={() => setModalActive(true)}>
             {label} ↗
          </Button>
          {modalActive && (
            <div 
              style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.55)', zIndex: 999999, display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
              onClick={() => setModalActive(false)}
            >
              <div 
                style={{
                  background: 'white', borderRadius: '8px', padding: '24px',
                  maxWidth: !config.modalWidth ? '90vw' : (String(config.modalWidth).includes('px') || String(config.modalWidth).includes('%') || String(config.modalWidth) === 'auto' ? config.modalWidth : `${config.modalWidth}px`), 
                  width: !config.modalWidth ? 'fit-content' : '90%',
                  height: !config.modalHeight ? 'auto' : (String(config.modalHeight).includes('px') || String(config.modalHeight).includes('%') || String(config.modalHeight) === 'auto' ? config.modalHeight : `${config.modalHeight}px`),
                  maxHeight: '80vh', overflowY: 'auto', position: 'relative',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)', color: '#111827'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{label || "Details"}</h2>
                  <button onClick={() => setModalActive(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                </div>
                <div dangerouslySetInnerHTML={{ __html: config.content || "<p>No content provided.</p>" }} />
              </div>
            </div>
          )}
        </>
      );

    case "switch":
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="100">{label}{getAddOnText(config)}</Text>
          <InlineStack gap="200" blockAlign="center">
            <div
              onClick={() => handleChoiceChange(value === "true" ? "false" : "true")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleChoiceChange(value === "true" ? "false" : "true");
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                width: "40px", height: "22px", borderRadius: "11px",
                backgroundColor: value === "true" ? "var(--p-color-bg-surface-brand)" : "var(--p-color-bg-fill-disabled)",
                position: "relative", cursor: "pointer",
              }}
            >
              <div style={{
                  width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "white",
                  position: "absolute", top: "2px", left: value === "true" ? "20px" : "2px",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }} />
            </div>
            <Text as="p">{value === "true" ? (config.labelOn || "ON") : (config.labelOff || "OFF")}</Text>
          </InlineStack>
          {config.helpText && <Box paddingBlockStart="100"><Text as="p" tone="subdued" variant="bodySm">{config.helpText}</Text></Box>}
        </Box>
      );
      
    case "range_slider":
      return (
        <Box>
           <Text as="p" variant="bodySm" fontWeight="semibold">{label}</Text>
           <InlineStack gap="200" blockAlign="center">
              <input type="range" min={config.min || 0} max={config.max || 100} step={config.step || 1} value={value || 0} onChange={(e) => handleTextChange(e.target.value)} />
              <Text as="span">{value || 0} {config.unit || ""}</Text>
           </InlineStack>
        </Box>
      );

    case "dimension": {
      const currentDim = value || {};
      const handleDimChange = (dimKey, dimVal) => {
        handleTextChange({ ...currentDim, [dimKey]: dimVal });
      };
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold">{label}</Text>
          <Box paddingBlockStart="200">
            <InlineStack gap="200" blockAlign="center">
              <TextField
                type="number"
                label="Width"
                placeholder="0"
                value={currentDim.width || ""}
                onChange={(v) => handleDimChange("width", v)}
                suffix={config.unit || "cm"}
                autoComplete="off"
              />
              {config.enableHeight !== false && (
                <>
                  <Text as="span">x</Text>
                  <TextField
                    type="number"
                    label="Height"
                    placeholder="0"
                    value={currentDim.height || ""}
                    onChange={(v) => handleDimChange("height", v)}
                    suffix={config.unit || "cm"}
                    autoComplete="off"
                  />
                </>
              )}
            </InlineStack>
          </Box>
        </Box>
      );
    }

    case "file_upload":
    case "file upload": {
      const inputId = `file-upload-${element.id || Math.random().toString(36).substr(2, 9)}`;
      const allowedExts = config.allowedExtensions || ".jpeg, .jpg, .png, .webp, .svg";
      const isFileUploaded = value && value instanceof File;
      const fileName = isFileUploaded ? value.name : (typeof value === "string" && value ? value : "");
      
      const filePreviewUrl = isFileUploaded && value.type.startsWith("image/") ? URL.createObjectURL(value) : null;

      return (
        <Box>
          <Box paddingBlockEnd="100">{renderLabelContent()}</Box>
          
          {isFileUploaded || fileName ? (
            <div style={{
              backgroundColor: "#3371C8",
              padding: "12px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              animation: "fadeInUpload 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
               <div style={{ display: "flex", alignItems: "center", gap: "16px", overflow: "hidden" }}>
                 <div style={{ 
                    width: "48px", height: "56px", 
                    backgroundColor: "white", 
                    padding: "3px", 
                    borderRadius: "2px",
                    flexShrink: 0
                 }}>
                   {filePreviewUrl ? (
                     <img src={filePreviewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                   ) : (
                     <div style={{ width: "100%", height: "100%", backgroundColor: "#F4F6F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Text variant="bodyXs" tone="subdued">FILE</Text>
                     </div>
                   )}
                 </div>
                 <div style={{ overflow: "hidden" }}>
                   <Text as="p" variant="bodyMd" fontWeight="semibold" tone="textInverse" truncate>{fileName}</Text>
                   {isFileUploaded && <Text as="p" variant="bodyXs" tone="textInverse">{(value.size / 1024 / 1024).toFixed(2)} MB</Text>}
                 </div>
               </div>
               <button 
                 onClick={(e) => { e.preventDefault(); handleTextChange(null); }}
                 style={{
                   width: "28px", height: "28px", borderRadius: "50%", 
                   backgroundColor: "white", color: "#3371C8", 
                   border: "none", cursor: "pointer",
                   display: "flex", alignItems: "center", justifyContent: "center",
                   fontSize: "16px", fontWeight: "bold", padding: 0,
                   flexShrink: 0, marginLeft: "12px"
                 }}
               >
                 ✕
               </button>
            </div>
          ) : (
            <label style={{ display: "block", cursor: "pointer" }} htmlFor={inputId}>
              <span style={{ border: 0, clip: "rect(0 0 0 0)", height: "1px", margin: "-1px", overflow: "hidden", padding: 0, position: "absolute", width: "1px" }}>
                Upload {label}
              </span>
              <input 
                id={inputId}
                type="file" 
                accept={allowedExts} 
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleTextChange(e.target.files[0]);
                  }
                }}
              />
              <div style={{ 
                border: "1px dashed #8C9196", 
                padding: "32px 20px", 
                textAlign: "center", 
                borderRadius: "4px",
                backgroundColor: "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = "#F4F6F8"; }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = "#FFFFFF"; }}
              onDrop={(e) => { 
                e.preventDefault(); 
                e.currentTarget.style.backgroundColor = "#FFFFFF";
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                   handleTextChange(e.dataTransfer.files[0]);
                }
              }}
              >
                <BlockStack gap="200" inlineAlign="center">
                  <div style={{
                    backgroundColor: "#E8F0FA", 
                    padding: "6px 14px", 
                    borderRadius: "4px",
                    display: "inline-block",
                    color: "#1F5199",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}>
                    Choose file
                  </div>
                  <Text as="p" tone="subdued" variant="bodyMd">or drop file to upload</Text>
                </BlockStack>
              </div>
            </label>
          )}

          <Box paddingBlockStart="200">
             <Text as="p" tone="subdued" variant="bodyMd">(Allowed extension: {allowedExts})</Text>
          </Box>
          {renderHelpText()}
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeInUpload {
              0% { opacity: 0; transform: scale(0.98) translateY(5px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}} />
        </Box>
      );
    }
      
    case "color_picker":
    case "color picker":
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="100">{label}{getAddOnText(config)}</Text>
          <ColorPickerInput 
             value={value || config.defaultColor || "#000000"} 
             onChange={handleTextChange} 
          />
        </Box>
      );

    case "hidden field":
      return (
        <Box>
          <input type="hidden" name={label} value={value || config.value || ""} />
          <Box padding="200" background="bg-surface-secondary" borderWidth="025" borderColor="border" borderRadius="200">
            <Text as="p" tone="subdued" variant="bodySm">🔒 Hidden Field: {label}</Text>
          </Box>
        </Box>
      );

    case "font_picker":
    case "google font selector": {
      const fonts = config.fonts || ["Marko One", "Enriqueta", "Grand Hotel", "Itim", "Ledger", "Modern Antiqua", "Noto Serif TC", "Pirata One", "Poppins"];
      const selectedFont = fonts.find(f => f === activeValue) || activeValue || "";
      
      const fontStyles = (
        <style dangerouslySetInnerHTML={{ __html: fonts.map(f => `@import url('https://fonts.googleapis.com/css2?family=${f.replace(/ /g, '+')}&display=swap');`).join('\n') }} />
      );
      
      const activator = (
        <div 
          onClick={togglePopoverActive}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              togglePopoverActive();
            }
          }}
          role="button"
          tabIndex={0}
          style={{
            border: "1px solid var(--p-color-border)",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--p-color-bg-surface)"
          }}
        >
          <span style={{ fontFamily: selectedFont || "inherit", fontSize: "16px", fontWeight: selectedFont ? "bold" : "normal" }}>
            {selectedFont || config.placeholder || "Select a font..."}
          </span>
          <span style={{ transform: popoverActive ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <svg viewBox="0 0 20 20" style={{width: '20px', height: '20px', fill: '#5C5F62'}}><path fillRule="evenodd" d="M5.72 8.47a.75.75 0 0 1 1.06 0L10 11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 9.53a.75.75 0 0 1 0-1.06Z"/></svg>
          </span>
        </div>
      );
      
      if (config.fontDisplayStyle === "Swatch") {
        return (
          <Box>
            {fontStyles}
            <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="100">{label}</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {fonts.map((f, i) => {
                const isSelected = f === selectedFont;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleSelectChange(f); }}
                    style={{
                      fontFamily: f,
                      padding: '8px 16px',
                      border: isSelected ? '2px solid var(--p-color-border-brand)' : '1px solid var(--p-color-border)',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            {renderHelpText()}
          </Box>
        );
      }

      return (
        <Box>
           {fontStyles}
           <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="100">{label}</Text>
           <Popover
             active={popoverActive}
             activator={activator}
             onClose={() => setPopoverActive(false)}
             fullWidth
             autofocusTarget="none"
           >
             <div style={{ maxHeight: "300px", overflowY: "auto", padding: 0 }}>
               {fonts.map((f, i) => {
                 const isSelected = f === selectedFont;
                 return (
                   <div 
                     key={i}
                     onClick={() => { handleSelectChange(f); setPopoverActive(false); }}
                     onKeyDown={(e) => {
                       if (e.key === "Enter" || e.key === " ") {
                         e.preventDefault();
                         handleSelectChange(f);
                         setPopoverActive(false);
                       }
                     }}
                     role="button"
                     tabIndex={0}
                     style={{
                       padding: "12px 16px",
                       cursor: "pointer",
                       backgroundColor: isSelected ? "#F4E4E8" : "transparent",
                       display: "flex",
                       justifyContent: "space-between",
                       alignItems: "center",
                       transition: "background-color 0.1s"
                     }}
                     onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = "var(--p-color-bg-surface-hover)")}
                     onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = "transparent")}
                   >
                     <span style={{ fontFamily: f, fontSize: "16px", color: "#202223", fontWeight: isSelected ? "bold" : "normal" }}>
                       {f}
                     </span>
                     {isSelected && (
                       <span style={{ color: "#202223", fontWeight: "bold" }}>✓</span>
                     )}
                   </div>
                 );
               })}
             </div>
           </Popover>
           {config.helpText && <Box paddingBlockStart="100"><Text as="p" tone="subdued" variant="bodySm">{config.helpText}</Text></Box>}
        </Box>
      );
    }

    case "product_links": {
      const products = config.products || [];
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold">{label}</Text>
          <Box paddingBlockStart="200">
            <InlineStack gap="200" wrap>
              {products.map((p, i) => (
                <div key={i} style={{ border: value === p.id ? "2px solid var(--p-color-border-brand)" : "1px solid var(--p-color-border)", padding: "8px", borderRadius: "8px", cursor: "pointer", width: "100px", textAlign: "center" }} onClick={() => handleChoiceChange(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleChoiceChange(p.id); } }} role="button" tabIndex={0}>
                  <div style={{ width: "100%", height: "80px", backgroundColor: "var(--p-color-bg-surface-secondary)", marginBottom: "8px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Text as="span" tone="subdued">Img</Text>
                  </div>
                  <Text as="p" variant="bodySm" truncate>{p.title || `Product ${i+1}`}</Text>
                </div>
              ))}
            </InlineStack>
          </Box>
        </Box>
      );
    }

    case "tabs": {
      const tabs = config.tabs || [{label: "Tab 1"}];
      return (
        <Box>
           <InlineStack gap="0">
             {tabs.map((t, i) => (
               <div 
                 key={i} 
                 onClick={() => setActiveTab(i)}
                 onKeyDown={(e) => {
                   if (e.key === "Enter" || e.key === " ") {
                     e.preventDefault();
                     setActiveTab(i);
                   }
                 }}
                 role="button"
                 tabIndex={0}
                 style={{ padding: "8px 16px", borderBottom: i === activeTab ? "2px solid var(--p-color-border-brand)" : "2px solid var(--p-color-border)", cursor: "pointer" }}
               >
                 <Text as="span" fontWeight={i === activeTab ? "bold" : "regular"} tone={i === activeTab ? "base" : "subdued"}>{t.label}</Text>
               </div>
             ))}
           </InlineStack>
           <Box padding="300" background="bg-surface-secondary" borderRadius="100">
             <div dangerouslySetInnerHTML={{ __html: tabs[activeTab]?.content || "Tab content here..." }} />
           </Box>
        </Box>
      );
    }

    case "bundle": {
      const bundleProducts = config.bundleProducts || [];
      if (bundleProducts.length === 0) {
        return (
          <Box>
            <Text as="p" variant="bodySm" fontWeight="semibold">{label}</Text>
            <Box paddingBlockStart="200">
              <Text as="p" tone="subdued" variant="bodySm">No products selected for this bundle.</Text>
            </Box>
          </Box>
        );
      }
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="200">{label}</Text>
          <BlockStack gap="400">
            {bundleProducts.map((product, pIdx) => {
              const variants = product.variants || [];
              const firstVariant = variants[0];
              return (
                <Box key={product.id || pIdx} paddingBlockStart="200" borderBlockStartWidth="025" borderColor="border">
                  <BlockStack gap="200">
                    <Text as="p" fontWeight="semibold">{product.title}</Text>
                    {product.image && (
                      <div style={{ width: "80px", height: "80px", border: "1px solid var(--p-color-border)", borderRadius: "8px", overflow: "hidden" }}>
                        <img src={product.image} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    {firstVariant && (
                      <Text as="p" tone="subdued" variant="bodySm">{firstVariant.title}</Text>
                    )}
                    {variants.length > 0 && (
                      <InlineStack gap="200" wrap>
                        {variants.map((v, vIdx) => (
                          <div
                            key={v.id || vIdx}
                            style={{
                              padding: "6px 16px",
                              border: vIdx === 0 ? "2px solid #1a1a1a" : "1px solid var(--p-color-border)",
                              borderRadius: "4px",
                              cursor: "pointer",
                              backgroundColor: vIdx === 0 ? "#1a1a1a" : "#fff",
                              color: vIdx === 0 ? "#fff" : "#1a1a1a",
                              fontSize: "13px",
                              fontWeight: "600",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {v.title}
                          </div>
                        ))}
                      </InlineStack>
                    )}
                  </BlockStack>
                </Box>
              );
            })}
          </BlockStack>
        </Box>
      );
    }

    case "variant_fetcher": {
      const mockOptions = [
        { name: "Size", values: ["S", "M", "L", "XL"], unavailable: ["XL"] },
        { name: "Color", values: ["Red", "Blue", "Green"], unavailable: ["Green"] },
      ];
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="200">{label}</Text>
          <Box padding="300" background="bg-surface-secondary" borderWidth="025" borderColor="border" borderRadius="200">
            <BlockStack gap="300">
              <InlineStack gap="100" blockAlign="center">
                <Text as="span" variant="bodySm" tone="magic">🔄</Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  Variants will be fetched from the assigned product
                </Text>
              </InlineStack>
              {mockOptions.map((opt, oi) => (
                <BlockStack key={oi} gap="100">
                  <Text as="p" variant="bodySm" fontWeight="semibold">{opt.name}</Text>
                  <InlineStack gap="200" wrap>
                    {opt.values.map((val, vi) => {
                      const isUnavail = opt.unavailable.includes(val);
                      return (
                        <div
                          key={vi}
                          style={{
                            padding: "6px 16px",
                            borderRadius: "4px",
                            border: vi === 0 ? "2px solid #1a1a1a" : "1px solid var(--p-color-border)",
                            backgroundColor: vi === 0 ? "#1a1a1a" : "#fff",
                            color: vi === 0 ? "#fff" : "#1a1a1a",
                            fontSize: "13px",
                            fontWeight: "600",
                            opacity: isUnavail ? 0.4 : 1,
                            textDecoration: isUnavail ? "line-through" : "none",
                            cursor: isUnavail ? "not-allowed" : "pointer",
                          }}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </InlineStack>
                </BlockStack>
              ))}
            </BlockStack>
          </Box>
        </Box>
      );
    }

    default:
      return (
        <TextField
          label={label}
          placeholder={config.placeholder || `Enter ${label}`}
          value={value || ""}
          onChange={handleTextChange}
          autoComplete="off"
        />
      );
  }
}
