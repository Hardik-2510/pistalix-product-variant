const fs = require('fs');
const path = require('path');

const filePath = 'h:\\PistaLix\\pistalix-globo\\extensions\\cart-price-override\\dist\\function.wasm';
if (fs.existsSync(filePath)) {
  const stats = fs.statSync(filePath);
  console.log("Last modified:", stats.mtime);
  console.log("Current time:", new Date());
  console.log("Difference (ms):", new Date() - stats.mtime);
} else {
  console.log("File does not exist!");
}
