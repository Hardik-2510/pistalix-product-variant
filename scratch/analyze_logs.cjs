const fs = require('fs');
const path = require('path');

const logsDir = 'h:\\PistaLix\\pistalix-globo\\.shopify\\logs';
if (!fs.existsSync(logsDir)) {
  console.log("Logs directory does not exist.");
  process.exit(0);
}

const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));
console.log(`Analyzing ${files.length} log files...`);

for (const file of files) {
  const filePath = path.join(logsDir, file);
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (content.payload && content.payload.input && content.payload.input.cart) {
      const lines = content.payload.input.cart.lines || [];
      const outputOps = (content.payload.output && content.payload.output.operations) || [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const op = outputOps.find(o => o.lineUpdate && o.lineUpdate.cartLineId === line.id);
        const inputVal = line.finalPrice ? line.finalPrice.value : 'N/A';
        const outputVal = op && op.lineUpdate.price.adjustment.fixedPricePerUnit ? op.lineUpdate.price.adjustment.fixedPricePerUnit.amount : 'N/A';
        console.log(`File: ${file} | Input: ${inputVal} | Output: ${outputVal}`);
      }
    }
  } catch (e) {
    console.error(`Error parsing ${file}:`, e.message);
  }
}
