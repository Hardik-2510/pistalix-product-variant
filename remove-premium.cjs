const fs = require('fs');
let code = fs.readFileSync('app/routes/app.settings.jsx', 'utf8');

// Remove the PREMIUM plan blocks
code = code.replace(/<Box paddingBlockStart="300">\s*<Text tone="caution">\s*🔒 This feature is available on <Button variant="plain">PREMIUM<\/Button> plan or higher\.\s*<\/Text>\s*<\/Box>/g, '');

// Remove the "higher plan" block
code = code.replace(/<Box>\s*<Text as="p" tone="subdued">🔒 This feature is available on <Text as="span" tone="success">higher plan<\/Text>\.<\/Text>\s*<\/Box>/g, '');

fs.writeFileSync('app/routes/app.settings.jsx', code);
console.log('Removed premium blocks');
