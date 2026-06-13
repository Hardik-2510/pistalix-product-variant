import {
  TextField, Select, Divider, Text, Box, InlineStack, BlockStack, RadioButton,
  Checkbox as PolarisCheckbox, Button, Popover, ActionList, Modal, Tooltip
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
  const optionsList = config.choices || config.options || config.swatches || [];

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
    p = p.replace(/[+$]/g, "").trim();
    if (!p) return "";
    
    return ` (+${p}$)`;
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
            <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="100">{label}{getAddOnText(config)}</Text>
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
            {config.helpText && <Text as="p" tone="subdued" variant="bodySm"><Box paddingBlockStart="100">{config.helpText}</Box></Text>}
          </Box>
        );
      }

      const isTextLike = ["text", "email", "phone"].includes(typeStr);
      const currentLength = (value || "").length;
      const maxL = config.maxCharacter;
      const showCount = isTextLike && (config.characterCounter || maxL);
      const charCountText = maxL ? `${currentLength}/${maxL} characters` : `${currentLength} characters`;

      const renderLabel = () => {
        const textLabel = `${label}${getAddOnText(config)}`;
        if (config.helpText && config.helpTextPosition === "Tooltip") {
          return (
            <InlineStack gap="100" blockAlign="center">
              <Text as="span">{textLabel}</Text>
              <Tooltip content={config.helpText}>
                <Text as="span" tone="subdued" cursor="help">ⓘ</Text>
              </Tooltip>
            </InlineStack>
          );
        }
        return textLabel;
      };

      return (
        <Box>
          <TextField
            label={renderLabel()}
            type={typeStr === "number" ? "number" : typeStr === "email" ? "email" : typeStr === "phone" ? "tel" : "text"}
            placeholder={config.placeholder || ""}
            value={value || ""}
            onChange={handleTextChange}
            autoComplete="off"
            maxLength={isTextLike && maxL ? maxL : undefined}
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

      const renderLabel = () => {
        const textLabel = `${label}${getAddOnText(config)}`;
        if (config.helpText && config.helpTextPosition === "Tooltip") {
          return (
            <InlineStack gap="100" blockAlign="center">
              <Text as="span">{textLabel}</Text>
              <Tooltip content={config.helpText}>
                <Text as="span" tone="subdued" cursor="help">ⓘ</Text>
              </Tooltip>
            </InlineStack>
          );
        }
        return textLabel;
      };

      return (
        <Box>
          <TextField
            label={renderLabel()}
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
      const selectedOption = optionsList.find((o, i) => (o.id || o.value || o.label || String(i)) === activeValue) || (activeValue === "" ? null : optionsList[0]);
      const addonText = selectedOption ? getAddOnText(selectedOption) : "";

      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold">{label} {addonText}</Text>
          {selectedOption && (
             <Text as="p" variant="bodySm" tone="subdued" paddingBlockStart="050" paddingBlockEnd="100">
                {selectedOption.label || selectedOption.value || ""}
             </Text>
          )}
          {!selectedOption && <Box paddingBlockEnd="100" />}
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
        </Box>
      );
    }

    case "image dropdown": {
      const selectedOption = optionsList.find((o, i) => (o.id || o.value || o.label || String(i)) === activeValue) || optionsList[0];
      const addonText = selectedOption ? getAddOnText(selectedOption) : "";
      
      const buttonLabel = selectedOption 
        ? `${selectedOption.label || selectedOption.value}`
        : `Select ${label}...`;
        
      const activator = (
        <Button onClick={togglePopoverActive} disclosure fullWidth textAlign="left">
          <span>{buttonLabel}</span>
        </Button>
      );
      
      return (
        <Box>
           <Text as="p" variant="bodySm" fontWeight="semibold">{label} {addonText}</Text>
           {selectedOption && (
              <Text as="p" variant="bodySm" tone="subdued" paddingBlockStart="050" paddingBlockEnd="100">
                 {selectedOption.label || selectedOption.value || ""}
              </Text>
           )}
           {!selectedOption && <Box paddingBlockEnd="100" />}
           
           <InlineStack gap="300" blockAlign="center" wrap={false}>
             {selectedOption?.image && (
               <Box minWidth="50px">
                 <img src={selectedOption.image} alt="" style={{width: 50, height: 50, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--p-color-border-disabled)"}} />
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
                       onAction: () => { handleSelectChange(val); setPopoverActive(false); },
                       prefix: o.image ? <img src={o.image} alt="" style={{width: 24, height: 24, objectFit: "cover", borderRadius: 4, border: "1px solid var(--p-color-border-disabled)"}} /> : null
                     };
                   })}
                 />
               </Popover>
             </Box>
           </InlineStack>
           
           {config.helpText && <Text as="p" tone="subdued" variant="bodySm"><Box paddingBlockStart="100">{config.helpText}</Box></Text>}
        </Box>
      );
    }

    case "color dropdown": {
      const selectedOption = optionsList.find((o, i) => (o.id || o.value || o.label || String(i)) === activeValue) || optionsList[0];
      const addonText = selectedOption ? getAddOnText(selectedOption) : "";
      
      const buttonLabel = selectedOption 
        ? `${selectedOption.label || selectedOption.color || selectedOption.value}`
        : `Select ${label}...`;
        
      const activator = (
        <Button onClick={togglePopoverActive} disclosure fullWidth textAlign="left">
          <InlineStack gap="200" blockAlign="center">
             {selectedOption && (
                <div style={{width: 20, height: 20, backgroundColor: selectedOption.color || "#000", borderRadius: 4, border: "1px solid var(--p-color-border)"}} />
             )}
             <span>{buttonLabel}</span>
          </InlineStack>
        </Button>
      );
      
      return (
        <Box>
           <Text as="p" variant="bodySm" fontWeight="semibold">{label} {addonText}</Text>
           {selectedOption && (
              <Text as="p" variant="bodySm" tone="subdued" paddingBlockStart="050" paddingBlockEnd="100">
                 {selectedOption.label || selectedOption.value || ""}
              </Text>
           )}
           {!selectedOption && <Box paddingBlockEnd="100" />}
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
                   onAction: () => { handleSelectChange(val); setPopoverActive(false); },
                   prefix: <div style={{width: 20, height: 20, backgroundColor: o.color || "#000", borderRadius: 4, border: "1px solid var(--p-color-border)"}} />
                 };
               })}
             />
           </Popover>
           {config.helpText && <Text as="p" tone="subdued" variant="bodySm"><Box paddingBlockStart="100">{config.helpText}</Box></Text>}
        </Box>
      );
    }

    case "radio button": {
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold">{label}</Text>
          <Box paddingBlockStart="200">
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
          </Box>
        </Box>
      );
    }

    case "select":
    case "checkbox": {
      const currentValues = Array.isArray(activeValue) ? activeValue : (activeValue ? [activeValue] : []);
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold">{label}</Text>
          <Box paddingBlockStart="200">
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
          </Box>
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
      
      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold">
            {label}
            {selectedSwatches.length > 0 && (
              <span style={{ fontWeight: "normal", color: "var(--p-color-text-subdued)", marginLeft: "8px" }}>
                {selectedSwatches.map(s => `${s.label} ${getAddOnText(s)}`).join(", ")}
              </span>
            )}
          </Text>
          <Box paddingBlockStart="200">
            <InlineStack gap="200" wrap>
              {optionsList.map((s, i) => {
                const optValue = s.id || s.value || s.label || String(i);
                const isSelected = currentValues.includes(optValue);
                
                if (typeStr === "color swatch") {
                  return (
                    <Tooltip key={i} content={`${s.label}${getAddOnText(s)}`} preferredPosition="above">
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
                          width: "36px", height: "36px", borderRadius: "50%",
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
                    </Tooltip>
                  );
                }

                if (typeStr === "image swatch") {
                  return (
                    <Tooltip key={i} content={`${s.label}${getAddOnText(s)}`} preferredPosition="above">
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
                          width: "70px", height: "70px",
                          borderRadius: "4px",
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
                    </Tooltip>
                  );
                }
                return (
                  <Button 
                    key={i} 
                    size="slim" 
                    pressed={isSelected}
                    onClick={() => {
                      if (isMulti) {
                        if (isSelected) handleChoiceChange(currentValues.filter(v => v !== optValue));
                        else handleChoiceChange([...currentValues, optValue]);
                      } else {
                        handleChoiceChange(optValue);
                      }
                    }}
                  >
                    {s.label}{getAddOnText(s)}
                  </Button>
                );
              })}
            </InlineStack>
          </Box>
        </Box>
      );
    }

    // static text types
    case "heading":
      return <Text variant="headingMd" as="h3" fontWeight={config.fontWeight || "bold"}>{config.content || label}</Text>;
    case "divider":
      return <Divider />;
    case "spacing":
      return <Box minHeight={`${config.height || 20}px`} />;
    case "paragraph":
      return <Text as="p" tone="subdued">{config.content || label}</Text>;
    case "html":
      return <div dangerouslySetInnerHTML={{ __html: config.content || "<div></div>" }} />;
    case "popup_modal":
    case "pop-up modal":
    case "size_chart":
      return (
        <>
          <Button variant="plain" onClick={() => setModalActive(true)}>
             {config.triggerText || label} ↗
          </Button>
          <Modal
             open={modalActive}
             onClose={() => setModalActive(false)}
             title={config.title || label || "Details"}
          >
             <Modal.Section>
                <div dangerouslySetInnerHTML={{ __html: config.content || "<p>No content provided.</p>" }} />
             </Modal.Section>
          </Modal>
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
          {config.helpText && <Text as="p" tone="subdued" variant="bodySm"><Box paddingBlockStart="100">{config.helpText}</Box></Text>}
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
      const allowedExts = config.allowedExtensions || ".jpeg, .jpg, .png, .webp, .svg";
      const isFileUploaded = value && value instanceof File;
      const fileName = isFileUploaded ? value.name : (typeof value === "string" && value ? value : "");
      
      const filePreviewUrl = isFileUploaded && value.type.startsWith("image/") ? URL.createObjectURL(value) : null;

      return (
        <Box>
          <Text as="p" variant="bodySm" fontWeight="semibold" paddingBlockEnd="100">{label}{getAddOnText(config)}</Text>
          
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
                     <div style={{ width: "100%", height: "100%", backgroundColor: "#f4f6f8", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c9196", fontSize: "10px", fontWeight: "bold" }}>FILE</div>
                   )}
                 </div>
                 <span style={{ color: "white", fontSize: "15px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                   {fileName}
                 </span>
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
          {config.helpText && <Box paddingBlockStart="100"><Text as="p" tone="subdued" variant="bodySm">{config.helpText}</Text></Box>}
          
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
      
      return (
        <Box>
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
