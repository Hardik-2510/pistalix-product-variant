const fs = require('fs');
let content = fs.readFileSync('h:/PistaLix/pistalix-globo/extensions/product-options-widget/assets/product-options.js', 'utf8');

const helpersReplacement = `
var capConfig = {
  basePrice: 0,
  moneyFormat: '$' + '{{amount}}',
  priceElements: []
};

/* ─── Helpers ────────────────────────────────────────────────── */

function formatMoney(cents, format) {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  var value = '';
  var placeholderRegex = /\\{\\{\\s*(\\w+)\\s*\\}\\}/;
  var formatString = format || '$' + '{{amount}}';
  
  function defaultTo(val, def) {
    return val == null || val !== val ? def : val;
  }
  function formatWithDelimiters(num, precision, thousands, decimal) {
    precision = defaultTo(precision, 2);
    thousands = defaultTo(thousands, ',');
    decimal = defaultTo(decimal, '.');
    if (isNaN(num) || num == null) { return 0; }
    num = (num / 100.0).toFixed(precision);
    var parts = num.split('.');
    var dollars = parts[0].replace(/(\\d)(?=(\\d\\d\\d)+(?!\\d))/g, '$1' + thousands);
    var cents = parts[1] ? (decimal + parts[1]) : '';
    return dollars + cents;
  }

  var match = formatString.match(placeholderRegex);
  if (!match) return formatWithDelimiters(cents, 2);

  switch(match[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
    default:
      value = formatWithDelimiters(cents, 2);
  }
  return formatString.replace(placeholderRegex, value);
}

function getOptionLabel(opt) {
  var p = parseFloat(opt.price);
  if (!isNaN(p) && p > 0) {
    var cents = p * 100;
    return opt.label + ' (+' + formatMoney(cents, capConfig.moneyFormat) + ')';
  }
  return opt.label;
}

function getOptionPriceCents(opt) {
  var p = parseFloat(opt.price);
  if (!isNaN(p) && p > 0) {
    return p * 100;
  }
  return 0;
}

function updateTotalPrice() {
  var totalAddonCents = 0;
  
  // Selects (Dropdown, Color Dropdown)
  document.querySelectorAll('#cap-product-options select.cap-select').forEach(function(select) {
    if (select.selectedIndex >= 0) {
      var opt = select.options[select.selectedIndex];
      var p = parseInt(opt.getAttribute('data-price') || '0', 10);
      totalAddonCents += p;
    }
  });

  // Radios, Checkboxes
  document.querySelectorAll('#cap-product-options input[type="radio"]:checked, #cap-product-options input[type="checkbox"]:checked').forEach(function(input) {
    var p = parseInt(input.getAttribute('data-price') || '0', 10);
    totalAddonCents += p;
  });

  // Swatches (Button, Color, Image)
  document.querySelectorAll('#cap-product-options .cap-selected').forEach(function(swatch) {
    var p = parseInt(swatch.getAttribute('data-price') || '0', 10);
    totalAddonCents += p;
  });

  var finalPriceCents = capConfig.basePrice + totalAddonCents;
  var formattedPrice = formatMoney(finalPriceCents, capConfig.moneyFormat);

  capConfig.priceElements.forEach(function(el) {
    el.innerHTML = formattedPrice;
  });
}

function initPriceTracking(container) {
  capConfig.basePrice = parseInt(container.getAttribute('data-product-price') || '0', 10);
  capConfig.moneyFormat = container.getAttribute('data-money-format') || '$' + '{{amount}}';
  
  var selectors = [
    '.price-item--regular',
    '.price__regular .price-item--regular',
    '.product-single__price',
    '.product__price',
    '.price .price-item',
    '.price-item.price-item--regular'
  ];
  
  var els = [];
  selectors.forEach(function(sel) {
    document.querySelectorAll(sel).forEach(function(el) {
      if (el.closest('.price--on-sale') && !el.closest('.price__sale')) return;
      els.push(el);
    });
  });
  capConfig.priceElements = els;
}
`;

content = content.replace('/* ─── Helpers ────────────────────────────────────────────────── */', helpersReplacement);

content = content.replace(
  'function renderTemplate(template, container) {\n  container.innerHTML = \'\';',
  'function renderTemplate(template, container) {\n  initPriceTracking(container);\n  container.innerHTML = \'\';'
);

// Dropdowns
content = content.replace(
  /option\.textContent = opt\.label;\s*select\.appendChild\(option\);/g,
  `option.textContent = getOptionLabel(opt);
    option.setAttribute('data-price', getOptionPriceCents(opt));
    select.appendChild(option);`
);

content = content.replace(
  /group\.appendChild\(select\);/g,
  `select.addEventListener('change', updateTotalPrice);
  group.appendChild(select);`
);

// Image Dropdown
content = content.replace(
  /label\.textContent = opt\.label;\s*item\.appendChild\(label\);/g,
  `label.textContent = getOptionLabel(opt);
    item.setAttribute('data-price', getOptionPriceCents(opt));
    item.appendChild(label);`
);

content = content.replace(
  /optionsList\.style\.display = 'none';\s*}\);/g,
  `optionsList.style.display = 'none';
      updateTotalPrice();
    });`
);

// Radio
content = content.replace(
  /label\.appendChild\(document\.createTextNode\(' ' \+ opt\.label\)\);/g,
  `label.appendChild(document.createTextNode(' ' + getOptionLabel(opt)));
    input.setAttribute('data-price', getOptionPriceCents(opt));`
);

content = content.replace(
  /hiddenInput\.value = input\.value;\s*}\);/g,
  `hiddenInput.value = input.value;
      updateTotalPrice();
    });`
);

// Checkbox
content = content.replace(
  /input\.value = opt\.value \|\| opt\.label;/g,
  `input.value = opt.value || opt.label;
    input.setAttribute('data-price', getOptionPriceCents(opt));
    input.addEventListener('change', updateTotalPrice);`
);

content = content.replace(
  /label\.appendChild\(document\.createTextNode\(' ' \+ opt\.label\)\);\s*wrap\.appendChild\(label\);/g,
  `label.appendChild(document.createTextNode(' ' + getOptionLabel(opt)));
    wrap.appendChild(label);`
);

// Button Swatch
content = content.replace(
  /btn\.textContent = opt\.label;/g,
  `btn.textContent = getOptionLabel(opt);
    btn.setAttribute('data-price', getOptionPriceCents(opt));`
);

content = content.replace(
  /hiddenInput\.value = opt\.value \|\| opt\.label;\s*}\);/g,
  `hiddenInput.value = opt.value || opt.label;
      updateTotalPrice();
    });`
);

// Swatch texts
content = content.replace(
  /textDisplay\.textContent = opt\.label;/g,
  `textDisplay.textContent = getOptionLabel(opt);`
);

// Color Swatch
content = content.replace(
  /swatch\.className = 'cap-color-swatch';/g,
  `swatch.className = 'cap-color-swatch';
    swatch.setAttribute('data-price', getOptionPriceCents(opt));`
);

// Image Swatch
content = content.replace(
  /swatch\.className = 'cap-image-swatch';/g,
  `swatch.className = 'cap-image-swatch';
    swatch.setAttribute('data-price', getOptionPriceCents(opt));`
);


fs.writeFileSync('h:/PistaLix/pistalix-globo/extensions/product-options-widget/assets/product-options.js', content);
