import { useRef } from "react";
import { Button, InlineStack, Box, Thumbnail } from "@shopify/polaris";

export default function ImageUploadInput({ value, onChange }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
    }
    // reset input value so selecting the same file again triggers onChange
    e.target.value = null;
  };

  return (
    <Box width="100%">
      <input 
        type="file" 
        accept="image/*" 
        style={{ display: "none" }} 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      
      {value ? (
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
               border: "1px solid var(--p-color-border)"
             }}
             title="Change image"
           >
             <Thumbnail source={value} alt="Uploaded preview" size="small" />
           </div>
           <Button variant="plain" tone="critical" onClick={(e) => { e.preventDefault(); onChange(""); }}>
             Remove
           </Button>
        </InlineStack>
      ) : (
        <Button fullWidth onClick={() => fileInputRef.current?.click()}>
          Upload image
        </Button>
      )}
    </Box>
  );
}
