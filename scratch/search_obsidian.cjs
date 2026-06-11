const fs = require('fs');
const path = require('path');

const logsDir = 'h:\\PistaLix\\pistalix-globo\\.shopify\\logs';
if (!fs.existsSync(logsDir)) {
  console.log("Logs directory does not exist.");
  process.exit(0);
}

const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(logsDir, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.includes("Obsidian") || raw.includes("1146") || raw.includes("858") || raw.includes("815")) {
      console.log(`Found match in file: ${file}`);
      const content = JSON.parse(raw);
      console.log(JSON.stringify(content.payload, null, 2));
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
}
