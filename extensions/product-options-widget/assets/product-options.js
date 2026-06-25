/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/**
 * Varify Product Options Variant — Product Options Widget
 * 
 * Supports two data sources:
 * 1. Metafield (preferred): Template JSON embedded in page via Liquid
 * 2. API fallback: Fetches template from the app's API endpoint
 */

var capConfig = {
  basePrice: 0,
  moneyFormat: '${{amount}}'
};

function getToggleStates() {
  var states = capConfig.settings && capConfig.settings.toggleStates ? capConfig.settings.toggleStates : {};
  return {
    tooltip: states.tooltip !== undefined ? states.tooltip : true,
    displayValue: states.displayValue !== undefined ? states.displayValue : true,
    limitHeight: states.limitHeight !== undefined ? states.limitHeight : false,
    collectionQuickview: states.collectionQuickview !== undefined ? states.collectionQuickview : true,
    autoScroll: states.autoScroll !== undefined ? states.autoScroll : true,
    hideQuantity: states.hideQuantity !== undefined ? states.hideQuantity : true,
    showEditOptions: states.showEditOptions !== undefined ? states.showEditOptions : false,
    homePageWidget: states.homePageWidget !== undefined ? states.homePageWidget : true,
    regularPageWidget: states.regularPageWidget !== undefined ? states.regularPageWidget : true,
    showAddonForInputs: states.showAddonForInputs !== undefined ? states.showAddonForInputs : true,
    showAddonForOptions: states.showAddonForOptions !== undefined ? states.showAddonForOptions : true,
    showAddonMessage: states.showAddonMessage !== undefined ? states.showAddonMessage : true,
    addAddonPriceToProductPrice: states.addAddonPriceToProductPrice !== undefined ? states.addAddonPriceToProductPrice : true,
    mergeMainProductAndAddonProducts: states.mergeMainProductAndAddonProducts !== undefined ? states.mergeMainProductAndAddonProducts : false
  };
}

function initPistalixWidget() {
  var container = document.getElementById('cap-product-options');
  if (!container) return;
  // Prevent double initialization
  if (container.getAttribute('data-initialized') === 'true') return;
  container.setAttribute('data-initialized', 'true');

  var settingsAttr = container.getAttribute('data-app-settings');
  if (settingsAttr) {
    try {
      capConfig.settings = JSON.parse(settingsAttr);
      if (typeof capConfig.settings === 'string') {
        capConfig.settings = JSON.parse(capConfig.settings);
      }
    } catch (e) { console.warn("Pistalix: JSON parse failed", e); }
  }

  var toggleStates = getToggleStates();

  // Initialize cart page features globally (handles ajax carts/drawers as well)
  initCartPageFeatures(toggleStates);

  var pageType = container.getAttribute('data-page-type');

  if (pageType === 'index' && toggleStates.homePageWidget === false) {
    container.style.display = 'none';
    return;
  }
  if (pageType === 'collection' && toggleStates.collectionQuickview === false) {
    container.style.display = 'none';
    return;
  }
  // "Regular page" covers anything else not specifically product/index/collection
  if (pageType !== 'product' && pageType !== 'index' && pageType !== 'collection' && toggleStates.regularPageWidget === false) {
    container.style.display = 'none';
    return;
  }

  var source = container.getAttribute('data-source');

  if (source === 'metafield') {
    try {
      var raw = container.getAttribute('data-template-json');
      var template = JSON.parse(raw);
      if (typeof template === 'string') {
        template = JSON.parse(template);
      }
      if (template && template.elements && template.elements.length > 0) {
        renderTemplate(template, container);
      } else {
        container.style.display = 'none';
      }
    } catch (e) {
      console.error('Pistalix: Failed to parse metafield template data', e);
      container.style.display = 'none';
    }
  } else if (source === 'api') {
    var productId = container.getAttribute('data-product-id');
    var shop = container.getAttribute('data-shop');

    if (!productId || !shop) { container.style.display = 'none'; return; }

    // Use Shopify App Proxy endpoint
    fetchTemplate(productId, shop, '/apps/product-options');
  } else {
    container.style.display = 'none';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPistalixWidget);
} else {
  initPistalixWidget();
}

if (!window.pistalixSubmitTrackerRegistered) {
  window.pistalixSubmitTrackerRegistered = true;
  window.pistalixLastSubmittedForm = null;
  document.addEventListener('submit', function (e) {
    window.pistalixLastSubmittedForm = e.target;
  }, true);

  // Intercept fetch to handle AJAX cart submit calls (for Dawn and other modern themes)
  var originalFetch = window.fetch;
  window.fetch = function () {
    var urlArg = arguments[0];
    var urlStr = typeof urlArg === 'string' ? urlArg : (urlArg && urlArg.url ? urlArg.url : '');
    var config = arguments[1];

    if (urlStr && urlStr.indexOf('/cart/add') !== -1) {
      if (config && config.body) {
        var wrapperEl = null;
        if (window.pistalixLastSubmittedForm) {
          wrapperEl = window.pistalixLastSubmittedForm.querySelector('.cap-options-wrapper');
        }
        if (!wrapperEl) {
          wrapperEl = document.querySelector('.cap-options-wrapper');
        }
        if (wrapperEl) {
          var inputs = wrapperEl.querySelectorAll('[name^="properties["]');
          if (config.body instanceof FormData) {
            inputs.forEach(function (inp) {
              if (inp.type === 'radio' && !inp.checked) return;
              if (inp.type === 'checkbox' && !inp.checked) return;
              if (inp.disabled) return;
              var _grp = inp.closest('.cap-option-group');
              if (_grp && _grp.style.display === 'none') return;

              if (inp.type === 'file') {
                if (inp.files && inp.files.length > 0) {
                  if (inp.files.length === 1) {
                    config.body.set(inp.name, inp.files[0]);
                  } else {
                    for (var k = 0; k < inp.files.length; k++) {
                      var arrName = inp.name.replace(']', ' ' + (k + 1) + ']');
                      config.body.set(arrName, inp.files[k]);
                    }
                  }
                }
              } else if (inp.value) {
                config.body.set(inp.name, inp.value);
              }
            });
          } else if (typeof config.body === 'string') {
            if (config.body.trim().indexOf('{') === 0) {
              try {
                var json = JSON.parse(config.body);
                if (!json.properties) json.properties = {};
                inputs.forEach(function (inp) {
                  if (inp.type === 'radio' && !inp.checked) return;
                  if (inp.type === 'checkbox' && !inp.checked) return;
                  if (inp.disabled) return;
                  var _grp = inp.closest('.cap-option-group');
                  if (_grp && _grp.style.display === 'none') return;
                  if (inp.value) {
                    var propMatch = inp.name.match(/properties\[(.*?)\]/);
                    if (propMatch && propMatch[1]) {
                      json.properties[propMatch[1]] = inp.value;
                    }
                  }
                });
                config.body = JSON.stringify(json);
              } catch (e) {
                console.warn("Pistalix: Fetch JSON parse failed", e);
              }
            } else {
              try {
                var params = new URLSearchParams(config.body);
                inputs.forEach(function (inp) {
                  if (inp.type === 'radio' && !inp.checked) return;
                  if (inp.type === 'checkbox' && !inp.checked) return;
                  if (inp.disabled) return;
                  var _grp = inp.closest('.cap-option-group');
                  if (_grp && _grp.style.display === 'none') return;
                  if (inp.value) {
                    params.set(inp.name, inp.value);
                  }
                });
                config.body = params.toString();
              } catch (e) {
                console.warn("Pistalix: Fetch query string parse failed", e);
              }
            }
          }
        }
      }
    }
    return originalFetch.apply(window, arguments);
  };

  // Intercept XMLHttpRequest to handle Axios/jQuery cart submit calls
  var originalOpen = window.XMLHttpRequest.prototype.open;
  var originalSend = window.XMLHttpRequest.prototype.send;

  window.XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  window.XMLHttpRequest.prototype.send = function (body) {
    if (this._url && typeof this._url === 'string' && this._url.indexOf('/cart/add') !== -1) {
      var wrapperEl = null;
      if (window.pistalixLastSubmittedForm) {
        wrapperEl = window.pistalixLastSubmittedForm.querySelector('.cap-options-wrapper');
      }
      if (!wrapperEl) {
        wrapperEl = document.querySelector('.cap-options-wrapper');
      }
      if (wrapperEl && body) {
        var inputs = wrapperEl.querySelectorAll('[name^="properties["]');
        if (body instanceof FormData) {
          inputs.forEach(function (inp) {
            if (inp.type === 'radio' && !inp.checked) return;
            if (inp.type === 'checkbox' && !inp.checked) return;
            if (inp.disabled) return;

            if (inp.type === 'file') {
              if (inp.files && inp.files.length > 0) {
                if (inp.files.length === 1) {
                  body.set(inp.name, inp.files[0]);
                } else {
                  for (var k = 0; k < inp.files.length; k++) {
                    var arrName = inp.name.replace(']', ' ' + (k + 1) + ']');
                    body.set(arrName, inp.files[k]);
                  }
                }
              }
            } else if (inp.value) {
              body.set(inp.name, inp.value);
            }
          });
        } else if (typeof body === 'string') {
          if (body.trim().indexOf('{') === 0) {
            try {
              var json = JSON.parse(body);
              if (!json.properties) json.properties = {};
              inputs.forEach(function (inp) {
                if (inp.type === 'radio' && !inp.checked) return;
                if (inp.type === 'checkbox' && !inp.checked) return;
                if (inp.disabled) return;
                var _grp = inp.closest('.cap-option-group');
                if (_grp && _grp.style.display === 'none') return;
                if (inp.value) {
                  var propMatch = inp.name.match(/properties\[(.*?)\]/);
                  if (propMatch && propMatch[1]) {
                    json.properties[propMatch[1]] = inp.value;
                  }
                }
              });
              body = JSON.stringify(json);
            } catch (e) {
              console.warn("Pistalix: XHR JSON parse failed", e);
            }
          } else {
            try {
              var params = new URLSearchParams(body);
              inputs.forEach(function (inp) {
                if (inp.type === 'radio' && !inp.checked) return;
                if (inp.type === 'checkbox' && !inp.checked) return;
                if (inp.disabled) return;
                var _grp = inp.closest('.cap-option-group');
                if (_grp && _grp.style.display === 'none') return;
                if (inp.value) {
                  params.set(inp.name, inp.value);
                }
              });
              body = params.toString();
            } catch (e) {
              console.warn("Pistalix: XHR query string parse failed", e);
            }
          }
        }
      }
    }
    return originalSend.call(this, body);
  };
}

async function fetchTemplate(productId, shop, appUrl) {
  try {
    var url = appUrl + '/api/product-options?productId=' + productId + '&shop=' + shop;
    var response = await fetch(url);
    var data = await response.json();
    var container = document.getElementById('cap-product-options');
    if (!data.found || !data.template || !data.template.elements.length) {
      container.style.display = 'none';
      return;
    }
    renderTemplate(data.template, container);
  } catch (error) {
    console.error('Pistalix: API fetch error', error);
    document.getElementById('cap-product-options').style.display = 'none';
  }
}

/* ─── Helpers ────────────────────────────────────────────────── */

function parseConfig(configVal) {
  if (!configVal) return {};
  if (typeof configVal === 'object') return configVal;
  try { return JSON.parse(configVal); } catch (e) { return {}; }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getChoices(config) {
  var choices = config.choices || config.options || config.swatches || [];
  if (config.textTransform && config.textTransform !== "Default") {
    return choices.map(function (opt) {
      var newOpt = Object.assign({}, opt);
      var t = config.textTransform;
      function transformText(text) {
        if (!text) return text;
        if (t === "Uppercase") return text.toUpperCase();
        if (t === "Lowercase") return text.toLowerCase();
        if (t === "Capitalize") return text.replace(/\b\w/g, function (l) { return l.toUpperCase(); });
        return text;
      }
      if (newOpt.label) newOpt.label = transformText(newOpt.label);
      if (newOpt.value) newOpt.value = transformText(newOpt.value);
      return newOpt;
    });
  }
  return choices;
}

function isDefault(opt, config) {
  if (config && config.noDefaultSelection) return false;
  return opt.default === true || String(opt.default) === 'true';
}

function formatMoney(cents, format) {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || '${{amount}}';

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
    var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var cents = parts[1] ? (decimal + parts[1]) : '';
    return dollars + cents;
  }

  var match = formatString.match(placeholderRegex);
  if (!match) return formatWithDelimiters(cents, 2);

  switch (match[1]) {
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
  // Always return the plain label — addon prices are handled by the cart transform.
  return opt.label;
}

function getOptionPriceCents(opt) {
  var p = parseFloat(opt.price);
  if (!isNaN(p) && p > 0) {
    return Math.round(p * 100);
  }
  return 0;
}

function updateTotalPrice() {
  evaluateStorefrontConditions();

  var totalAddonCents = 0;
  // Selects
  var selects = document.querySelectorAll('.cap-options-wrapper select.cap-select');
  selects.forEach(function (select) {
    var group = select.closest('.cap-option-group');
    if (group && group.style.display === 'none') return;

    if (select.selectedIndex >= 0) {
      var opt = select.options[select.selectedIndex];
      if (opt && opt.value !== '') {
        var p = parseInt(opt.getAttribute('data-price') || '0', 10);
        totalAddonCents += p;
      }
    }
  });

  // Radios and Checkboxes
  var inputs = document.querySelectorAll('.cap-options-wrapper input[type="radio"]:checked, .cap-options-wrapper input[type="checkbox"]:checked');
  inputs.forEach(function (input) {
    var group = input.closest('.cap-option-group');
    if (group && group.style.display === 'none') return;

    var p = parseInt(input.getAttribute('data-price') || '0', 10);
    totalAddonCents += p;
  });

  // Text, Textarea, Number, Email, Phone
  var textInputs = document.querySelectorAll('.cap-options-wrapper input[type="text"], .cap-options-wrapper input[type="email"], .cap-options-wrapper input[type="tel"], .cap-options-wrapper input[type="number"], .cap-options-wrapper textarea');
  textInputs.forEach(function (input) {
    var group = input.closest('.cap-option-group');
    if (group && group.style.display === 'none') return;

    if (input.value && input.value.trim() !== '') {
      var p = parseInt(input.getAttribute('data-price') || '0', 10);
      var perChar = input.getAttribute('data-charge-per-char') === 'true';
      if (perChar) {
        p = p * input.value.length;
      }
      totalAddonCents += p;
    }
  });

  // Swatches (Button, Color, Image)
  var swatches = document.querySelectorAll('.cap-options-wrapper .cap-selected');
  swatches.forEach(function (swatch) {
    var group = swatch.closest('.cap-option-group');
    if (group && group.style.display === 'none') return;

    var p = parseInt(swatch.getAttribute('data-price') || '0', 10);
    totalAddonCents += p;
  });

  // Bundle Hidden Price Inputs
  var priceInputs = document.querySelectorAll('.cap-options-wrapper .cap-price-input');
  var hasUnavailableBundle = false;
  priceInputs.forEach(function (input) {
    var group = input.closest('.cap-option-group');
    if (group && group.style.display === 'none') return;

    if (input.getAttribute('data-available') === 'false') {
      hasUnavailableBundle = true;
    }

    var p = parseInt(input.getAttribute('data-price') || '0', 10);
    totalAddonCents += p;
  });


  var finalPriceCents = capConfig.basePrice + totalAddonCents;
  var formattedPrice = formatMoney(finalPriceCents, capConfig.moneyFormat);

  // Update Cart Transform Hidden Inputs
  var wrapper = document.querySelector('.cap-options-wrapper');
  if (wrapper && totalAddonCents !== 0) {
    var ensureHiddenInput = function (name, val) {
      var inp = wrapper.querySelector('input[name="' + name + '"]');
      if (!inp) {
        inp = document.createElement('input');
        inp.type = 'hidden';
        inp.name = name;
        wrapper.appendChild(inp);
      }
      inp.value = val;
    };

    var zeroDecimalCurrencies = ['JPY', 'KRW', 'TWD', 'VND', 'CLP', 'PYG', 'VUV', 'RWF', 'GNF', 'DJF', 'MGA', 'KMF', 'XAF', 'XOF', 'XPF'];
    var isZeroDecimal = zeroDecimalCurrencies.indexOf(capConfig.currency || 'USD') !== -1;
    var formattedBase = isZeroDecimal ? capConfig.basePrice.toString() : (capConfig.basePrice / 100).toFixed(2);
    var formattedFinal = isZeroDecimal ? finalPriceCents.toString() : (finalPriceCents / 100).toFixed(2);
    var formattedAddon = isZeroDecimal ? totalAddonCents.toString() : (totalAddonCents / 100).toFixed(2);

    ensureHiddenInput('properties[_base_price]', formattedBase);
    ensureHiddenInput('properties[_final_price]', formattedFinal);
    ensureHiddenInput('properties[_price_adjustments]', JSON.stringify({ totalAddon: formattedAddon }));
  } else if (wrapper) {
    // If no addons, remove the inputs so cart transform ignores this line
    var fields = wrapper.querySelectorAll('input[name="properties[_base_price]"], input[name="properties[_final_price]"], input[name="properties[_price_adjustments]"]');
    fields.forEach(function (f) { f.remove(); });
  }

  var toggleStates = getToggleStates();
  var shouldAddPriceToProduct = toggleStates.addAddonPriceToProductPrice;
  var shouldShowAddonMessage = toggleStates.showAddonMessage;

  console.log('Pistalix addon debug:', { totalAddonCents: totalAddonCents, shouldShowAddonMessage: shouldShowAddonMessage, shouldAddPriceToProduct: shouldAddPriceToProduct, wrapper: !!wrapper });

  // Add-on message rendering inside the widget
  if (wrapper) {
    var existingTotalLine = wrapper.querySelector('.cap-addon-total-message');
    if (shouldShowAddonMessage && totalAddonCents > 0) {
      if (!existingTotalLine) {
        existingTotalLine = document.createElement('div');
        existingTotalLine.className = 'cap-addon-total-message cap-option-group';
        existingTotalLine.style.marginTop = '10px';
        existingTotalLine.style.paddingTop = '10px';
        existingTotalLine.style.borderTop = '1px solid #e5e7eb';
        existingTotalLine.style.fontWeight = 'normal';
        existingTotalLine.style.fontSize = '16px';
        existingTotalLine.style.setProperty('flex', '0 0 100%', 'important');
        existingTotalLine.style.setProperty('display', 'block', 'important');
        wrapper.appendChild(existingTotalLine);
      }
      var formattedAddonMoney = formatMoney(totalAddonCents, capConfig.moneyFormat);
      if (formattedAddonMoney.endsWith('.00')) {
        formattedAddonMoney = formattedAddonMoney.slice(0, -3);
      }
      existingTotalLine.innerHTML = '<div style="display:block !important; white-space:nowrap !important; width:100% !important;">Selections will add <span style="display:inline !important;font-weight:600;">' + formattedAddonMoney + '</span> to the price</div>';
    } else if (existingTotalLine) {
      existingTotalLine.remove();
    }
  }

  if (shouldAddPriceToProduct !== false) {
    window.pistalixLastFormattedPrice = formattedPrice;

    var findPriceElements = function () {
      var elements = [];

      // Priority #1: Merchant Override
      if (capConfig.settings && capConfig.settings.customPriceSelector) {
        try {
          document.querySelectorAll(capConfig.settings.customPriceSelector).forEach(function (el) {
            elements.push(el);
          });
        } catch (e) { /* ignore invalid selector errors */ }
      }

      // Priority #2: Predefined Registry
      if (elements.length === 0) {
        var predefinedSelectors = [
          '.price__container .price-item',
          '.price-item--sale',
          '.price__sale .price-item--sale',
          '.price-item--regular',
          '.price__regular .price-item--regular',
          '.product-single__price',
          '.product__price',
          '.price .price-item',
          '.current-price',
          '[data-product-price]',
          '.product-price'
        ];

        predefinedSelectors.forEach(function (sel) {
          document.querySelectorAll(sel).forEach(function (el) {
            elements.push(el);
          });
        });
      }

      // Priority #3: Safety Net
      if (elements.length === 0) {
        document.querySelectorAll('[itemprop="price"]').forEach(function (el) {
          elements.push(el);
        });
      }

      return elements;
    };

    var priceElements = findPriceElements();
    priceElements.forEach(function (el) {
      el.innerHTML = formattedPrice;
    });

    // Handle Theme Drift with MutationObserver
    if (!window.pistalixPriceObserver) {
      window.pistalixPriceObserver = new MutationObserver(function (mutations) {
        var shouldReapply = false;
        mutations.forEach(function (mutation) {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldReapply = true;
          }
        });
        if (shouldReapply && window.pistalixLastFormattedPrice) {
          // Disconnect temporarily to avoid infinite loops
          window.pistalixPriceObserver.disconnect();
          var elementsToUpdate = findPriceElements();
          elementsToUpdate.forEach(function (el) {
            if (el.innerHTML !== window.pistalixLastFormattedPrice) {
              el.innerHTML = window.pistalixLastFormattedPrice;
            }
          });
          // Reconnect
          elementsToUpdate.forEach(function (el) {
            window.pistalixPriceObserver.observe(el, { childList: true, subtree: true, characterData: true });
          });
        }
      });

      // Initial observe
      priceElements.forEach(function (el) {
        window.pistalixPriceObserver.observe(el, { childList: true, subtree: true, characterData: true });
      });
    }

    // Update Add to Cart button text
    var addToCartBtn = document.querySelector('button[name="add"], .product-form__submit, #AddToCart, .add-to-cart');
    if (addToCartBtn) {
      // Find the text node or span inside the button
      var btnTextSpan = addToCartBtn.querySelector('span');
      if (!btnTextSpan) {
        var originalText = addToCartBtn.textContent;
        addToCartBtn.innerHTML = '';
        btnTextSpan = document.createElement('span');
        btnTextSpan.textContent = originalText;
        addToCartBtn.appendChild(btnTextSpan);
      }

      if (!addToCartBtn.hasAttribute('data-original-text')) {
        addToCartBtn.setAttribute('data-original-text', btnTextSpan.textContent.trim());
      }

      var original = addToCartBtn.getAttribute('data-original-text');
      if (hasUnavailableBundle) {
        btnTextSpan.textContent = 'Sold out';
        addToCartBtn.disabled = true;
      } else if (original.toLowerCase().indexOf('sold out') === -1 && original.toLowerCase().indexOf('unavailable') === -1) {
        addToCartBtn.disabled = false;
        if (totalAddonCents > 0 || capConfig.basePrice > 0) {
          btnTextSpan.textContent = 'Add to cart • ' + formattedPrice;
        } else {
          btnTextSpan.textContent = original || 'Add to cart';
        }
      }
    }
  }
}

function initPriceTracking(container) {
  var priceAttr = container.getAttribute('data-product-price') || '0';
  if (priceAttr.indexOf('.') !== -1) {
    capConfig.basePrice = Math.round(parseFloat(priceAttr) * 100);
  } else {
    capConfig.basePrice = parseInt(priceAttr, 10);
  }
  capConfig.moneyFormat = container.getAttribute('data-money-format') || '${{amount}}';
  capConfig.currency = container.getAttribute('data-currency') || 'USD';
}

function updateDisplayValue(group) {
  var displaySpan = group.querySelector('.cap-selected-value-display');
  if (!displaySpan) return;

  var type = group.getAttribute('data-type');
  var val = '';

  if (['Text', 'Textarea', 'Number', 'Email', 'Phone', 'Datetime'].indexOf(type) !== -1) {
    var input = group.querySelector('input, textarea');
    if (input) val = input.value;
  } else if (['Dropdown', 'Select'].indexOf(type) !== -1) {
    var select = group.querySelector('select');
    if (select && select.selectedIndex >= 0 && select.value !== '') {
      val = select.value;
    }
  } else if (['Color Dropdown', 'Image Dropdown', 'Radio Button', 'Color Swatch', 'Image Swatch', 'Button', 'Switch'].indexOf(type) !== -1) {
    var hidden = group.querySelector('input[type="hidden"]');
    if (hidden) val = hidden.value;
  } else if (type === 'Checkbox') {
    var checked = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(function (cb) { return cb.value; });
    val = checked.join(', ');
  }

  if (val) {
    displaySpan.textContent = ' ' + val;

    if (group._element && group._element.config && group._element.config.choices) {
      var matchingChoice = group._element.config.choices.find(function(c) { return c.label === val; });
      if (matchingChoice) {
        var p = parseFloat(matchingChoice.price);
        if (!isNaN(p) && p > 0) {
          var cents = p * 100;
          var settings = capConfig.settings || {};
          var addonMoneyFormat = settings.addonMoneyFormat || "With currency";
          var addonLabelFormat = settings.addonLabelFormat || "(+ {{addon}})";
          var formattedMoney = formatMoney(cents, capConfig.moneyFormat);
          if (addonMoneyFormat === "Without currency") {
            formattedMoney = formatMoney(cents, '{{amount}}');
          }
          if (formattedMoney.endsWith('.00')) {
            formattedMoney = formattedMoney.slice(0, -3);
          }
          // Also remove any space after the plus if it was meant to look like (+30$)
          var addonString = addonLabelFormat.replace('{{addon}}', formattedMoney);
          addonString = addonString.replace(/\(\+\s+/, '(+');
          
          displaySpan.textContent += ' ' + addonString;
        }
      }
    }
  } else {
    displaySpan.textContent = '';
  }
}

function createGroup(element) {
  var config = element.config ? (typeof element.config === 'string' ? JSON.parse(element.config) : element.config) : {};
  var isRequired = element.required || config.noDefaultSelection;

  var group = document.createElement('div');
  group.className = 'cap-option-group';
  group.setAttribute('data-id', element.id || '');
  group.setAttribute('data-required', isRequired ? 'true' : 'false');
  group.setAttribute('data-type', element.type);
  group._element = element;

  var labelWrap = document.createElement('div');
  var labelEl = document.createElement('div');
  labelEl.className = 'cap-label';
  labelEl.style.display = 'inline-flex';
  labelEl.style.flexWrap = 'wrap';
  labelEl.style.alignItems = 'center';

  var labelTextSpan = document.createElement('span');
  labelTextSpan.textContent = element.label;
  labelEl.appendChild(labelTextSpan);

  var toggleStates = getToggleStates();
  if (toggleStates.displayValue !== false) {
    var displayValueSpan = document.createElement('span');
    displayValueSpan.className = 'cap-selected-value-display';
    displayValueSpan.style.fontWeight = 'normal';
    displayValueSpan.style.color = 'var(--p-color-text-subdued, #666)';
    displayValueSpan.style.marginLeft = '4px';
    labelEl.appendChild(displayValueSpan);
  }

  labelWrap.appendChild(labelEl);

  if (element.required) {
    var req = document.createElement('span');
    req.className = 'cap-required';
    req.textContent = '*';
    labelWrap.appendChild(req);
  }

  labelWrap.className = 'cap-label-wrap';
  group.appendChild(labelWrap);

  var config = typeof element.config === 'string' ? JSON.parse(element.config) : (element.config || {});

  if (config.hiddenLabel) {
    labelWrap.style.display = 'none';
  }

  // Handle static Add-on Price for non-choice elements (Text, Number, File Upload, etc.)
  var p = parseFloat(config.price);
  if (!isNaN(p) && p > 0 && !config.choices) {
    var cents = p * 100;
    var settings = capConfig.settings || {};
    var addonMoneyFormat = settings.addonMoneyFormat || "With currency";
    var addonLabelFormat = settings.addonLabelFormat || "(+ {{addon}})";
    var moneyFormat = capConfig.moneyFormat || '${{amount}}';
    var formattedMoney = formatMoney(cents, moneyFormat);
    
    if (addonMoneyFormat === "Without currency") {
      formattedMoney = formatMoney(cents, '{{amount}}');
    }
    if (formattedMoney.endsWith('.00')) {
      formattedMoney = formattedMoney.slice(0, -3);
    }
    var addonString = addonLabelFormat.replace('{{addon}}', formattedMoney);
    addonString = addonString.replace(/\(\+\s+/, '(+');

    var addonSpan = document.createElement('span');
    addonSpan.className = 'cap-addon-price';
    addonSpan.style.fontWeight = 'normal';
    addonSpan.style.color = 'var(--p-color-text-subdued, #666)';
    addonSpan.style.marginLeft = '4px';
    addonSpan.textContent = addonString;
    labelWrap.appendChild(addonSpan);
  }

  var helpText = config.helpText;

  if (helpText) {
    if (config.helpTextPosition === "Tooltip") {
      var tooltipIcon = document.createElement('span');
      tooltipIcon.innerHTML = ' <span style="cursor:help; color:var(--p-color-text-subdued, #666);" title="' + escapeHTML(helpText) + '">ⓘ</span>';
      labelWrap.appendChild(tooltipIcon);
    } else {
      var help = document.createElement('div');
      help.className = 'cap-help-text';
      help.textContent = helpText;
      group.appendChild(help);
    }
  }

  group.addEventListener('change', function () { updateDisplayValue(group); });
  group.addEventListener('input', function () { updateDisplayValue(group); });

  // Initial update after a short delay to allow children to mount and initialize
  setTimeout(function () { updateDisplayValue(group); }, 50);

  return group;
}

function createErrorMsg() {
  var err = document.createElement('div');
  err.className = 'cap-error';
  err.textContent = 'This field is required';
  return err;
}

function propName(label) {
  var cleanLabel = label.replace(/:+$/, '').trim();
  return 'properties[' + cleanLabel + ']';
}

/* ─── Render Template ────────────────────────────────────────── */

function renderTemplate(template, container) {
  initPriceTracking(container);
  container.innerHTML = '';
  container.style.display = '';

  var wrapper = document.createElement('div');
  wrapper.className = 'cap-options-wrapper';

  var elements = template.elements;

  elements.forEach(function (element) {
    var typeLower = (element.type || '').toLowerCase();
    var elDOM = null;

    if (typeLower === 'text' || typeLower === 'email' || typeLower === 'phone') elDOM = renderText(element);
    else if (typeLower === 'textarea') elDOM = renderTextarea(element);
    else if (typeLower === 'number') elDOM = renderNumber(element);
    else if (typeLower === 'datetime') elDOM = renderDate(element);
    else if (typeLower === 'dropdown' || typeLower === 'select') elDOM = renderDropdown(element);
    else if (typeLower === 'color dropdown' || typeLower === 'color_dropdown') elDOM = renderColorDropdown(element);
    else if (typeLower === 'image dropdown' || typeLower === 'image_dropdown') elDOM = renderImageDropdown(element);
    else if (typeLower === 'radio button' || typeLower === 'radio_button') elDOM = renderRadio(element);
    else if (typeLower === 'checkbox') elDOM = renderCheckbox(element);
    else if (typeLower === 'button') elDOM = renderButtonSwatch(element);
    else if (typeLower === 'color swatch' || typeLower === 'color_swatch') elDOM = renderColorSwatch(element);
    else if (typeLower === 'color picker' || typeLower === 'color_picker') elDOM = renderColorPicker(element);
    else if (typeLower === 'image swatch' || typeLower === 'image_swatch') elDOM = renderImageSwatch(element);
    else if (typeLower === 'file' || typeLower === 'file upload' || typeLower === 'file_upload') elDOM = renderFile(element);
    else if (typeLower === 'heading') elDOM = renderHeading(element);
    else if (typeLower === 'divider') elDOM = renderDivider(element);
    else if (typeLower === 'paragraph') elDOM = renderParagraph(element);
    else if (typeLower === 'pop-up modal' || typeLower === 'popup_modal' || typeLower === 'size chart' || typeLower === 'size_chart') elDOM = renderPopupModal(element);
    else if (typeLower === 'html') elDOM = renderHTML(element);
    else if (typeLower === 'spacing') elDOM = renderSpacing(element);
    else if (typeLower === 'switch') elDOM = renderSwitch(element);
    else if (typeLower === 'bundle') elDOM = renderBundle(element);
    else if (typeLower === 'hidden field' || typeLower === 'hidden_field') elDOM = renderHiddenField(element);
    else if (typeLower === 'google font selector' || typeLower === 'font_picker') elDOM = renderFontPicker(element);
    else if (typeLower === 'variant fetcher' || typeLower === 'variant_fetcher') elDOM = renderVariantFetcher(element);
    else elDOM = null;

    if (elDOM) {
      var config = typeof element.config === 'string' ? JSON.parse(element.config) : (element.config || {});
      var width = config.columnWidth || '100%';
      var flexBasis = width;
      if (width === '50%') flexBasis = 'calc(50% - 8px)';
      else if (width === '33%') flexBasis = 'calc(33.333% - 10.66px)';
      else if (width === '25%') flexBasis = 'calc(25% - 12px)';
      else if (width.indexOf('%') > -1 && width !== '100%') flexBasis = 'calc(' + width + ' - 16px)';

      elDOM.style.setProperty('flex', '0 0 ' + flexBasis, 'important');
      elDOM.style.setProperty('max-width', flexBasis, 'important');
      wrapper.appendChild(elDOM);
    }
  });

  var trackInput = document.createElement('input');
  trackInput.type = 'hidden';
  trackInput.name = 'properties[_CustomOptions]';
  trackInput.value = 'true';
  wrapper.appendChild(trackInput);

  // Trigger re-evaluation of conditions and pricing on any customer input
  wrapper.addEventListener('input', updateTotalPrice);
  wrapper.addEventListener('change', updateTotalPrice);

  applyDynamicStyles(wrapper);

  container.appendChild(wrapper);
  // Hide the original container div — the wrapper will be moved
  // into the cart form by injectIntoCartForm. Hiding prevents
  // the container from creating a duplicate empty block in the DOM.
  container.style.display = 'none';
  injectIntoCartForm(wrapper, container);

  // Initialize total price taking into account default selections
  updateTotalPrice(); // Evaluate immediately to prevent flicker
  setTimeout(updateTotalPrice, 100);
}

function applyDynamicStyles(wrapper) {
  var appSettings = capConfig.settings || {};
  if (typeof appSettings === 'string') {
    try { appSettings = JSON.parse(appSettings); } catch (e) { console.warn("Pistalix: settings parse failed", e); }
  }

  var colors = appSettings.colors || {};
  var borders = appSettings.borders || {};
  var typography = appSettings.typography || {};
  var alignment = appSettings.alignment || "left";

  var style = document.createElement('style');
  var css = '';

  // Inject Custom Fonts
  var customFonts = appSettings.customFonts || [];
  for (var i = 0; i < customFonts.length; i++) {
    var font = customFonts[i];
    if (font.name && font.url) {
      // Determine format from filename
      var formatStr = '';
      var fname = (font.filename || '').toLowerCase();
      if (fname.indexOf('.woff2') > -1) formatStr = ' format("woff2")';
      else if (fname.indexOf('.woff') > -1) formatStr = ' format("woff")';
      else if (fname.indexOf('.ttf') > -1) formatStr = ' format("truetype")';
      else if (fname.indexOf('.otf') > -1) formatStr = ' format("opentype")';

      css += '@font-face {\n  font-family: "' + font.name + '";\n  src: url("' + font.url + '")' + formatStr + ';\n  font-weight: normal;\n  font-style: normal;\n  font-display: swap;\n}\n';
    }
  }

  // General
  css += '.cap-options-wrapper { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 16px !important; margin: 0 !important; text-align: ' + alignment + ' !important; background-color: ' + (colors.appBackground || 'transparent') + ' !important; }\n';
  css += '.cap-options-wrapper .cap-option-group { display: flex; flex-direction: column !important; box-sizing: border-box !important; padding: 0 !important; margin: 0 !important; flex-shrink: 0 !important; border: none !important; }\n';
  css += '.cap-options-wrapper .cap-option-group > * { order: 2; }\n';
  css += '.cap-options-wrapper .cap-label-wrap { order: 1; }\n';
  css += '.cap-options-wrapper .cap-help-text { order: 3; margin-top: 4px; }\n';
  css += '.cap-options-wrapper .cap-error { order: 4; margin-top: 4px; }\n';

  var labelCSS = 'color: ' + (colors.labelText || '#111827') + ' !important;';
  if (typography.labelCustom) {
    labelCSS += ' font-family: "' + (typography.labelFont || 'Open Sans') + '", sans-serif !important; font-size: ' + (typography.labelSize || 14) + 'px !important;';
  }
  css += '.cap-options-wrapper .cap-label, .form__label { ' + labelCSS + ' }\n';

  css += '.cap-options-wrapper .cap-required { color: ' + (colors.requiredCharacter || 'red') + ' !important; }\n';

  var helpCSS = 'color: ' + (colors.helpText || '#666') + ' !important;';
  if (typography.helpCustom) {
    helpCSS += ' font-family: "' + (typography.helpFont || 'Open Sans') + '", sans-serif !important; font-size: ' + (typography.helpSize || 14) + 'px !important;';
  }
  css += '.cap-options-wrapper .cap-help-text { ' + helpCSS + ' }\n';

  var addonCSS = 'color: ' + (colors.totalText || '#202223') + ' !important;';
  if (typography.addonCustom) {
    addonCSS += ' font-family: "' + (typography.addonFont || 'Open Sans') + '", sans-serif !important; font-size: ' + (typography.addonSize || 14) + 'px !important;';
  }
  css += '.cap-options-wrapper .cap-addon-total-message { ' + addonCSS + ' }\n';
  css += '.cap-options-wrapper .cap-addon-total-message span { color: ' + (colors.totalTextMoney || '#008000') + ' !important; }\n';

  // Single Input
  css += '.cap-options-wrapper .cap-input { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding: 8px 12px !important; border-width: ' + (borders.inputSize !== undefined ? borders.inputSize : 1) + 'px !important; border-style: solid !important; border-radius: ' + (borders.inputRadius !== undefined ? borders.inputRadius : 4) + 'px !important; color: ' + (colors.inputText || '#111827') + ' !important; border-color: ' + (colors.inputBorder || '#d1d5db') + ' !important; background-color: ' + (colors.inputBackground || '#ffffff') + ' !important; }\n';
  css += '.cap-options-wrapper .cap-switch-track { background-color: ' + (colors.switchBackground || '#dddddd') + ' !important; }\n';
  css += '.cap-options-wrapper input:checked + .cap-switch-track { background-color: ' + (colors.switchActiveBackground || '#ea1255') + ' !important; }\n';

  // Choice List (Dropdowns)
  var ddText = colors.dropdownText || colors.inputText || '#111827';
  var ddBorder = colors.dropdownBorder || colors.inputBorder || '#d1d5db';
  var ddBg = colors.dropdownBackground || colors.inputBackground || '#ffffff';
  var ddSel = colors.dropdownSelected || '#f8e0e6';
  css += '.cap-options-wrapper .cap-select, .cap-options-wrapper .cap-image-dropdown-selected, .cap-options-wrapper .cap-color-dropdown-selected { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding: 8px 12px !important; border-width: ' + (borders.dropdownSize !== undefined ? borders.dropdownSize : 1) + 'px !important; border-style: solid !important; border-radius: ' + (borders.dropdownRadius !== undefined ? borders.dropdownRadius : 4) + 'px !important; }\n';
  css += '.cap-options-wrapper .cap-select, .cap-options-wrapper .cap-image-dropdown-selected, .cap-options-wrapper .cap-color-dropdown-selected, .cap-options-wrapper .cap-image-dropdown-item, .cap-options-wrapper .cap-color-dropdown-item { color: ' + ddText + ' !important; background-color: ' + ddBg + ' !important; }\n';
  css += '.cap-options-wrapper .cap-select, .cap-options-wrapper .cap-image-dropdown-selected, .cap-options-wrapper .cap-color-dropdown-selected, .cap-options-wrapper .cap-image-dropdown-list, .cap-options-wrapper .cap-color-dropdown-list { border-color: ' + ddBorder + ' !important; }\n';
  css += '.cap-options-wrapper .cap-image-dropdown-item:hover, .cap-options-wrapper .cap-color-dropdown-item:hover { background-color: ' + ddSel + ' !important; }\n';

  // Choice List (Radio/Checkbox)
  css += '.cap-options-wrapper .cap-radio-option, .cap-options-wrapper .cap-checkbox-option { color: ' + (colors.checkboxRadioText || '#111827') + ' !important; }\n';
  css += '.cap-options-wrapper .cap-radio-option:hover, .cap-options-wrapper .cap-checkbox-option:hover { color: ' + (colors.checkboxRadioTextHover || '#111827') + ' !important; }\n';
  css += '.cap-options-wrapper input[type="radio"]:hover, .cap-options-wrapper input[type="checkbox"]:hover { accent-color: ' + (colors.checkboxRadioHover || '#eb1256') + ' !important; }\n';
  css += '.cap-options-wrapper input[type="radio"]:checked, .cap-options-wrapper input[type="checkbox"]:checked { accent-color: ' + (colors.checkboxRadioActive || '#eb1256') + ' !important; }\n';
  css += '.cap-options-wrapper .cap-radio-option input:checked ~ span, .cap-options-wrapper .cap-checkbox-option input:checked ~ span { color: ' + (colors.checkboxRadioTextActive || '#111827') + ' !important; }\n';

  // Swatches
  var btnText = colors.buttonText || '#111827';
  var btnBg = colors.buttonBackground || '#ffffff';
  var btnTextHov = colors.buttonTextHover || '#eb1256';
  var btnBgHov = colors.buttonBackgroundHover || '#ffffff';
  var btnTextAct = colors.buttonTextActive || '#ffffff';
  var btnBgAct = colors.buttonBackgroundActive || '#eb1256';

  var swB = colors.swatchBorder || '#dddddd';
  var swBHov = colors.swatchBorderHover || '#dddddd';
  var swBAct = colors.swatchBorderActive || '#eb1256';

  var swSize = borders.swatchSize !== undefined ? borders.swatchSize : 1;
  var swRad = borders.swatchRadius !== undefined ? borders.swatchRadius : 4;

  // Base state
  css += '.cap-options-wrapper .cap-button-swatch { color: ' + btnText + ' !important; background-color: ' + btnBg + ' !important; border-color: ' + swB + ' !important; border-width: ' + swSize + 'px !important; border-radius: ' + swRad + 'px !important; }\n';
  css += '.cap-options-wrapper .cap-color-swatch, .cap-options-wrapper .cap-image-swatch { border-color: ' + swB + ' !important; border-width: ' + swSize + 'px !important; border-radius: ' + swRad + 'px !important; border-style: solid !important; }\n';

  // Hover state
  css += '.cap-options-wrapper .cap-button-swatch:hover { color: ' + btnTextHov + ' !important; background-color: ' + btnBgHov + ' !important; border-color: ' + swBHov + ' !important; }\n';
  css += '.cap-options-wrapper .cap-color-swatch:hover, .cap-options-wrapper .cap-image-swatch:hover { border-color: ' + swBHov + ' !important; }\n';

  // Active/Selected state
  css += '.cap-options-wrapper .cap-button-swatch.cap-selected { color: ' + btnTextAct + ' !important; background-color: ' + btnBgAct + ' !important; border-color: ' + swBAct + ' !important; }\n';
  css += '.cap-options-wrapper .cap-color-swatch.cap-selected, .cap-options-wrapper .cap-image-swatch.cap-selected { border-color: ' + swBAct + ' !important; }\n';

  style.innerHTML = css;
  wrapper.appendChild(style);
}

/* ─── Form Injection & Validation ────────────────────────────── */

function validateCustomOptions() {
  var isValid = true;
  var firstErrorEl = null;

  var wrapper = document.querySelector('.cap-options-wrapper');
  if (!wrapper) return true;

  // Clear previous errors
  wrapper.querySelectorAll('.cap-error').forEach(function (msg) { msg.classList.remove('visible'); });
  wrapper.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });

  wrapper.querySelectorAll('.cap-option-group').forEach(function (group) {
    if (group.style.display === 'none') return;
    var isRequired = group.getAttribute('data-required') === 'true';
    var type = group.getAttribute('data-type');
    var isGroupValid = true;
    var errorMessage = 'This field is required';

    if (['Text', 'Textarea', 'Number', 'Email', 'Phone', 'Datetime', 'Dropdown', 'Select', 'Color Dropdown', 'Image Dropdown'].indexOf(type) !== -1) {
      var input = group.querySelector('input, select, textarea');
      var hasValue = input && input.value && input.value.trim() !== '';

      if (isRequired && !hasValue) {
        isGroupValid = false;
        if (input) {
          input.classList.add('error');
          if (type === 'Color Dropdown' || type === 'Image Dropdown') {
            var customSelect = group.querySelector('.cap-color-dropdown-selected, .cap-image-dropdown-selected');
            if (customSelect) customSelect.classList.add('error');
          }
        }
      } else if (hasValue && type === 'Email') {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
          isGroupValid = false;
          errorMessage = 'Please enter a valid email address.';
          if (input) input.classList.add('error');
        }
      }
    } else if (['Radio Button', 'Color Swatch', 'Image Swatch', 'Button', 'Variant Fetcher', 'Variant_fetcher', 'variant fetcher', 'Color Picker', 'Hidden Field'].indexOf(type) !== -1 || (type && type.toLowerCase() === 'variant fetcher')) {
      var hiddenInput = group.querySelector('input[type="hidden"]:not([name="properties[_skipped_options]"])');
      if (isRequired && (!hiddenInput || !hiddenInput.value)) {
        isGroupValid = false;
        var swatchGroup = group.querySelector('.cap-swatch-group, .cap-radio-group, .cap-vf-options');
        if (swatchGroup) swatchGroup.classList.add('error');
      }
    } else if (type === 'Switch') {
      var hiddenInput = group.querySelector('input[type="hidden"]');
      if (isRequired && (!hiddenInput || hiddenInput.value !== 'true')) {
        isGroupValid = false;
        var switchWrap = group.querySelector('.cap-switch-wrap');
        if (switchWrap) switchWrap.classList.add('error');
      }
    } else if (type === 'Bundle') {
      var hiddenInput = group.querySelector('input[type="hidden"]');
      if (isRequired && (!hiddenInput || !hiddenInput.value || hiddenInput.value === '[]')) {
        isGroupValid = false;
      }
    } else if (type === 'Checkbox') {
      var checked = group.querySelectorAll('input[type="checkbox"]:checked');
      if (isRequired && checked.length === 0) {
        isGroupValid = false;
        var checkboxGroup = group.querySelector('.cap-checkbox-group');
        if (checkboxGroup) checkboxGroup.classList.add('error');
      }
    } else if (type === 'File Upload') {
      var fileInput = group.querySelector('input[type="file"]');
      if (isRequired && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
        isGroupValid = false;
      }
    }

    if (!isGroupValid) {
      isValid = false;
      var errorMsgEl = group.querySelector('.cap-error');
      if (errorMsgEl) {
        errorMsgEl.textContent = errorMessage;
        errorMsgEl.classList.add('visible');
      }
      if (!firstErrorEl) firstErrorEl = group;
    }
  });

  wrapper.querySelectorAll('.cap-option-group[data-type="Checkbox"]').forEach(function (group) {
    if (group.style.display === 'none') return;
    var checked = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(function (cb) { return cb.value; });
    var hiddenInput = group.querySelector('input[type="hidden"]');
    if (hiddenInput) hiddenInput.value = checked.join(', ');
  });

  if (!isValid && firstErrorEl) {
    var toggleStates = getToggleStates();
    if (toggleStates.autoScroll !== false) {
      setTimeout(function () {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }

  return isValid;
}

function injectIntoCartForm(wrapper, container) {
  var cartForm = container.closest('form[action*="/cart/add"], form');

  if (!cartForm) {
    // Traverse up to find the closest product section form
    var parent = container.parentElement;
    while (parent && !cartForm) {
      cartForm = parent.querySelector('form[action*="/cart/add"]');
      parent = parent.parentElement;
    }
  }

  if (!cartForm) {
    var possibleFormSelectors = [
      'form[action*="/cart/add"]',
      'form[action="/cart/add"]',
      'form[action$="/cart/add"]',
      'form[action="/cart/add.js"]',
      'form.product-form',
      'form.cart',
      'form[data-type="add-to-cart-form"]'
    ];
    for (var i = 0; i < possibleFormSelectors.length; i++) {
      cartForm = document.querySelector(possibleFormSelectors[i]);
      if (cartForm) break;
    }
  }

  var appSettings = capConfig.settings || {};
  if (!appSettings || Object.keys(appSettings).length === 0) {
    var settingsAttr = container.getAttribute('data-app-settings');
    if (settingsAttr) {
      try {
        appSettings = JSON.parse(settingsAttr);
        if (typeof appSettings === 'string') appSettings = JSON.parse(appSettings);
      } catch (e) { console.warn("Pistalix: container settings parse failed", e); }
    }
  }

  var position = appSettings.position || "Above add to cart button";
  var customSelector = appSettings.customSelector;

  if (position.includes("HTML element") && customSelector) {
    var targetEl = document.querySelector(customSelector);
    if (targetEl) {
      if (position === "Above an HTML element") targetEl.before(wrapper);
      else if (position === "Below an HTML element") targetEl.after(wrapper);
      else if (position === "At the start of an HTML element") targetEl.prepend(wrapper);
      else if (position === "At the end of HTML element") targetEl.append(wrapper);
      else targetEl.before(wrapper); // Fallback
    } else {
      // Fallback if selector not found
      if (cartForm) cartForm.appendChild(wrapper);
      else document.body.appendChild(wrapper);
    }
  } else if (position.includes("product variants")) {
    var variantWrappers = cartForm ? cartForm.querySelectorAll('variant-selects, variant-radios, .product-variant-picker, .selector-wrapper') : null;
    if (!variantWrappers || variantWrappers.length === 0) {
      variantWrappers = document.querySelectorAll('variant-selects, variant-radios, .product-variant-picker, .selector-wrapper');
    }

    // Fallback to individual inputs only if no outer wrapper is found
    if (!variantWrappers || variantWrappers.length === 0) {
      variantWrappers = cartForm ? cartForm.querySelectorAll('.product-form__input') : null;
      if (!variantWrappers || variantWrappers.length === 0) {
        variantWrappers = document.querySelectorAll('.product-form__input');
      }
    }

    if (variantWrappers && variantWrappers.length > 0) {
      if (position === "Above product variants") {
        variantWrappers[0].before(wrapper);
      } else {
        variantWrappers[variantWrappers.length - 1].after(wrapper);
      }
    } else {
      // Fallback
      if (cartForm) cartForm.appendChild(wrapper);
      else document.body.appendChild(wrapper);
    }
  } else {
    // Default to cart buttons
    if (cartForm) {
      var submitBtn = cartForm.querySelector('button[type="submit"], input[type="submit"], [name="add"]');
      if (submitBtn && submitBtn.parentNode) {
        if (position === "Below add to cart button") {
          submitBtn.parentNode.insertBefore(wrapper, submitBtn.nextSibling);
        } else {
          submitBtn.parentNode.insertBefore(wrapper, submitBtn); // Above
        }
      } else {
        cartForm.appendChild(wrapper);
      }
    } else {
      document.body.appendChild(wrapper);
    }
  }

  // Fallback: Bind all inputs explicitly to this form via HTML5 'form' attribute
  if (cartForm) {
    var formId = cartForm.getAttribute('id');
    if (formId) {
      wrapper.setAttribute('data-form-id', formId);
      var bindInputs = function () {
        wrapper.querySelectorAll('input, select, textarea').forEach(function (inp) {
          inp.setAttribute('form', formId);
        });
      };
      bindInputs();
      // Re-bind when dynamically adding hidden price inputs later
      var observer = new MutationObserver(bindInputs);
      observer.observe(wrapper, { childList: true, subtree: true });
    }

    var submitHandler = function (e) {
      if (!validateCustomOptions()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      
      if (wrapper) {
        var hiddenInputs = wrapper.querySelectorAll('input[type="hidden"]');
        hiddenInputs.forEach(function(inp) {
          if (inp.name) {
            var existing = cartForm.querySelector('input[name="' + inp.name + '"]');
            if (!existing) {
              var clone = document.createElement('input');
              clone.type = 'hidden';
              clone.name = inp.name;
              clone.value = inp.value;
              clone.className = 'cap-injected-hidden';
              cartForm.appendChild(clone);
            } else {
              existing.value = inp.value;
            }
          }
        });
      }
    };

    cartForm.addEventListener('submit', submitHandler, true);

    var submitBtn = cartForm.querySelector('button[type="submit"], input[type="submit"], [name="add"], .add-to-cart');
    if (submitBtn) {
      submitBtn.addEventListener('click', function (e) {
        if (!validateCustomOptions()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      }, true);
    }
  }

  // Force-inject properties into cart/add fetch requests to bypass any theme serialization quirks
  if (!window.pistalixFetchIntercepted) {
    window.pistalixFetchIntercepted = true;
    var originalFetch = window.fetch;
    window.fetch = function () {
      var urlArg = arguments[0];
      var urlStr = typeof urlArg === 'string' ? urlArg : (urlArg && urlArg.url ? urlArg.url : '');
      var config = arguments[1];
      if (urlStr && urlStr.indexOf('/cart/add') !== -1) {
        if (!validateCustomOptions()) {
          return Promise.reject(new Error("Required options are missing."));
        }
        if (config && config.body) {
          var wrapperEl = null;
          if (window.pistalixLastSubmittedForm) {
            wrapperEl = window.pistalixLastSubmittedForm.querySelector('.cap-options-wrapper');
          }
          if (!wrapperEl) {
            wrapperEl = document.querySelector('.cap-options-wrapper');
          }
          if (wrapperEl) {
            var inputs = wrapperEl.querySelectorAll('[name^="properties["]');
            if (config.body instanceof FormData) {
              inputs.forEach(function (inp) {
                if (inp.type === 'radio' && !inp.checked) return;
                if (inp.type === 'checkbox' && !inp.checked) return;
                if (inp.disabled) return;
                var _grp = inp.closest('.cap-option-group');
                if (_grp && _grp.style.display === 'none') return;
                if (inp.type === 'file') {
                  if (inp.files && inp.files.length > 0) {
                    if (inp.files.length === 1) {
                      config.body.set(inp.name, inp.files[0]);
                    } else {
                      for (var k = 0; k < inp.files.length; k++) {
                        var arrName = inp.name.replace(']', ' ' + (k + 1) + ']');
                        config.body.set(arrName, inp.files[k]);
                      }
                    }
                  }
                } else if (inp.value) {
                  config.body.set(inp.name, inp.value);
                }
              });
            } else if (typeof config.body === 'string') {
              if (config.body.trim().indexOf('{') === 0) {
                try {
                  var json = JSON.parse(config.body);
                  if (json.items && Array.isArray(json.items) && json.items.length > 0) {
                    json.items[0].properties = json.items[0].properties || {};
                    inputs.forEach(function (inp) {
                      if (inp.type === 'radio' && !inp.checked) return;
                      if (inp.type === 'checkbox' && !inp.checked) return;
                      if (inp.disabled) return;
                      var _grp = inp.closest('.cap-option-group');
                      if (_grp && _grp.style.display === 'none') return;
                      if (inp.value) {
                        var propMatch = inp.name.match(/properties\[(.*?)\]/);
                        if (propMatch && propMatch[1]) {
                          json.items[0].properties[propMatch[1]] = inp.value;
                        }
                      }
                    });
                  } else {
                    if (!json.properties) json.properties = {};
                    inputs.forEach(function (inp) {
                      if (inp.type === 'radio' && !inp.checked) return;
                      if (inp.type === 'checkbox' && !inp.checked) return;
                      if (inp.disabled) return;
                      var _grp = inp.closest('.cap-option-group');
                      if (_grp && _grp.style.display === 'none') return;
                      if (inp.value) {
                        var propMatch = inp.name.match(/properties\[(.*?)\]/);
                        if (propMatch && propMatch[1]) {
                          json.properties[propMatch[1]] = inp.value;
                        }
                      }
                    });
                  }
                  config.body = JSON.stringify(json);
                } catch (e) {
                  console.warn("Pistalix: Fetch JSON parse failed", e);
                }
              } else {
                try {
                  var params = new URLSearchParams(config.body);
                  inputs.forEach(function (inp) {
                    if (inp.type === 'radio' && !inp.checked) return;
                    if (inp.type === 'checkbox' && !inp.checked) return;
                    if (inp.disabled) return;
                    var _grp = inp.closest('.cap-option-group');
                    if (_grp && _grp.style.display === 'none') return;
                    if (inp.value) {
                      params.set(inp.name, inp.value);
                    }
                  });
                  config.body = params.toString();
                } catch (e) {
                  console.warn("Pistalix: Fetch query string parse failed", e);
                }
              }
            }
          }
        }
      }
      return originalFetch.apply(window, arguments).then(function (response) {
        return response;
      });
    };
  }

  // Intercept XMLHttpRequest to handle Axios/jQuery cart submit calls
  if (!window.pistalixXhrIntercepted) {
    window.pistalixXhrIntercepted = true;
    var originalOpen = window.XMLHttpRequest.prototype.open;
    var originalSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (method, url) {
      this._url = url;
      return originalOpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.send = function (body) {
      if (this._url && typeof this._url === 'string' && this._url.indexOf('/cart/add') !== -1) {
        if (!validateCustomOptions()) {
          var self = this;
          setTimeout(function () {
            self.dispatchEvent(new Event('error'));
          }, 0);
          return;
        }

        // Inject properties into the body
        var wrapperEl = null;
        if (window.pistalixLastSubmittedForm) {
          wrapperEl = window.pistalixLastSubmittedForm.querySelector('.cap-options-wrapper');
        }
        if (!wrapperEl) {
          wrapperEl = document.querySelector('.cap-options-wrapper');
        }
        if (wrapperEl && body) {
          var inputs = wrapperEl.querySelectorAll('[name^="properties["]');
          if (body instanceof FormData) {
            inputs.forEach(function (inp) {
              if (inp.type === 'radio' && !inp.checked) return;
              if (inp.type === 'checkbox' && !inp.checked) return;
              if (inp.disabled) return;
              var _grp = inp.closest('.cap-option-group');
              if (_grp && _grp.style.display === 'none') return;
              if (inp.type === 'file') {
                if (inp.files && inp.files.length > 0) {
                  if (inp.files.length === 1) {
                    body.set(inp.name, inp.files[0]);
                  } else {
                    for (var k = 0; k < inp.files.length; k++) {
                      var arrName = inp.name.replace(']', ' ' + (k + 1) + ']');
                      body.set(arrName, inp.files[k]);
                    }
                  }
                }
              } else if (inp.value) {
                body.set(inp.name, inp.value);
              }
            });
          } else if (typeof body === 'string') {
            if (body.trim().indexOf('{') === 0) {
              try {
                var json = JSON.parse(body);
                if (json.items && Array.isArray(json.items) && json.items.length > 0) {
                  json.items[0].properties = json.items[0].properties || {};
                  inputs.forEach(function (inp) {
                    if (inp.type === 'radio' && !inp.checked) return;
                    if (inp.type === 'checkbox' && !inp.checked) return;
                    if (inp.disabled) return;
                    var _grp = inp.closest('.cap-option-group');
                    if (_grp && _grp.style.display === 'none') return;
                    if (inp.value) {
                      var propMatch = inp.name.match(/properties\[(.*?)\]/);
                      if (propMatch && propMatch[1]) {
                        json.items[0].properties[propMatch[1]] = inp.value;
                      }
                    }
                  });
                } else {
                  if (!json.properties) json.properties = {};
                  inputs.forEach(function (inp) {
                    if (inp.type === 'radio' && !inp.checked) return;
                    if (inp.type === 'checkbox' && !inp.checked) return;
                    if (inp.disabled) return;
                    var _grp = inp.closest('.cap-option-group');
                    if (_grp && _grp.style.display === 'none') return;
                    if (inp.value) {
                      var propMatch = inp.name.match(/properties\[(.*?)\]/);
                      if (propMatch && propMatch[1]) {
                        json.properties[propMatch[1]] = inp.value;
                      }
                    }
                  });
                }
                body = JSON.stringify(json);
              } catch (e) {
                console.warn("Pistalix: XHR JSON parse failed", e);
              }
            } else {
              try {
                var params = new URLSearchParams(body);
                inputs.forEach(function (inp) {
                  if (inp.type === 'radio' && !inp.checked) return;
                  if (inp.type === 'checkbox' && !inp.checked) return;
                  if (inp.disabled) return;
                  var _grp = inp.closest('.cap-option-group');
                  if (_grp && _grp.style.display === 'none') return;
                  if (inp.value) {
                    params.set(inp.name, inp.value);
                  }
                });
                body = params.toString();
              } catch (e) {
                console.warn("Pistalix: XHR query string parse failed", e);
              }
            }
          }
        }
      }

      var self = this;
      this.addEventListener('load', function () {
        // goToCart logic removed
      });

      return originalSend.call(this, body);
    };
  }
}

/* ─── Element Renderers ──────────────────────────────────────── */

function renderText(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var input = document.createElement('input');
  input.type = element.type === 'Email' ? 'email' : (element.type === 'Phone' ? 'tel' : 'text');
  input.name = propName(element.label);
  input.className = 'cap-input';
  if (config.placeholder) input.placeholder = config.placeholder;
  if (config.defaultValue) input.value = config.defaultValue;
  if (config.maxCharacter) input.maxLength = parseInt(config.maxCharacter, 10);
  if (config.minCharacter) input.minLength = parseInt(config.minCharacter, 10);

  // Apply textTransform
  if (config.textTransform === "Uppercase" || config.textTransform === "Lowercase" || config.textTransform === "Capitalize") {
    if (config.textTransform === "Uppercase") input.style.textTransform = "uppercase";
    else if (config.textTransform === "Lowercase") input.style.textTransform = "lowercase";
    else if (config.textTransform === "Capitalize") input.style.textTransform = "capitalize";

    input.addEventListener('change', function () {
      if (config.textTransform === "Uppercase") this.value = this.value.toUpperCase();
      else if (config.textTransform === "Lowercase") this.value = this.value.toLowerCase();
      else if (config.textTransform === "Capitalize") {
        this.value = this.value.replace(/\b\w/g, function (l) { return l.toUpperCase(); });
      }
    });
  }

  // Apply allowedValue
  if (config.allowedValue === "Letters" || config.allowedValue === "Letters & numbers") {
    input.addEventListener('input', function () {
      var regex = config.allowedValue === "Letters" ? /[^a-zA-Z\s]/g : /[^a-zA-Z0-9\s]/g;
      var newVal = this.value.replace(regex, "");
      if (newVal !== this.value) {
        this.value = newVal;
      }
    });
  }



  var p = parseFloat(config.price);
  if (!isNaN(p) && p > 0) {
    input.setAttribute('data-price', Math.round(p * 100));
    if (config.chargePerCharacter) input.setAttribute('data-charge-per-char', 'true');
  }

  // Prefix / Suffix wrapper
  if ((config.prefixType === "Text" && config.prefixText) || config.suffix) {
    var wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';

    if (config.prefixType === "Text" && config.prefixText) {
      var prefix = document.createElement('span');
      prefix.textContent = config.prefixText;
      prefix.style.paddingRight = '8px';
      prefix.style.color = 'var(--p-color-text-subdued, #666)';
      wrapper.appendChild(prefix);
    }

    input.style.flex = '1';
    wrapper.appendChild(input);

    if (config.suffix) {
      var suffix = document.createElement('span');
      suffix.textContent = config.suffix;
      suffix.style.paddingLeft = '8px';
      suffix.style.color = 'var(--p-color-text-subdued, #666)';
      wrapper.appendChild(suffix);
    }

    group.appendChild(wrapper);
  } else {
    group.appendChild(input);
  }

  var maxL = config.maxCharacter;
  var showCount = config.characterCounter === true || String(config.characterCounter) === 'true';
  if (showCount) {
    var counter = document.createElement('div');
    counter.className = 'cap-character-counter';
    counter.style.textAlign = 'right';
    counter.style.color = 'var(--p-color-text-subdued, #666)';
    counter.style.fontSize = '13px';
    counter.style.marginTop = '4px';

    var updateCounter = function () {
      var len = input.value.length;
      counter.textContent = maxL ? len + '/' + maxL + ' characters' : len + ' characters';
    };
    updateCounter();
    input.addEventListener('input', updateCounter);
    group.appendChild(counter);
  }

  group.appendChild(createErrorMsg());
  return group;
}

function renderFile(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);

  var wrapper = document.createElement('div');
  wrapper.className = 'cap-file-wrapper';

  var input = document.createElement('input');
  input.type = 'file';
  input.name = propName(element.label);
  input.className = 'cap-file-hidden-input';
  input.style.display = 'none';

  if (config.allowedExtensions) {
    input.accept = config.allowedExtensions;
  }
  var maxFiles = parseInt(config.maxFiles, 10) || 1;
  if (maxFiles > 1) {
    input.multiple = true;
  }
  var maxSizeMB = parseInt(config.maxSizeMB, 10) || 10;
  var maxSizeBytes = maxSizeMB * 1024 * 1024;

  var p = parseFloat(config.price);
  if (!isNaN(p) && p > 0) {
    input.setAttribute('data-price', Math.round(p * 100));
  }

  var dropzone = document.createElement('label');
  dropzone.className = 'cap-file-dropzone';
  dropzone.style.cssText = 'display: block; cursor: pointer;';

  var dropzoneInner = document.createElement('div');
  dropzoneInner.style.cssText = 'border: 1px dashed #8C9196; padding: 32px 20px; text-align: center; border-radius: 4px; background-color: #FFFFFF; cursor: pointer; transition: all 0.2s ease;';

  dropzoneInner.innerHTML = '<div style="display: flex; flex-direction: column; gap: 8px; align-items: center;"><div style="background-color: #E8F0FA; padding: 6px 14px; border-radius: 4px; display: inline-block; color: #1F5199; font-weight: 600; font-size: 14px;">Choose file</div><p style="margin: 0; color: #6d7175; font-size: 14px;">or drop file to upload</p></div>';

  // Screen reader hidden text
  var srOnly = document.createElement('span');
  srOnly.style.cssText = 'border: 0; clip: rect(0 0 0 0); height: 1px; margin: -1px; overflow: hidden; padding: 0; position: absolute; width: 1px;';
  srOnly.textContent = 'Upload ' + element.label;
  dropzone.appendChild(srOnly);

  // We place the input inside the label so clicking the label opens the file dialog
  dropzone.appendChild(input);
  dropzone.appendChild(dropzoneInner);

  // Drag and drop events on the inner div
  dropzoneInner.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropzoneInner.style.backgroundColor = '#F4F6F8';
  });
  dropzoneInner.addEventListener('dragleave', function (e) {
    e.preventDefault();
    dropzoneInner.style.backgroundColor = '#FFFFFF';
  });
  dropzoneInner.addEventListener('drop', function (e) {
    e.preventDefault();
    dropzoneInner.style.backgroundColor = '#FFFFFF';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Success state UI (matches App)
  var successWrap = document.createElement('div');
  successWrap.className = 'cap-file-success-wrap';
  successWrap.style.cssText = 'display: none; background-color: #3371C8; padding: 12px; border-radius: 4px; align-items: center; justify-content: space-between; animation: fadeInUpload 0.4s cubic-bezier(0.16, 1, 0.3, 1);';

  var successLeft = document.createElement('div');
  successLeft.style.cssText = 'display: flex; align-items: center; gap: 16px; overflow: hidden;';

  var previewBox = document.createElement('div');
  previewBox.style.cssText = 'width: 48px; height: 56px; background-color: white; padding: 3px; border-radius: 2px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;';

  var infoBox = document.createElement('div');
  infoBox.style.cssText = 'overflow: hidden;';
  var fileNameEl = document.createElement('p');
  fileNameEl.style.cssText = 'margin: 0; font-size: 14px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
  var fileSizeEl = document.createElement('p');
  fileSizeEl.style.cssText = 'margin: 0; font-size: 12px; color: white;';

  infoBox.appendChild(fileNameEl);
  infoBox.appendChild(fileSizeEl);

  successLeft.appendChild(previewBox);
  successLeft.appendChild(infoBox);

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.style.cssText = 'width: 28px; height: 28px; border-radius: 50%; background-color: white; color: #3371C8; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; padding: 0; flex-shrink: 0; margin-left: 12px;';
  removeBtn.textContent = '✕';

  removeBtn.addEventListener('click', function (e) {
    e.preventDefault();
    input.value = '';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  successWrap.appendChild(successLeft);
  successWrap.appendChild(removeBtn);

  // Add keyframes for animation if not already present
  if (!document.getElementById('cap-file-animations')) {
    var style = document.createElement('style');
    style.id = 'cap-file-animations';
    style.innerHTML = '@keyframes fadeInUpload { 0% { opacity: 0; transform: scale(0.98) translateY(5px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }';
    document.head.appendChild(style);
  }

  // Handle file change
  input.addEventListener('change', function (e) {
    var errorMsg = group.querySelector('.cap-error');
    if (errorMsg) errorMsg.style.display = 'none';

    var files = e.target.files;
    if (!files || files.length === 0) {
      dropzone.style.display = 'block';
      successWrap.style.display = 'none';
      updateTotalPrice();
      return;
    }

    // Validation
    if (files.length > maxFiles) {
      if (errorMsg) {
        errorMsg.textContent = "Maximum " + maxFiles + " files allowed.";
        errorMsg.style.display = 'block';
      }
      input.value = "";
      dropzone.style.display = 'block';
      successWrap.style.display = 'none';
      return;
    }

    for (var i = 0; i < files.length; i++) {
      if (files[i].size > maxSizeBytes) {
        if (errorMsg) {
          errorMsg.textContent = "File " + files[i].name + " is too large. Max size is " + maxSizeMB + "MB.";
          errorMsg.style.display = 'block';
        }
        input.value = "";
        dropzone.style.display = 'block';
        successWrap.style.display = 'none';
        return;
      }
    }

    // Success and Preview
    var f = files[0];
    fileNameEl.textContent = f.name;
    fileSizeEl.textContent = (f.size / 1024 / 1024).toFixed(2) + ' MB';

    if (f.type.indexOf('image/') === 0) {
      var reader = new FileReader();
      reader.onload = function (evt) {
        previewBox.innerHTML = '<img src="' + evt.target.result + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 2px;" />';
      };
      reader.readAsDataURL(f);
    } else {
      previewBox.innerHTML = '<div style="width: 100%; height: 100%; background-color: #F4F6F8; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6d7175; border-radius: 2px;">FILE</div>';
    }

    dropzone.style.display = 'none';
    successWrap.style.display = 'flex';

    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateTotalPrice();
  });

  wrapper.appendChild(dropzone);
  wrapper.appendChild(successWrap);

  var allowedExtsText = document.createElement('p');
  allowedExtsText.style.cssText = 'margin: 8px 0 0; color: var(--p-color-text-subdued, #6d7175); font-size: 14px;';
  allowedExtsText.textContent = '(Allowed extension: ' + (config.allowedExtensions || '.jpeg, .jpg, .png, .webp, .svg') + ')';
  wrapper.appendChild(allowedExtsText);

  group.appendChild(wrapper);
  group.appendChild(createErrorMsg());
  return group;
}


function renderTextarea(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var textarea = document.createElement('textarea');
  textarea.name = propName(element.label);
  textarea.className = 'cap-input';
  textarea.rows = 4;
  if (config.placeholder) textarea.placeholder = config.placeholder;
  if (config.defaultValue) textarea.value = config.defaultValue;
  if (config.maxCharacter) textarea.maxLength = parseInt(config.maxCharacter, 10);
  if (config.minCharacter) textarea.minLength = parseInt(config.minCharacter, 10);

  // Apply textTransform
  if (config.textTransform === "Uppercase" || config.textTransform === "Lowercase" || config.textTransform === "Capitalize") {
    if (config.textTransform === "Uppercase") textarea.style.textTransform = "uppercase";
    else if (config.textTransform === "Lowercase") textarea.style.textTransform = "lowercase";
    else if (config.textTransform === "Capitalize") textarea.style.textTransform = "capitalize";

    textarea.addEventListener('change', function () {
      if (config.textTransform === "Uppercase") this.value = this.value.toUpperCase();
      else if (config.textTransform === "Lowercase") this.value = this.value.toLowerCase();
      else if (config.textTransform === "Capitalize") {
        this.value = this.value.replace(/\b\w/g, function (l) { return l.toUpperCase(); });
      }
    });
  }

  // Apply allowedValue
  if (config.allowedValue === "Letters" || config.allowedValue === "Letters & numbers") {
    textarea.addEventListener('input', function () {
      var regex = config.allowedValue === "Letters" ? /[^a-zA-Z\s]/g : /[^a-zA-Z0-9\s]/g;
      var newVal = this.value.replace(regex, "");
      if (newVal !== this.value) {
        this.value = newVal;
      }
    });
  }



  var p = parseFloat(config.price);
  if (!isNaN(p) && p > 0) {
    textarea.setAttribute('data-price', Math.round(p * 100));
    if (config.chargePerCharacter) textarea.setAttribute('data-charge-per-char', 'true');
  }

  // Prefix / Suffix wrapper
  if ((config.prefixType === "Text" && config.prefixText) || config.suffix) {
    var wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'flex-start';

    if (config.prefixType === "Text" && config.prefixText) {
      var prefix = document.createElement('span');
      prefix.textContent = config.prefixText;
      prefix.style.paddingRight = '8px';
      prefix.style.paddingTop = '8px';
      prefix.style.color = 'var(--p-color-text-subdued, #666)';
      wrapper.appendChild(prefix);
    }

    textarea.style.flex = '1';
    wrapper.appendChild(textarea);

    if (config.suffix) {
      var suffix = document.createElement('span');
      suffix.textContent = config.suffix;
      suffix.style.paddingLeft = '8px';
      suffix.style.paddingTop = '8px';
      suffix.style.color = 'var(--p-color-text-subdued, #666)';
      wrapper.appendChild(suffix);
    }

    group.appendChild(wrapper);
  } else {
    group.appendChild(textarea);
  }

  var maxL = config.maxCharacter;
  var showCount = config.characterCounter === true || String(config.characterCounter) === 'true';
  if (showCount) {
    var counter = document.createElement('div');
    counter.className = 'cap-character-counter';
    counter.style.textAlign = 'right';
    counter.style.color = 'var(--p-color-text-subdued, #666)';
    counter.style.fontSize = '13px';
    counter.style.marginTop = '4px';

    var updateCounter = function () {
      var len = textarea.value.length;
      counter.textContent = maxL ? len + '/' + maxL + ' characters' : len + ' characters';
    };
    updateCounter();
    textarea.addEventListener('input', updateCounter);
    group.appendChild(counter);
  }

  group.appendChild(createErrorMsg());
  return group;
}

function renderNumber(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var input = document.createElement('input');
  input.type = 'number';
  input.name = propName(element.label);
  input.className = 'cap-input';
  if (config.placeholder) input.placeholder = config.placeholder;
  if (config.defaultValue) input.value = config.defaultValue;
  if (config.minValue !== undefined && config.minValue !== "") input.min = config.minValue;
  if (config.maxValue !== undefined && config.maxValue !== "") input.max = config.maxValue;

  var p = parseFloat(config.price);
  if (!isNaN(p) && p > 0) {
    input.setAttribute('data-price', Math.round(p * 100));
  }



  // Prefix / Suffix wrapper
  if ((config.prefixType === "Text" && config.prefixText) || config.suffix) {
    var wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';

    if (config.prefixType === "Text" && config.prefixText) {
      var prefix = document.createElement('span');
      prefix.textContent = config.prefixText;
      prefix.style.paddingRight = '8px';
      prefix.style.color = 'var(--p-color-text-subdued, #666)';
      wrapper.appendChild(prefix);
    }

    input.style.flex = '1';
    wrapper.appendChild(input);

    if (config.suffix) {
      var suffix = document.createElement('span');
      suffix.textContent = config.suffix;
      suffix.style.paddingLeft = '8px';
      suffix.style.color = 'var(--p-color-text-subdued, #666)';
      wrapper.appendChild(suffix);
    }

    group.appendChild(wrapper);
  } else {
    group.appendChild(input);
  }

  group.appendChild(createErrorMsg());
  return group;
}

function renderDate(element) {
  var group = createGroup(element);
  var input = document.createElement('input');
  input.type = 'datetime-local';
  input.name = propName(element.label);
  input.className = 'cap-input';
  group.appendChild(input);
  group.appendChild(createErrorMsg());
  return group;
}

function renderDropdown(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);



  var select = document.createElement('select');
  select.name = propName(element.label);
  select.className = 'cap-select';

  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select ' + element.label + ' --';
  select.appendChild(defaultOpt);

  choices.forEach(function (opt) {
    var option = document.createElement('option');
    option.value = opt.value || opt.label;
    option.textContent = getOptionLabel(opt);
    option.setAttribute('data-price', getOptionPriceCents(opt));
    if (isDefault(opt, config)) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', updateTotalPrice);
  group.appendChild(select);
  group.appendChild(createErrorMsg());
  return group;
}

function renderColorDropdown(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);

  var previewW = (config.swatchWidth || 50) + 'px';
  var previewH = (config.swatchHeight || 50) + 'px';
  var previewRadius = config.swatchShape === 'Square' ? '4px' : '50%';

  var layoutWrap = document.createElement('div');
  layoutWrap.className = 'cap-color-dropdown-layout';
  layoutWrap.style.display = 'flex';
  layoutWrap.style.alignItems = 'center';
  layoutWrap.style.gap = '8px';

  var colorPreview = document.createElement('div');
  colorPreview.className = 'cap-color-dropdown-left-preview';
  colorPreview.style.display = 'none';
  colorPreview.style.width = previewW;
  colorPreview.style.height = previewH;
  colorPreview.style.borderRadius = previewRadius;
  colorPreview.style.border = '1px solid #c9cccf';
  layoutWrap.appendChild(colorPreview);

  var dropdownWrap = document.createElement('div');
  dropdownWrap.className = 'cap-color-dropdown-wrap';
  dropdownWrap.style.flex = '1';
  dropdownWrap.style.position = 'relative';

  var selectedDisplay = document.createElement('div');
  selectedDisplay.className = 'cap-color-dropdown-selected';

  var selectedText = document.createElement('span');
  selectedText.textContent = '-- Select ' + element.label + ' --';
  selectedDisplay.appendChild(selectedText);

  // Removed redundant hiddenInput

  var select = document.createElement('select');
  select.className = 'cap-select cap-color-dropdown-select';
  select.name = propName(element.label);

  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select ' + element.label + ' --';
  select.appendChild(defaultOpt);

  choices.forEach(function (opt) {
    var option = document.createElement('option');
    option.value = opt.value || opt.label;
    option.textContent = getOptionLabel(opt);
    option.setAttribute('data-price', getOptionPriceCents(opt));
    if (isDefault(opt, config)) option.selected = true;
    select.appendChild(option);
  });

  var optionsList = document.createElement('div');
  optionsList.className = 'cap-color-dropdown-list';
  optionsList.style.display = 'none';

  choices.forEach(function (opt) {
    var item = document.createElement('div');
    item.className = 'cap-color-dropdown-item';

    var colorVal = opt.color || opt.value || '#ccc';
    var thumb = document.createElement('div');
    thumb.className = 'cap-color-dropdown-option-color';
    thumb.style.backgroundColor = colorVal;
    thumb.style.width = previewW;
    thumb.style.height = previewH;
    thumb.style.borderRadius = previewRadius;
    item.appendChild(thumb);

    var label = document.createElement('span');
    label.textContent = getOptionLabel(opt);
    item.setAttribute('data-price', getOptionPriceCents(opt));
    item.appendChild(label);

    item.addEventListener('click', function () {
      select.value = opt.value || opt.label;
      selectedText.textContent = getOptionLabel(opt);
      colorPreview.style.backgroundColor = colorVal;
      colorPreview.style.display = 'inline-block';
      optionsList.style.display = 'none';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      updateTotalPrice();
    });

    if (isDefault(opt, config)) {
      select.value = opt.value || opt.label;
      selectedText.textContent = getOptionLabel(opt);
      colorPreview.style.backgroundColor = colorVal;
      colorPreview.style.display = 'inline-block';
    }

    optionsList.appendChild(item);
  });

  selectedDisplay.addEventListener('click', function () {
    optionsList.style.display = optionsList.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', function (e) {
    if (!group.contains(e.target)) {
      optionsList.style.display = 'none';
    }
  });

  dropdownWrap.appendChild(selectedDisplay);
  dropdownWrap.appendChild(optionsList);

  layoutWrap.appendChild(dropdownWrap);

  group.appendChild(select);
  group.appendChild(layoutWrap);
  group.appendChild(createErrorMsg());
  return group;
}

function renderSwitch(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var defaultValue = config.defaultValue === true || String(config.defaultValue) === 'true';

  var colors = (capConfig.settings && capConfig.settings.colors) ? capConfig.settings.colors : {};
  var activeColor = colors.switchActiveBackground || '#ea1255';
  var inactiveColor = colors.switchBackground || '#dddddd';

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = defaultValue ? 'true' : 'false';

  var wrap = document.createElement('div');
  wrap.className = 'cap-switch-wrap';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '8px';

  var toggle = document.createElement('div');
  toggle.className = 'cap-switch-toggle';
  toggle.style.cssText = [
    'width:44px',
    'height:24px',
    'border-radius:12px',
    'background-color:' + (defaultValue ? activeColor : inactiveColor),
    'position:relative',
    'cursor:pointer',
    'transition:background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    'flex-shrink:0'
  ].join(';');

  var handle = document.createElement('div');
  handle.style.cssText = [
    'width:18px',
    'height:18px',
    'border-radius:50%',
    'background:#ffffff',
    'position:absolute',
    'top:3px',
    'left:' + (defaultValue ? '23px' : '3px'),
    'transition:left 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
    'box-shadow:0 1px 4px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
    'display:block',
    'z-index:2',
    'box-sizing:border-box',
    'margin:0',
    'padding:0',
    'border:none'
  ].join(';');

  toggle.appendChild(handle);
  wrap.appendChild(toggle);

  var labelText = document.createElement('span');
  labelText.className = 'cap-label-text cap-switch-label';
  labelText.style.fontSize = '14px';
  labelText.style.fontWeight = '500';
  labelText.textContent = defaultValue ? (config.labelOn || 'ON') : (config.labelOff || 'OFF');
  wrap.appendChild(labelText);

  toggle.addEventListener('click', function () {
    var isTrue = hiddenInput.value === 'true';
    if (isTrue) {
      hiddenInput.value = 'false';
      toggle.style.backgroundColor = inactiveColor;
      handle.style.left = '3px';
      labelText.textContent = config.labelOff || 'OFF';
    } else {
      hiddenInput.value = 'true';
      toggle.style.backgroundColor = activeColor;
      handle.style.left = '23px';
      labelText.textContent = config.labelOn || 'ON';
    }
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    updateTotalPrice();
  });

  group.appendChild(hiddenInput);
  group.appendChild(wrap);
  return group;
}


function renderBundle(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var bundleProducts = config.bundleProducts || [];

  if (bundleProducts.length === 0) {
    var emptyMsg = document.createElement('p');
    emptyMsg.textContent = 'No products in this bundle.';
    emptyMsg.style.cssText = 'color:#6d7175;font-size:14px;margin:0;';
    group.appendChild(emptyMsg);
    return group;
  }

  // Hidden input to store serialized bundle selections
  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = 'properties[_' + element.label + ']';
  hiddenInput.value = '';
  group.appendChild(hiddenInput);

  var bundleState = {};

  function updateBundleValue() {
    var selections = [];
    for (var key in bundleState) {
      if (bundleState[key]) {
        selections.push(bundleState[key]);
      }
    }
    hiddenInput.value = JSON.stringify(selections);
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    updateTotalPrice();
  }

  bundleProducts.forEach(function (product, pIdx) {
    var productCard = document.createElement('div');
    productCard.className = 'cap-bundle-product';
    productCard.style.cssText = [
      'padding:16px 0',
      'border-top:1px solid #e1e3e5',
    ].join(';');
    if (pIdx === 0) productCard.style.borderTop = 'none';

    // Product title
    var title = document.createElement('a');
    title.href = '/products/' + product.handle;
    title.target = '_blank';
    title.className = 'cap-label-text';
    title.textContent = product.title;
    title.style.cssText = 'display:block;color:inherit;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:8px;';
    productCard.appendChild(title);

    // Product image
    if (product.image) {
      var imgWrap = document.createElement('a');
      imgWrap.href = '/products/' + product.handle;
      imgWrap.target = '_blank';
      imgWrap.style.cssText = 'display:block;width:80px;height:80px;border:1px solid #e1e3e5;border-radius:8px;overflow:hidden;margin-bottom:8px;';
      var img = document.createElement('img');
      img.src = product.image;
      img.alt = product.title;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      imgWrap.appendChild(img);
      productCard.appendChild(imgWrap);
    }

    // Variant label area
    var variantLabel = document.createElement('div');
    variantLabel.className = 'cap-bundle-variant-label';
    variantLabel.style.cssText = 'font-size:13px;color:#6d7175;margin-bottom:6px;';
    productCard.appendChild(variantLabel);

    // Variant swatches container
    var swatchWrap = document.createElement('div');
    swatchWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    productCard.appendChild(swatchWrap);

    // Loading indicator
    var loadingEl = document.createElement('div');
    loadingEl.textContent = 'Loading variants...';
    loadingEl.style.cssText = 'font-size:13px;color:#8c9196;padding:4px 0;';
    swatchWrap.appendChild(loadingEl);

    // Fetch live variants from Shopify AJAX API
    var handle = product.handle;
    if (handle) {
      fetch('/products/' + handle + '.js')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          swatchWrap.innerHTML = '';
          var variants = data.variants || [];

          if (variants.length === 0) {
            var noVar = document.createElement('span');
            noVar.textContent = 'No variants available';
            noVar.style.cssText = 'font-size:13px;color:#8c9196;';
            swatchWrap.appendChild(noVar);
            return;
          }

          // Set first available variant as default
          var defaultVarIdx = 0;
          for (var i = 0; i < variants.length; i++) {
            if (variants[i].available) {
              defaultVarIdx = i;
              break;
            }
          }
          var firstVar = variants[defaultVarIdx];

          variantLabel.textContent = firstVar.title;
          bundleState[product.id] = {
            productId: product.id,
            productTitle: product.title,
            variantId: firstVar.id,
            variantTitle: firstVar.title,
            price: firstVar.price,
            available: firstVar.available
          };

          // Price hidden input for this product (to integrate with updateTotalPrice)
          var priceInput = document.createElement('input');
          priceInput.type = 'hidden';
          priceInput.className = 'cap-price-input';
          priceInput.setAttribute('data-price', firstVar.price);
          priceInput.setAttribute('data-available', firstVar.available !== false ? 'true' : 'false');
          priceInput.value = firstVar.title;
          priceInput.name = propName(product.title + ' variant');
          productCard.appendChild(priceInput);

          variants.forEach(function (variant, vIdx) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = variant.title;
            btn.className = 'cap-bundle-variant-btn';
            btn.style.cssText = [
              'padding:6px 16px',
              'border-radius:4px',
              'cursor:pointer',
              'font-size:13px',
              'font-weight:600',
              'transition:all 0.15s ease',
              'border:' + (vIdx === defaultVarIdx ? '2px solid #1a1a1a' : '1px solid #e1e3e5'),
              'background:' + (vIdx === defaultVarIdx ? '#1a1a1a' : '#fff'),
              'color:' + (vIdx === defaultVarIdx ? '#fff' : '#1a1a1a'),
            ].join(';');

            if (!variant.available) {
              btn.style.opacity = '0.4';
              btn.style.cursor = 'not-allowed';
              btn.style.textDecoration = 'line-through';
            }

            btn.addEventListener('click', function () {
              if (!variant.available) return;

              // Update all buttons in this swatch group
              var allBtns = swatchWrap.querySelectorAll('.cap-bundle-variant-btn');
              for (var b = 0; b < allBtns.length; b++) {
                allBtns[b].style.border = '1px solid #e1e3e5';
                allBtns[b].style.background = '#fff';
                allBtns[b].style.color = '#1a1a1a';
              }
              btn.style.border = '2px solid #1a1a1a';
              btn.style.background = '#1a1a1a';
              btn.style.color = '#fff';

              // Update variant label
              variantLabel.textContent = variant.title;

              // Update image if variant has one
              if (variant.featured_image && variant.featured_image.src && imgWrap) {
                var existingImg = imgWrap.querySelector('img');
                if (existingImg) existingImg.src = variant.featured_image.src;
              }

              // Update price tooltip
              var priceFmt = (variant.price / 100).toFixed(2);
              btn.title = variant.title + ' (+$' + priceFmt + ')';

              // Update hidden price input
              priceInput.setAttribute('data-price', variant.price);
              priceInput.setAttribute('data-available', variant.available !== false ? 'true' : 'false');
              priceInput.value = variant.title;

              // Update bundle state
              bundleState[product.id] = {
                productId: product.id,
                productTitle: product.title,
                variantId: variant.id,
                variantTitle: variant.title,
                price: variant.price,
                available: variant.available
              };

              updateBundleValue();
            });

            swatchWrap.appendChild(btn);
          });

          updateBundleValue();
        })
        .catch(function () {
          swatchWrap.innerHTML = '';
          var errEl = document.createElement('span');
          errEl.textContent = 'Could not load variants';
          errEl.style.cssText = 'font-size:13px;color:#d72c0d;';
          swatchWrap.appendChild(errEl);
        });
    } else {
      // No handle — use stored variants from config
      swatchWrap.innerHTML = '';
      var storedVariants = product.variants || [];
      if (storedVariants.length === 0) {
        var noVarEl = document.createElement('span');
        noVarEl.textContent = 'No variants';
        noVarEl.style.cssText = 'font-size:13px;color:#8c9196;';
        swatchWrap.appendChild(noVarEl);
      } else {
        variantLabel.textContent = storedVariants[0].title;
        storedVariants.forEach(function (v, vIdx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = v.title;
          btn.style.cssText = [
            'padding:6px 16px',
            'border-radius:4px',
            'cursor:pointer',
            'font-size:13px',
            'font-weight:600',
            'border:' + (vIdx === 0 ? '2px solid #1a1a1a' : '1px solid #e1e3e5'),
            'background:' + (vIdx === 0 ? '#1a1a1a' : '#fff'),
            'color:' + (vIdx === 0 ? '#fff' : '#1a1a1a'),
          ].join(';');
          swatchWrap.appendChild(btn);
        });
      }
    }

    group.appendChild(productCard);
  });

  return group;
}


function renderImageDropdown(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);

  var previewW = (config.swatchWidth || 50) + 'px';
  var previewH = (config.swatchHeight || 50) + 'px';
  var previewRadius = config.swatchShape === 'Square' ? '4px' : '50%';

  var layoutWrap = document.createElement('div');
  layoutWrap.className = 'cap-image-dropdown-layout';
  layoutWrap.style.alignItems = 'center';

  var imgPreview = document.createElement('img');
  imgPreview.className = 'cap-image-dropdown-left-preview';
  imgPreview.style.display = 'none';
  imgPreview.style.width = previewW;
  imgPreview.style.height = previewH;
  imgPreview.style.borderRadius = previewRadius;
  layoutWrap.appendChild(imgPreview);

  var dropdownWrap = document.createElement('div');
  dropdownWrap.className = 'cap-image-dropdown-right-wrap';

  var selectedDisplay = document.createElement('div');
  selectedDisplay.className = 'cap-image-dropdown-selected';

  var selectedText = document.createElement('span');
  selectedText.textContent = '-- Select ' + element.label + ' --';
  selectedDisplay.appendChild(selectedText);

  // Removed hiddenInput

  var select = document.createElement('select');
  select.className = 'cap-select cap-image-dropdown-select';
  select.name = propName(element.label);

  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select ' + element.label + ' --';
  select.appendChild(defaultOpt);

  choices.forEach(function (opt) {
    var option = document.createElement('option');
    option.value = opt.value || opt.label;
    option.textContent = getOptionLabel(opt);
    option.setAttribute('data-price', getOptionPriceCents(opt));
    if (isDefault(opt, config)) option.selected = true;
    select.appendChild(option);
  });

  var optionsList = document.createElement('div');
  optionsList.className = 'cap-image-dropdown-list';
  optionsList.style.display = 'none';

  choices.forEach(function (opt) {
    var item = document.createElement('div');
    item.className = 'cap-image-dropdown-item';

    if (opt.image) {
      var img = document.createElement('img');
      img.src = opt.image;
      img.alt = opt.label;
      img.className = 'cap-image-dropdown-option-img';
      img.style.width = previewW;
      img.style.height = previewH;
      img.style.borderRadius = previewRadius;
      item.appendChild(img);
    }

    var label = document.createElement('span');
    label.textContent = getOptionLabel(opt);
    item.setAttribute('data-price', getOptionPriceCents(opt));
    item.appendChild(label);

    item.addEventListener('click', function () {
      var imgVal = opt.image;
      select.value = opt.value || opt.label;
      selectedText.textContent = getOptionLabel(opt);
      if (imgVal) {
        imgPreview.src = imgVal;
        imgPreview.style.display = 'inline-block';
      } else {
        imgPreview.style.display = 'none';
      }
      optionsList.style.display = 'none';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      updateTotalPrice();
    });

    if (isDefault(opt, config)) {
      select.value = opt.value || opt.label;
      selectedText.textContent = getOptionLabel(opt);
      if (opt.image) {
        imgPreview.src = opt.image;
        imgPreview.style.display = 'inline-block';
      }
    }

    optionsList.appendChild(item);
  });

  selectedDisplay.addEventListener('click', function () {
    optionsList.style.display = optionsList.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', function (e) {
    if (!group.contains(e.target)) {
      optionsList.style.display = 'none';
    }
  });

  dropdownWrap.appendChild(selectedDisplay);
  dropdownWrap.appendChild(optionsList);
  layoutWrap.appendChild(dropdownWrap);

  group.appendChild(select);
  group.appendChild(layoutWrap);
  group.appendChild(createErrorMsg());
  return group;
}

function applyScrollStyle(wrap, config, typeStr) {
  var isHorizontal = config.directionStyle === 'horizontal';

  if (config.scrollType === 'By fixed height' && config.scrollHeight) {
    if (isHorizontal) {
      wrap.style.maxWidth = config.scrollHeight + 'px';
      wrap.classList.add('cap-horizontal-scroll');
    } else {
      wrap.style.maxHeight = config.scrollHeight + 'px';
      wrap.style.overflowY = 'auto';
      wrap.style.overflowX = 'hidden';
      wrap.style.paddingRight = '8px';
    }
  } else if (config.scrollType === 'By number of option values' && config.scrollVisibleItems) {
    var n = parseInt(config.scrollVisibleItems) || 3;
    var isVertical = config.directionStyle === 'vertical';
    var gap = (typeStr === 'image swatch' && isVertical) ? 12 : 8;

    var itemSize = 20;
    if (typeStr === 'image swatch') itemSize = parseInt(isHorizontal ? (config.swatchWidth || 50) : (config.swatchHeight || 50));
    else if (typeStr === 'color swatch') itemSize = parseInt(isHorizontal ? (config.swatchWidth || 36) : (config.swatchHeight || 36));
    else if (typeStr === 'button') itemSize = isHorizontal ? parseInt(config.swatchWidth || 100) : parseInt(config.swatchHeight || 36);
    else itemSize = isHorizontal ? 100 : 24;

    var totalSize = (itemSize * n) + (gap * Math.max(0, n - 1));
    if (isHorizontal) {
      wrap.style.maxWidth = totalSize + 'px';
      wrap.classList.add('cap-horizontal-scroll');
    } else {
      wrap.style.maxHeight = totalSize + 'px';
      wrap.style.overflowY = 'auto';
      wrap.style.overflowX = 'hidden';
      wrap.style.paddingRight = '8px';
    }
  }
}

function renderRadio(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = '';

  var wrap = document.createElement('div');
  wrap.className = 'cap-radio-group';
  var isHorizontal = config.directionStyle === 'horizontal';
  var hasHorizontalScroll = isHorizontal && config.scrollType && config.scrollType !== 'Default';
  if (isHorizontal) {
    wrap.style.setProperty('flex-direction', 'row', 'important');
    wrap.style.setProperty('flex-wrap', hasHorizontalScroll ? 'nowrap' : 'wrap', 'important');
    wrap.style.setProperty('gap', '16px', 'important');
  } else {
    wrap.style.setProperty('flex-direction', 'column', 'important');
    wrap.style.setProperty('flex-wrap', 'nowrap', 'important');
    wrap.style.setProperty('gap', '8px', 'important');
  }
  applyScrollStyle(wrap, config, 'radio button');

  choices.forEach(function (opt) {
    var label = document.createElement('label');
    label.className = 'cap-radio-option';

    var input = document.createElement('input');
    input.type = 'radio';
    input.name = '_cap_radio_' + element.label;
    input.value = opt.value || opt.label;
    input.setAttribute('data-price', getOptionPriceCents(opt));

    if (isDefault(opt, config)) {
      input.checked = true;
      hiddenInput.value = input.value;
    }

    input.addEventListener('change', function () {
      hiddenInput.value = input.value;
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      updateTotalPrice();
    });

    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + getOptionLabel(opt)));
    wrap.appendChild(label);
  });

  group.appendChild(hiddenInput);
  group.appendChild(wrap);
  group.appendChild(createErrorMsg());
  return group;
}

function renderCheckbox(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = '';

  var wrap = document.createElement('div');
  wrap.className = 'cap-checkbox-group';
  var isHorizontal = config.directionStyle === 'horizontal';
  var hasHorizontalScroll = isHorizontal && config.scrollType && config.scrollType !== 'Default';
  if (isHorizontal) {
    wrap.style.setProperty('flex-direction', 'row', 'important');
    wrap.style.setProperty('flex-wrap', hasHorizontalScroll ? 'nowrap' : 'wrap', 'important');
    wrap.style.setProperty('gap', '16px', 'important');
  } else {
    wrap.style.setProperty('flex-direction', 'column', 'important');
    wrap.style.setProperty('flex-wrap', 'nowrap', 'important');
    wrap.style.setProperty('gap', '8px', 'important');
  }
  applyScrollStyle(wrap, config, 'checkbox');

  var defaultValues = [];

  choices.forEach(function (opt) {
    var label = document.createElement('label');
    label.className = 'cap-checkbox-option';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.value = opt.value || opt.label;
    input.setAttribute('data-price', getOptionPriceCents(opt));

    if (isDefault(opt, config)) {
      input.checked = true;
      defaultValues.push(input.value);
    }

    input.addEventListener('change', function () {
      var checkedValues = [];
      wrap.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
        checkedValues.push(cb.value);
      });
      hiddenInput.value = checkedValues.join(', ');
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      updateTotalPrice();
    });

    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + getOptionLabel(opt)));
    wrap.appendChild(label);
  });

  if (defaultValues.length > 0) {
    hiddenInput.value = defaultValues.join(', ');
  }

  group.appendChild(hiddenInput);
  group.appendChild(wrap);
  group.appendChild(createErrorMsg());
  return group;
}

function renderButtonSwatch(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = '';

  var wrap = document.createElement('div');
  wrap.className = 'cap-swatch-group';
  applyScrollStyle(wrap, config, 'button');

  var isVertical = config.directionStyle === 'vertical';
  var isHorizontal = config.directionStyle === 'horizontal';
  var hasHorizontalScroll = isHorizontal && config.scrollType && config.scrollType !== 'Default';
  if (isVertical) {
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '12px';
    wrap.style.flexWrap = 'nowrap';
  } else {
    wrap.style.display = 'flex';
    wrap.style.flexWrap = hasHorizontalScroll ? 'nowrap' : 'wrap';
    wrap.style.gap = '8px';
  }

  choices.forEach(function (opt) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cap-button-swatch';
    btn.textContent = getOptionLabel(opt);
    btn.setAttribute('data-price', getOptionPriceCents(opt));

    btn.style.setProperty('width', config.swatchWidth ? config.swatchWidth + 'px' : 'auto', 'important');
    btn.style.setProperty('height', config.swatchHeight ? config.swatchHeight + 'px' : '36px', 'important');
    btn.style.setProperty('padding', config.swatchWidth ? '0' : '0 16px', 'important');

    var borderRadius = config.swatchShape === 'Round' ? '50px' : '4px';
    btn.style.setProperty('border-radius', borderRadius, 'important');

    if (isDefault(opt, config)) {
      btn.classList.add('cap-selected');
      hiddenInput.value = opt.value || opt.label;
    }

    btn.addEventListener('click', function () {
      if (config.allowMultiple) {
        btn.classList.toggle('cap-selected');
      } else {
        var wasSelected = btn.classList.contains('cap-selected');
        wrap.querySelectorAll('.cap-button-swatch').forEach(function (b) { b.classList.remove('cap-selected'); });
        if (!wasSelected || config.required) {
          btn.classList.add('cap-selected');
        }
      }

      var selectedValues = [];
      wrap.querySelectorAll('.cap-button-swatch.cap-selected').forEach(function (b) {
        var optMatch = choices.find(function (c) { return getOptionLabel(c) === b.textContent; });
        if (optMatch) selectedValues.push(optMatch.value || optMatch.label);
      });
      hiddenInput.value = selectedValues.join(', ');

      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      updateTotalPrice();
    });

    wrap.appendChild(btn);
  });

  group.appendChild(hiddenInput);
  group.appendChild(wrap);
  group.appendChild(createErrorMsg());
  return group;
}

function renderColorSwatch(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = '';

  var wrap = document.createElement('div');
  wrap.className = 'cap-swatch-group';
  applyScrollStyle(wrap, config, 'color swatch');

  var isVertical = config.directionStyle === 'vertical';
  var isHorizontal = config.directionStyle === 'horizontal';
  var hasHorizontalScroll = isHorizontal && config.scrollType && config.scrollType !== 'Default';
  if (isVertical) {
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '12px';
    wrap.style.flexWrap = 'nowrap';
  } else {
    wrap.style.display = 'flex';
    wrap.style.flexWrap = hasHorizontalScroll ? 'nowrap' : 'wrap';
    wrap.style.gap = '8px';
  }

  var textDisplay = document.createElement('div');
  textDisplay.className = 'cap-help-text';
  textDisplay.style.marginTop = '4px';

  choices.forEach(function (opt) {
    var optionWrap = document.createElement('div');
    if (isVertical) {
      optionWrap.style.display = 'flex';
      optionWrap.style.width = '100%';
      optionWrap.style.alignItems = 'center';
      optionWrap.style.gap = '12px';
    } else {
      optionWrap.style.display = 'inline-flex';
    }

    var swatch = document.createElement('span');
    swatch.className = 'cap-color-swatch';
    swatch.style.backgroundColor = opt.color || opt.value || '#ccc';
    swatch.title = opt.label;
    swatch.setAttribute('data-price', getOptionPriceCents(opt));

    if (config.swatchWidth) swatch.style.width = config.swatchWidth + 'px';
    if (config.swatchHeight) swatch.style.height = config.swatchHeight + 'px';
    swatch.style.borderRadius = config.swatchShape === 'Square' ? '4px' : '50%';

    if (isDefault(opt, config)) {
      swatch.classList.add('cap-selected');
      hiddenInput.value = opt.value || opt.label;
      textDisplay.textContent = getOptionLabel(opt);
    }

    swatch.addEventListener('click', function () {
      if (config.allowMultiple) {
        swatch.classList.toggle('cap-selected');
      } else {
        var wasSelected = swatch.classList.contains('cap-selected');
        wrap.querySelectorAll('.cap-color-swatch').forEach(function (s) { s.classList.remove('cap-selected'); });
        if (!wasSelected || config.required) {
          swatch.classList.add('cap-selected');
        }
      }

      var selectedValues = [];
      var selectedLabels = [];
      wrap.querySelectorAll('.cap-color-swatch.cap-selected').forEach(function (s) {
        var optMatch = choices.find(function (c) { return c.label === s.title; });
        if (optMatch) {
          selectedValues.push(optMatch.value || optMatch.label);
          selectedLabels.push(getOptionLabel(optMatch));
        }
      });

      hiddenInput.value = selectedValues.join(', ');
      textDisplay.textContent = selectedLabels.join(', ');

      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      updateTotalPrice();
    });

    optionWrap.appendChild(swatch);

    if (isVertical) {
      var labelSpan = document.createElement('span');
      labelSpan.textContent = getOptionLabel(opt);
      labelSpan.style.fontSize = '14px';
      labelSpan.style.cursor = 'pointer';
      labelSpan.addEventListener('click', function () {
        swatch.click();
      });
      optionWrap.appendChild(labelSpan);
    }

    wrap.appendChild(optionWrap);
  });

  group.appendChild(hiddenInput);
  group.appendChild(wrap);
  group.appendChild(textDisplay);
  group.appendChild(createErrorMsg());
  return group;
}

function renderColorPicker(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = config.defaultColor || '#000000';

  var colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'cap-color-picker-input';
  colorInput.value = config.defaultColor || '#000000';
  colorInput.style.width = '40px';
  colorInput.style.height = '40px';
  colorInput.style.padding = '0';
  colorInput.style.border = '1px solid #c9cccf';
  colorInput.style.borderRadius = '4px';
  colorInput.style.cursor = 'pointer';

  colorInput.addEventListener('input', function () {
    hiddenInput.value = colorInput.value;
    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  colorInput.addEventListener('change', function () {
    hiddenInput.value = colorInput.value;
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  group.appendChild(hiddenInput);
  group.appendChild(colorInput);
  group.appendChild(createErrorMsg());
  return group;
}

function renderImageSwatch(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var choices = getChoices(config);

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = '';

  var wrap = document.createElement('div');
  wrap.className = 'cap-swatch-group';
  applyScrollStyle(wrap, config, 'image swatch');

  var isVertical = config.directionStyle === 'vertical';
  var isHorizontal = config.directionStyle === 'horizontal';
  var hasHorizontalScroll = isHorizontal && config.scrollType && config.scrollType !== 'Default';
  if (isVertical) {
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '12px';
    wrap.style.flexWrap = 'nowrap';
  } else {
    wrap.style.display = 'flex';
    wrap.style.flexWrap = hasHorizontalScroll ? 'nowrap' : 'wrap';
    wrap.style.gap = '8px';
  }

  var textDisplay = document.createElement('div');
  textDisplay.className = 'cap-help-text';
  textDisplay.style.marginTop = '4px';

  choices.forEach(function (opt) {
    var optionWrap = document.createElement('div');
    if (isVertical) {
      optionWrap.style.display = 'flex';
      optionWrap.style.width = '100%';
      optionWrap.style.alignItems = 'center';
      optionWrap.style.gap = '12px';
    } else {
      optionWrap.style.display = 'inline-flex';
    }

    var swatch = document.createElement('img');
    swatch.className = 'cap-image-swatch';
    swatch.src = opt.image || '';
    swatch.alt = opt.label;
    swatch.title = opt.label;
    swatch.setAttribute('data-price', getOptionPriceCents(opt));

    swatch.style.width = (config.swatchWidth || 50) + 'px';
    swatch.style.height = (config.swatchHeight || 50) + 'px';
    swatch.style.objectFit = 'cover';
    swatch.style.cursor = 'pointer';
    swatch.style.borderRadius = config.swatchShape === 'Square' ? '4px' : '50%';

    if (isDefault(opt, config)) {
      swatch.classList.add('cap-selected');
      hiddenInput.value = opt.value || opt.label;
      textDisplay.textContent = getOptionLabel(opt);
    }

    swatch.addEventListener('click', function () {
      if (config.allowMultiple) {
        swatch.classList.toggle('cap-selected');
      } else {
        var wasSelected = swatch.classList.contains('cap-selected');
        wrap.querySelectorAll('.cap-image-swatch').forEach(function (s) { s.classList.remove('cap-selected'); });
        if (!wasSelected || config.required) {
          swatch.classList.add('cap-selected');
        }
      }

      var selectedValues = [];
      var selectedLabels = [];
      wrap.querySelectorAll('.cap-image-swatch.cap-selected').forEach(function (s) {
        var optMatch = choices.find(function (c) { return c.label === s.title; });
        if (optMatch) {
          selectedValues.push(optMatch.value || optMatch.label);
          selectedLabels.push(getOptionLabel(optMatch));
        }
      });

      hiddenInput.value = selectedValues.join(', ');
      textDisplay.textContent = selectedLabels.join(', ');

      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      updateTotalPrice();
    });

    optionWrap.appendChild(swatch);

    if (isVertical) {
      var labelSpan = document.createElement('span');
      labelSpan.textContent = getOptionLabel(opt);
      labelSpan.style.fontSize = '14px';
      labelSpan.style.cursor = 'pointer';
      labelSpan.addEventListener('click', function () {
        swatch.click();
      });
      optionWrap.appendChild(labelSpan);
    }

    wrap.appendChild(optionWrap);
  });

  group.appendChild(hiddenInput);
  group.appendChild(wrap);
  group.appendChild(textDisplay);
  group.appendChild(createErrorMsg());
  return group;
}

/* ─── Static Element Renderers ───────────────────────────────── */

function renderHeading(element) {
  var div = document.createElement('div');
  div.className = 'cap-option-group';
  div.setAttribute('data-id', element.id || '');
  div.setAttribute('data-type', element.type);
  div.setAttribute('data-required', 'false');
  div._element = element;

  var config = parseConfig(element.config);
  var h = document.createElement('div');
  h.className = 'cap-heading';
  h.textContent = config.content || element.label;
  if (config.align) h.style.textAlign = config.align;
  if (config.fontSize) h.style.fontSize = config.fontSize + 'px';
  if (config.fontWeight) h.style.fontWeight = config.fontWeight;
  div.appendChild(h);
  return div;
}

function renderDivider(element) {
  var config = element ? parseConfig(element.config) : {};
  var div = document.createElement('div');
  div.className = 'cap-option-group';
  if (element) {
    div.setAttribute('data-id', element.id || '');
    div.setAttribute('data-type', element.type);
    div.setAttribute('data-required', 'false');
    div._element = element;
  }
  var hr = document.createElement('hr');
  hr.className = 'cap-divider';
  hr.style.border = 'none';
  hr.style.borderTop = (config.thickness || 1) + 'px ' + (config.style || 'solid') + ' ' + (config.color || '#bbbbbb');
  hr.style.margin = '20px 0';
  div.appendChild(hr);
  return div;
}

function renderSpacing(element) {
  var config = parseConfig(element.config);
  var div = document.createElement('div');
  div.className = 'cap-option-group';
  div.setAttribute('data-id', element.id || '');
  div.setAttribute('data-type', element.type);
  div.setAttribute('data-required', 'false');
  div._element = element;

  var space = document.createElement('div');
  space.style.minHeight = (config.height || 20) + 'px';
  space.style.display = 'block';
  div.appendChild(space);
  return div;
}

function renderParagraph(element) {
  var div = document.createElement('div');
  div.className = 'cap-option-group';
  div.setAttribute('data-id', element.id || '');
  div.setAttribute('data-type', element.type);
  div.setAttribute('data-required', 'false');
  div._element = element;

  var config = parseConfig(element.config);
  var p = document.createElement('div');
  p.className = 'cap-paragraph';
  p.style.textAlign = config.align || 'left';
  p.innerHTML = config.content || element.subtext || element.label || '';
  div.appendChild(p);
  return div;
}

function renderHTML(element) {
  var config = parseConfig(element.config);
  var div = document.createElement('div');
  div.className = 'cap-option-group';
  div.setAttribute('data-id', element.id || '');
  div.setAttribute('data-type', element.type);
  div.setAttribute('data-required', 'false');
  div._element = element;

  var wrap = document.createElement('div');
  wrap.innerHTML = config.content || '';
  div.appendChild(wrap);
  return div;
}

/**
 * Renders a Pop-up Modal / Size Chart element.
 * Shows as a clickable link; clicking opens a modal overlay.
 * Config: { triggerText, title, content (HTML) }
 */
function renderPopupModal(element) {
  var config = parseConfig(element.config);
  var triggerText = config.triggerText || element.label;
  var modalTitle = config.title || element.label || 'Details';
  var modalContent = config.content || '';

  var wrap = document.createElement('div');
  wrap.className = 'cap-option-group';
  wrap.setAttribute('data-id', element.id || '');
  wrap.setAttribute('data-type', element.type);
  wrap.setAttribute('data-required', 'false');
  wrap._element = element;

  /* Trigger link — inline styles ensure theme CSS cannot override */
  var link = document.createElement('a');
  link.href = '#';
  link.textContent = triggerText + ' \u2197';
  link.style.cssText = [
    'color:#2563eb',
    'text-decoration:underline',
    'cursor:pointer',
    'font-size:14px',
    'display:inline-block',
    'background:none',
    'border:none',
    'padding:0',
    'margin:0',
    'font-family:inherit',
    'font-weight:normal'
  ].join(';');

  /* Full-screen overlay appended to body to escape overflow:hidden */
  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'display:none',
    'position:fixed',
    'top:0', 'left:0',
    'width:100%', 'height:100%',
    'background:rgba(0,0,0,0.55)',
    'z-index:999999',
    'justify-content:center',
    'align-items:center'
  ].join(';');

  var rawWidth = config.modalWidth || '';
  var modalMaxWidth = !rawWidth ? '90vw' : (String(rawWidth).includes('px') || String(rawWidth).includes('%') || rawWidth === 'auto' ? rawWidth : rawWidth + 'px');
  var modalWidth = !rawWidth ? 'fit-content' : '90%';

  var rawHeight = config.modalHeight || '';
  var modalHeight = !rawHeight ? 'auto' : (String(rawHeight).includes('px') || String(rawHeight).includes('%') || rawHeight === 'auto' ? rawHeight : rawHeight + 'px');

  var modal = document.createElement('div');
  modal.style.cssText = [
    'background:white',
    'border-radius:8px',
    'padding:24px',
    'max-width:' + modalMaxWidth,
    'width:' + modalWidth,
    'height:' + modalHeight,
    'max-height:80vh',
    'overflow-y:auto',
    'position:relative',
    'box-shadow:0 20px 60px rgba(0,0,0,0.3)',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    'font-size:14px',
    'color:#111827',
    'line-height:1.6'
  ].join(';');

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;';

  var titleEl = document.createElement('div');
  titleEl.textContent = modalTitle;
  titleEl.style.cssText = 'margin:0;font-size:18px;font-weight:bold;color:#111827;';

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '\u2715';
  closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:20px;color:#6b7280;padding:0 4px;line-height:1;flex-shrink:0;';

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  var body = document.createElement('div');
  body.style.cssText = 'font-size:14px;color:#374151;line-height:1.7;';
  body.innerHTML = modalContent || '<p>No content provided.</p>';

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);

  function openModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  link.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.style.display === 'flex') closeModal();
  });

  wrap.appendChild(link);
  document.body.appendChild(overlay);
  return wrap;
}

/* ─── Storefront Conditional Logic Engine ────────────────────── */

function evaluateStorefrontConditions() {
  var groups = document.querySelectorAll('.cap-options-wrapper .cap-option-group');
  if (groups.length === 0) return;

  // 1. Build a map of element values & collect all push rules from other elements
  var valMap = {};
  var allPushRules = [];
  groups.forEach(function (group) {
    var id = group.getAttribute('data-id');
    if (!id) return;
    valMap[id] = getElementValue(group);

    var element = group._element;
    if (element && element.config && element.config.targetOtherFields && element.config.pushRules) {
      element.config.pushRules.forEach(function (rule) {
        if (rule.targetElementId) {
          allPushRules.push({
            sourceElementId: id,
            targetElementId: rule.targetElementId,
            value: rule.value
          });
        }
      });
    }
  });

  // 2. Evaluate conditions and push rules for each group
  groups.forEach(function (group) {
    var element = group._element;
    if (!element) return;

    var id = group.getAttribute('data-id');
    var config = element.config || {};

    // Evaluate own conditional logic conditions (pull rules)
    var pullResult = true;
    if (config.conditionalLogic && config.conditions && config.conditions.length > 0) {
      var conditions = config.conditions;
      var logicGate = conditions[0].logicGate || 'and';
      var isMatch = (logicGate === 'and');

      for (var i = 0; i < conditions.length; i++) {
        var cond = conditions[i];
        var sourceId = cond.sourceElementId;
        var operator = cond.operator;
        var targetVal = cond.value;

        var currentVal = valMap[sourceId];
        if (currentVal === undefined) currentVal = '';

        var condPassed = false;

        if (Array.isArray(currentVal)) {
          if (operator === 'equals' || operator === 'contains') {
            condPassed = currentVal.indexOf(targetVal) !== -1;
          } else if (operator === 'not_equals' || operator === 'not_contains') {
            condPassed = currentVal.indexOf(targetVal) === -1;
          } else if (operator === 'is_empty') {
            condPassed = currentVal.length === 0;
          } else if (operator === 'is_not_empty') {
            condPassed = currentVal.length > 0;
          }
        } else {
          var currentStr = String(currentVal);
          var targetStr = String(targetVal);

          switch (operator) {
            case 'equals':
              condPassed = (currentStr === targetStr);
              break;
            case 'not_equals':
              condPassed = (currentStr !== targetStr);
              break;
            case 'contains':
              condPassed = (currentStr.indexOf(targetStr) !== -1);
              break;
            case 'not_contains':
              condPassed = (currentStr.indexOf(targetStr) === -1);
              break;
            case 'is_empty':
              condPassed = (!currentStr || currentStr.trim() === '');
              break;
            case 'is_not_empty':
              condPassed = (currentStr && currentStr.trim() !== '');
              break;
            case 'greater_than':
              condPassed = (parseFloat(currentStr) > parseFloat(targetStr));
              break;
            case 'less_than':
              condPassed = (parseFloat(currentStr) < parseFloat(targetStr));
              break;
            default:
              condPassed = (currentStr === targetStr);
          }
        }

        if (logicGate === 'and') {
          isMatch = isMatch && condPassed;
        } else {
          isMatch = isMatch || condPassed;
        }
      }

      var action = conditions[0].action || 'show';
      pullResult = (action === 'show') ? isMatch : !isMatch;
    }

    // Evaluate push rules targeting this element
    var pushRulesTargetingMe = allPushRules.filter(function (pr) {
      return pr.targetElementId === id;
    });

    var pushResult = true;
    if (pushRulesTargetingMe.length > 0) {
      pushResult = pushRulesTargetingMe.some(function (pr) {
        var sourceVal = valMap[pr.sourceElementId];
        if (sourceVal === undefined) return false;
        if (Array.isArray(sourceVal)) {
          for (var j = 0; j < sourceVal.length; j++) {
            if (String(sourceVal[j]) === String(pr.value)) return true;
          }
          return false;
        }
        return String(sourceVal) === String(pr.value);
      });
    }

    // Combine both conditional logic and push rules (both must allow it to show)
    var shouldShow = pullResult && pushResult;

    if (shouldShow) {
      if (group.style.display === 'none') {
        var wType = (group._element && group._element.config && group._element.config.widthType) || '';
        group.style.display = wType === 'Half width' ? 'inline-flex' : 'flex';
      }
      enableGroupInputs(group, true);
    } else {
      group.style.setProperty('display', 'none', 'important');
      enableGroupInputs(group, false);
    }
  });
}

function getElementValue(group) {
  if (group.style.display === 'none') {
    var type = group.getAttribute('data-type') || '';
    if (type.toLowerCase() === 'checkbox') return [];
    return '';
  }

  var element = group._element;
  if (!element) return '';

  var choices = (element.config && getChoices(element.config)) || [];
  var match;
  var idx;

  // 1. Checkboxes
  var checkboxes = group.querySelectorAll('input[type="checkbox"]');
  if (checkboxes.length > 0) {
    var checkedIds = [];
    checkboxes.forEach(function (cb) {
      if (cb.checked) {
        match = null;
        for (idx = 0; idx < choices.length; idx++) {
          if ((choices[idx].value || choices[idx].label) === cb.value) {
            match = choices[idx];
            break;
          }
        }
        checkedIds.push(match ? (match.id || match.value || match.label) : cb.value);
      }
    });
    return checkedIds;
  }

  // 2. Radios
  var radios = group.querySelectorAll('input[type="radio"]');
  if (radios.length > 0) {
    var checkedRadio = group.querySelector('input[type="radio"]:checked');
    if (checkedRadio) {
      match = null;
      for (idx = 0; idx < choices.length; idx++) {
        if ((choices[idx].value || choices[idx].label) === checkedRadio.value) {
          match = choices[idx];
          break;
        }
      }
      return match ? (match.id || match.value || match.label) : checkedRadio.value;
    }
    return '';
  }

  // 3. Select Dropdowns
  var select = group.querySelector('select');
  if (select) {
    if (select.selectedIndex >= 0) {
      var optVal = select.options[select.selectedIndex].value;
      match = null;
      for (idx = 0; idx < choices.length; idx++) {
        if ((choices[idx].value || choices[idx].label) === optVal) {
          match = choices[idx];
          break;
        }
      }
      return match ? (match.id || match.value || match.label) : optVal;
    }
    return '';
  }

  // 4. Hidden Inputs
  var hidden = group.querySelector('input[type="hidden"]');
  if (hidden) {
    var val = hidden.value;
    match = null;
    for (idx = 0; idx < choices.length; idx++) {
      if ((choices[idx].value || choices[idx].label) === val) {
        match = choices[idx];
        break;
      }
    }
    return match ? (match.id || match.value || match.label) : val;
  }

  // 5. Standard text input/textarea
  var inp = group.querySelector('input, textarea');
  if (inp) {
    return inp.value;
  }

  return '';
}

function enableGroupInputs(group, enable) {
  var inputs = group.querySelectorAll('input, select, textarea');
  inputs.forEach(function (inp) {
    inp.disabled = !enable;
  });
}

/* ─── Cart Page Features ─────────────────────────────────────── */
function initCartPageFeatures(toggleStates) {
  var isApplying = false;
  var debounceTimer;

  // Inject robust CSS rule that overrides theme scripts
  if (!document.getElementById('cap-cart-addon-styles')) {
    var style = document.createElement('style');
    style.id = 'cap-cart-addon-styles';
    style.innerHTML = `
      .cap-addon-cart-row .cart-item__quantity-wrapper,
      .cap-addon-cart-row quantity-input,
      .cap-addon-cart-row .cart__qty,
      .cap-addon-cart-row .cart-item__quantity,
      .cap-addon-cart-row input[name^="updates"],
      .cap-addon-cart-row cart-remove-button,
      .cap-addon-cart-row .cart__remove,
      .cap-addon-cart-row .cart-item__remove {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function applyCartModifications() {
    if (isApplying) return;
    isApplying = true;

    var cartUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ? window.Shopify.routes.root + 'cart.js' : '/cart.js';

    fetch(cartUrl)
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        if (!cart || !cart.items) {
          isApplying = false;
          return;
        }

        // Broad selector for cart item rows in most Shopify themes
        var cartRows = document.querySelectorAll('.cart-item, .cart__row, .cart-table-row, tr.cart-item, .mini-cart-item, .drawer__cart-item, li.cart-drawer__item, .cart-drawer__item');

        var validRows = [];
        cartRows.forEach(function (row) {
          // Ensure it's an actual item row by checking for a remove link or quantity input
          if (row.querySelector('cart-remove-button, .cart__remove, .cart-item__remove, [href*="/cart/change"], quantity-input, input[name^="updates"]')) {
            if (validRows.indexOf(row) === -1) {
              validRows.push(row);
            }
          }
        });

        validRows.forEach(function (row) {
          var item = null;

          // 1. Try to find by data-key
          var key = row.getAttribute('data-key') || row.getAttribute('data-cart-item-key');
          if (key) {
            for (var i = 0; i < cart.items.length; i++) {
              if (cart.items[i].key === key) {
                item = cart.items[i];
                break;
              }
            }
          }

          // 2. Try to find by index in ID (e.g., CartDrawer-Item-1)
          if (!item && row.id) {
            var match = row.id.match(/-(\d+)$/);
            if (match && match[1]) {
              var idx = parseInt(match[1], 10) - 1;
              if (cart.items[idx]) item = cart.items[idx];
            }
          }

          // 3. Fallback: assume rows are ordered the same as cart.items (handles multiple cart wrappers on the same page)
          if (!item && cart.items.length > 0) {
            idx = validRows.indexOf(row) % cart.items.length;
            item = cart.items[idx];
          }

          if (!item) return;

          var props = item.properties || {};
          var propsStr = JSON.stringify(props);
          var isAddon = propsStr.indexOf('_is_addon') > -1 || propsStr.indexOf('_parent_id') > -1 || propsStr.indexOf('"Addon"') > -1 || propsStr.indexOf('_addon') > -1;
          var hasCustomOptions = propsStr.indexOf('_CustomOptions') > -1 || propsStr.indexOf('"CustomOptions"') > -1 || propsStr.indexOf('_price_adjustments') > -1 || propsStr.indexOf('_base_price') > -1 || propsStr.indexOf('_final_price') > -1;

          console.log("Pistalix Cart Mod:", { itemTitle: item.title, isAddon: isAddon, propsStr: propsStr });

          // In case the theme did output the properties, we hide them explicitly
          var domProps = row.querySelectorAll('.product-details__item, .cart-item__details dl div, .cart-item__property, .item-property, dd, .cart-item__details-property, li, .product-option');
          var skippedOpts = [];
          if (item.properties && item.properties._skipped_options) {
            skippedOpts = item.properties._skipped_options.split(',').map(function (s) { return s.trim(); });
          }

          domProps.forEach(function (prop) {
            var text = prop.textContent || '';
            if (text.indexOf('_CustomOptions') > -1 || text.indexOf('_price_adjustments') > -1 || text.indexOf('_is_addon') > -1) {
              prop.style.display = 'none';
            }
            skippedOpts.forEach(function (sk) {
              if (text.indexOf(sk + ':') > -1 || text.indexOf(sk + ' :') > -1) {
                prop.style.display = 'none';
              }
            });
          });

          // 1. Hide quantity box and remove button for add-on products
          if (toggleStates.hideQuantity && isAddon) {
            row.classList.add('cap-addon-cart-row');

            // Still try inline styles just in case
            var qty = row.querySelector('.cart-item__quantity-wrapper');
            if (!qty) qty = row.querySelector('quantity-input, .cart__qty, .cart-item__quantity, input[name^="updates"]');

            console.log("Pistalix Hiding Qty:", qty);

            if (qty) qty.setAttribute('style', 'display: none !important; visibility: hidden !important;');

            var removeBtn = row.querySelector('cart-remove-button, .cart__remove, .cart-item__remove');
            if (removeBtn) removeBtn.setAttribute('style', 'display: none !important; visibility: hidden !important;');
          }

          // 2. Visually update prices in cart if they are old
          if (item.properties && item.properties._final_price && toggleStates.addAddonPriceToProductPrice !== false) {
            var newPriceStr = (capConfig.moneyFormat || '${{amount}}').replace(/\{\{\s*amount[^}]*\}\}/, item.properties._final_price);

            // Try to find the single item price element
            var priceEls = row.querySelectorAll('.price, .cart-item__price-wrapper > .price, .cart__price, .cart-item__price, td:nth-child(3) .price');
            priceEls.forEach(function (el) {
              el.innerHTML = newPriceStr;
            });

            // Try to find the line total price element
            var lineTotal = (parseFloat(item.properties._final_price) * item.quantity).toFixed(2);
            if (capConfig.currency && ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'LAK', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'].indexOf(capConfig.currency) !== -1) {
              lineTotal = Math.round(parseFloat(item.properties._final_price) * item.quantity).toString();
            }
            var newTotalStr = (capConfig.moneyFormat || '${{amount}}').replace(/\{\{\s*amount[^}]*\}\}/, lineTotal);
            var totalEls = row.querySelectorAll('.cart-item__totals .price, .cart-item__price-wrapper.cart-item__price-wrapper--total, .cart__final-price, td:nth-child(5) .price');
            totalEls.forEach(function (el) {
              el.innerHTML = newTotalStr;
            });

            // Also update any span elements containing the price
            var allMoneySpans = row.querySelectorAll('.money, .price-item');
            allMoneySpans.forEach(function (el) {
              if (el.closest('.cart-item__totals, .cart__final-price, td:nth-child(5)')) {
                el.innerHTML = newTotalStr;
              } else {
                el.innerHTML = newPriceStr;
              }
            });
          }

          // 3. Show Edit Options button in cart
          if (toggleStates.showEditOptions && hasCustomOptions) {
            if (!row.querySelector('.cap-edit-options-btn')) {
              var editBtn = document.createElement('a');
              editBtn.href = 'javascript:void(0)';
              editBtn.className = 'cap-edit-options-btn link';
              editBtn.style.cssText = 'display:inline-flex; align-items:center; margin-top:8px; font-size:13px; text-decoration:underline; cursor:pointer; color:inherit; opacity:0.8; transition:opacity 0.2s;';
              editBtn.innerHTML = '<svg style="width:14px;height:14px;margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Edit Options';

              editBtn.addEventListener('mouseenter', function () { editBtn.style.opacity = '1'; });
              editBtn.addEventListener('mouseleave', function () { editBtn.style.opacity = '0.8'; });

              editBtn.addEventListener('click', function (e) {
                e.preventDefault();
                alert('Edit Options functionality will open the product popup here.');
              });

              var detailsWrap = row.querySelector('.cart-item__details, .cart__item-details, .product-details, dl') || row.querySelector('td:nth-child(2)');
              if (detailsWrap) {
                var dl = detailsWrap.querySelector('dl');
                if (dl) {
                  dl.insertAdjacentElement('afterend', editBtn);
                } else {
                  detailsWrap.appendChild(editBtn);
                }
              }
            }
          }
        });
        isApplying = false;
      })
      .catch(function (e) {
        console.warn('Pistalix: Cart fetch failed', e);
        isApplying = false;
      });
  }

  function applyCartModificationsDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyCartModifications, 400);
  }

  // Run initially
  applyCartModificationsDebounced();
}

function renderFontPicker(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var fonts = config.fonts || ['Marko One', 'Enriqueta', 'Grand Hotel', 'Itim', 'Ledger', 'Modern Antiqua', 'Noto Serif TC', 'Pirata One', 'Poppins'];
  var isSwatch = config.fontDisplayStyle === 'Swatch';

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.className = 'cap-input-hidden';
  group.appendChild(hiddenInput);

  // Dynamically load Google Fonts
  if (fonts && fonts.length > 0) {
    var fontQuery = fonts.map(function (f) { return 'family=' + f.replace(/ /g, '+'); }).join('&');
    var fontUrl = 'https://fonts.googleapis.com/css2?' + fontQuery + '&display=swap';
    var linkId = 'cap-google-fonts-' + element.id;
    if (!document.getElementById(linkId)) {
      var link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  }

  if (isSwatch) {
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexWrap = 'wrap';
    wrap.style.gap = '8px';

    fonts.forEach(function (f, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f;
      btn.style.fontFamily = f;
      btn.style.padding = '8px 16px';
      btn.style.border = '1px solid var(--p-color-border)';
      btn.style.borderRadius = '4px';
      btn.style.backgroundColor = '#fff';
      btn.style.cursor = 'pointer';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        hiddenInput.value = f;
        Array.from(wrap.children).forEach(function (c) {
          c.style.border = '1px solid var(--p-color-border)';
          c.style.boxShadow = 'none';
        });
        btn.style.border = '2px solid var(--p-color-border-brand, #000)';
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      wrap.appendChild(btn);
    });
    group.appendChild(wrap);
  } else {
    var select = document.createElement('select');
    select.className = 'cap-input cap-select';
    select.style.fontFamily = fonts[0];

    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = config.placeholder || 'Select a font';
    select.appendChild(defaultOpt);

    fonts.forEach(function (f) {
      var opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      opt.style.fontFamily = f;
      select.appendChild(opt);
    });

    select.addEventListener('change', function () {
      hiddenInput.value = select.value;
      select.style.fontFamily = select.value || 'inherit';
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    group.appendChild(select);
  }

  group.appendChild(createErrorMsg());
  return group;
}

function renderVariantFetcher(element) {
  var group = createGroup(element);
  var config = parseConfig(element.config);
  var displayStyle = config.displayStyle || 'button';
  var hideOriginal = config.hideOriginalSelectors !== false;

  // Loading indicator
  var loadingEl = document.createElement('div');
  loadingEl.textContent = 'Loading product variants...';
  loadingEl.style.cssText = 'font-size:13px;color:#8c9196;padding:8px 0;';
  group.appendChild(loadingEl);

  // Detect product handle from the current page URL
  var productHandle = '';
  var pathParts = window.location.pathname.split('/');
  for (var pi = 0; pi < pathParts.length; pi++) {
    if (pathParts[pi] === 'products' && pathParts[pi + 1]) {
      productHandle = pathParts[pi + 1].split('?')[0];
      break;
    }
  }

  if (!productHandle) {
    loadingEl.textContent = 'Could not detect product. Variant Fetcher works only on product pages.';
    loadingEl.style.color = '#d72c0d';
    return group;
  }

  // Hidden input to store variant ID for the cart properties
  var hiddenVariantInput = document.createElement('input');
  hiddenVariantInput.type = 'hidden';
  var cleanLabel = element.label.replace(/:+$/, '').trim();
  var isHidden = config.hideVariantPropertiesInCart === true || config.hideVariantPropertiesInCart === 'true';
  var propPrefix = isHidden ? 'properties[_' : 'properties[';
  hiddenVariantInput.name = propPrefix + escapeHTML(cleanLabel) + ']';
  hiddenVariantInput.className = 'cap-input-hidden';
  group.appendChild(hiddenVariantInput);

  fetch('/products/' + productHandle + '.js?v=' + Date.now())
    .then(function (res) { return res.json(); })
    .then(function (productData) {
      loadingEl.remove();

      var variants = productData.variants || [];
      var options = productData.options || []; // [{name: "Size", position: 1, values: ["S","M","L"]}, ...]

      if (variants.length === 0 || options.length === 0) {
        var noVarMsg = document.createElement('p');
        noVarMsg.textContent = 'No variants available for this product.';
        noVarMsg.style.cssText = 'font-size:13px;color:#8c9196;margin:0;';
        group.appendChild(noVarMsg);
        return;
      }

      // State: track selected option value for each option position
      var selectedOptions = {};
      for (var oi = 0; oi < options.length; oi++) {
        selectedOptions[oi] = null;
      }

      // Set defaults from the first available variant
      var firstAvailable = null;
      for (var fi = 0; fi < variants.length; fi++) {
        if (variants[fi].available) { firstAvailable = variants[fi]; break; }
      }
      if (!firstAvailable) firstAvailable = variants[0];

      for (var di = 0; di < options.length; di++) {
        var isSkipped = false;
        if (config.specificOptionName && config.specificOptionName.trim() !== '') {
          if (options[di].name.toLowerCase() !== config.specificOptionName.trim().toLowerCase()) {
            isSkipped = true;
          }
        }
        if (config.noDefaultSelection && !isSkipped) {
          selectedOptions[di] = null;
        } else {
          selectedOptions[di] = firstAvailable['option' + (di + 1)];
        }
      }
      // Container for option groups
      var optionsContainer = document.createElement('div');
      optionsContainer.className = 'cap-vf-options';
      optionsContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
      group.appendChild(optionsContainer);

      // Function to find matching variant from selected options
      function findMatchingVariant() {
        for (var vi = 0; vi < variants.length; vi++) {
          var v = variants[vi];
          var match = true;
          for (var oki = 0; oki < options.length; oki++) {
            if (String(v['option' + (oki + 1)]) !== String(selectedOptions[oki])) {
              match = false;
              break;
            }
          }
          if (match) return v;
        }
        return null;
      }

      // Function to check if a value for a specific option position is available
      // given the other already-selected option values
      function isOptionValueAvailable(optionIndex, testValue) {
        for (var vi = 0; vi < variants.length; vi++) {
          var v = variants[vi];
          if (!v.available) continue;
          if (v['option' + (optionIndex + 1)] !== testValue) continue;
          // Check all other selected options match
          var otherMatch = true;
          for (var oki = 0; oki < options.length; oki++) {
            if (oki === optionIndex) continue;
            if (selectedOptions[oki] && v['option' + (oki + 1)] !== selectedOptions[oki]) {
              otherMatch = false;
              break;
            }
          }
          if (otherMatch) return true;
        }
        return false;
      }

      var isVfSyncing = false;

      // Function to update the main product form's variant ID
      function updateProductFormVariantId(variant) {
        if (isVfSyncing) return;
        var variantId = variant ? variant.id : '';
        // Update the form's hidden input[name="id"] so the correct variant is added to cart
        var forms = document.querySelectorAll('form[action*="/cart/add"], form.product-form, form[data-type="add-to-cart-form"]');
        forms.forEach(function (form) {
          var idInput = form.querySelector('input[name="id"], select[name="id"]');
          if (idInput && idInput.value !== variantId.toString()) {
            isVfSyncing = true;
            idInput.value = variantId;
            idInput.dispatchEvent(new Event('change', { bubbles: true }));
            isVfSyncing = false;
          }
        });

        // Also try the common <variant-radios> or <variant-selects> Shopify elements
        var variantInputs = document.querySelectorAll('input[name="id"][type="hidden"]');
        variantInputs.forEach(function (inp) {
          // Only update ones inside product forms, not our own widget
          if (!inp.closest('.cap-options-wrapper') && inp.value !== variantId.toString()) {
            inp.value = variantId;
          }
        });
      }

      // Collect any options that are being skipped/hidden from the user
      var skippedOptions = [];
      if (config.specificOptionName && config.specificOptionName.trim() !== '') {
        options.forEach(function (opt) {
          if (opt.name.toLowerCase() !== config.specificOptionName.trim().toLowerCase()) {
            skippedOptions.push(opt.name);
          } else if (config.hideVariantPropertiesInCart === true || config.hideVariantPropertiesInCart === 'true') {
            skippedOptions.push(opt.name);
          }
        });
      }
      if (skippedOptions.length > 0) {
        var skippedInput = document.createElement('input');
        skippedInput.type = 'hidden';
        skippedInput.name = 'properties[_skipped_options]';
        skippedInput.value = skippedOptions.join(',');
        skippedInput.className = 'cap-input-hidden';
        group.appendChild(skippedInput);
      }

      // Update all option UI groups
      function updateAllOptions() {
        var matchedVariant = findMatchingVariant();

        // Update hidden input with selected variant info
        if (matchedVariant) {
          hiddenVariantInput.value = matchedVariant.title;
          capConfig.basePrice = matchedVariant.price;
          updateProductFormVariantId(matchedVariant);
        } else {
          hiddenVariantInput.value = '';
          updateProductFormVariantId(null);
        }

        // Update availability styling for each option group
        for (var oi = 0; oi < options.length; oi++) {
          var optGroup = optionsContainer.querySelector('[data-option-index="' + oi + '"]');
          if (!optGroup) continue;

          if (displayStyle === 'dropdown') {
            var sel = optGroup.querySelector('select');
            if (sel) {
              var opts = sel.querySelectorAll('option');
              for (var si = 0; si < opts.length; si++) {
                if (opts[si].value === '') continue;
                var avail = isOptionValueAvailable(oi, opts[si].value);
                opts[si].disabled = !avail;
                opts[si].textContent = opts[si].getAttribute('data-label') + (avail ? '' : ' (Unavailable)');
              }
            }
          } else {
            var btns = optGroup.querySelectorAll('.cap-vf-btn');
            for (var bi = 0; bi < btns.length; bi++) {
              var btnValue = btns[bi].getAttribute('data-value');
              var isSelected = selectedOptions[oi] === btnValue;
              var avail = isOptionValueAvailable(oi, btnValue);

              btns[bi].style.border = isSelected ? '2px solid #1a1a1a' : '1px solid #e1e3e5';
              btns[bi].style.background = isSelected ? '#1a1a1a' : '#fff';
              btns[bi].style.color = isSelected ? '#fff' : '#1a1a1a';
              btns[bi].style.opacity = avail ? '1' : '0.4';
              btns[bi].style.textDecoration = avail ? 'none' : 'line-through';
              btns[bi].style.cursor = avail ? 'pointer' : 'not-allowed';
            }
          }
        }

        hiddenVariantInput.dispatchEvent(new Event('change', { bubbles: true }));
        hiddenVariantInput.dispatchEvent(new Event('input', { bubbles: true }));
        updateTotalPrice();
      }

      // Render each option group
      options.forEach(function (opt, optIdx) {
        if (config.specificOptionName && config.specificOptionName.trim() !== '') {
          if (opt.name.toLowerCase() !== config.specificOptionName.trim().toLowerCase()) {
            return;
          }
        }

        var optionGroup = document.createElement('div');
        optionGroup.setAttribute('data-option-index', optIdx);
        optionGroup.style.cssText = 'margin-bottom:4px;';

        var optLabel = document.createElement('div');
        optLabel.style.cssText = 'font-weight:600;font-size:14px;margin-bottom:6px;';
        optLabel.textContent = opt.name;

        // Show selected value next to label
        var selectedValueSpan = document.createElement('span');
        selectedValueSpan.style.cssText = 'font-weight:normal;color:#6d7175;margin-left:6px;';
        selectedValueSpan.textContent = selectedOptions[optIdx] || '';
        optLabel.appendChild(selectedValueSpan);

        optionGroup.appendChild(optLabel);

        if (displayStyle === 'dropdown') {
          var select = document.createElement('select');
          select.className = 'cap-input cap-select';
          select.style.cssText = 'width:100%;padding:8px 12px;border:1px solid #e1e3e5;border-radius:4px;font-size:14px;';

          var defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = 'Select ' + opt.name + '...';
          select.appendChild(defaultOpt);

          opt.values.forEach(function (val) {
            var option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            option.setAttribute('data-label', val);
            if (selectedOptions[optIdx] === val) option.selected = true;
            select.appendChild(option);
          });

          select.addEventListener('change', function () {
            selectedOptions[optIdx] = select.value || null;
            selectedValueSpan.textContent = select.value || '';

            var exactMatch = findMatchingVariant();
            if (!exactMatch || !exactMatch.available) {
              for (var vi = 0; vi < variants.length; vi++) {
                if (variants[vi].available && variants[vi]['option' + (optIdx + 1)] === select.value) {
                  for (var oki = 0; oki < options.length; oki++) {
                    if (oki !== optIdx) {
                      selectedOptions[oki] = variants[vi]['option' + (oki + 1)];
                      var otherGroup = optionsContainer.querySelector('[data-option-index="' + oki + '"]');
                      if (otherGroup) {
                        var span = otherGroup.querySelector('span');
                        if (span) span.textContent = selectedOptions[oki];
                        if (displayStyle === 'dropdown') {
                          var oSel = otherGroup.querySelector('select');
                          if (oSel) oSel.value = selectedOptions[oki];
                        }
                      }
                    }
                  }
                  break;
                }
              }
            }
            updateAllOptions();
          });

          optionGroup.appendChild(select);
        } else {
          // Button swatches (default)
          var btnWrap = document.createElement('div');
          btnWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

          opt.values.forEach(function (val) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = val;
            btn.className = 'cap-vf-btn';
            btn.setAttribute('data-value', val);
            var isSelected = selectedOptions[optIdx] === val;
            btn.style.cssText = [
              'padding:6px 16px',
              'border-radius:4px',
              'cursor:pointer',
              'font-size:13px',
              'font-weight:600',
              'transition:all 0.15s ease',
              'border:' + (isSelected ? '2px solid #1a1a1a' : '1px solid #e1e3e5'),
              'background:' + (isSelected ? '#1a1a1a' : '#fff'),
              'color:' + (isSelected ? '#fff' : '#1a1a1a'),
            ].join(';');

            btn.addEventListener('click', function () {
              selectedOptions[optIdx] = val;
              selectedValueSpan.textContent = val;

              var exactMatch = findMatchingVariant();
              if (!exactMatch || !exactMatch.available) {
                for (var vi = 0; vi < variants.length; vi++) {
                  if (variants[vi].available && variants[vi]['option' + (optIdx + 1)] === val) {
                    for (var oki = 0; oki < options.length; oki++) {
                      if (oki !== optIdx) {
                        selectedOptions[oki] = variants[vi]['option' + (oki + 1)];
                        var otherGroup = optionsContainer.querySelector('[data-option-index="' + oki + '"]');
                        if (otherGroup) {
                          var span = otherGroup.querySelector('span');
                          if (span) span.textContent = selectedOptions[oki];
                        }
                      }
                    }
                    break;
                  }
                }
              }
              updateAllOptions();
            });

            btnWrap.appendChild(btn);
          });

          optionGroup.appendChild(btnWrap);
        }

        optionsContainer.appendChild(optionGroup);
      });

      // Initial availability check
      updateAllOptions();

      // Hide original variant selectors if config says so
      if (hideOriginal) {
        var selectorsToHide = [
          'variant-radios',
          'variant-selects',
          '.product-form__input--variant',
          '.product-form__variants',
          'fieldset.product-form__input',
          '.swatch',
          '[data-option-index]',
        ];
        // Small delay to ensure theme elements have rendered
        setTimeout(function () {
          selectorsToHide.forEach(function (sel) {
            var els = document.querySelectorAll(sel);
            els.forEach(function (el) {
              // Don't hide our own elements
              if (el.closest('.cap-options-wrapper')) return;
              el.style.setProperty('display', 'none', 'important');
            });
          });
        }, 200);
      }

      // Listen to form changes to keep our state in sync with native variants
      var forms = document.querySelectorAll('form[action*="/cart/add"], form.product-form');
      forms.forEach(function (form) {
        form.addEventListener('change', function (e) {
          if (isVfSyncing) return;
          if (e.target.closest('.cap-options-wrapper')) return; // Ignore our own changes

          setTimeout(function () {
            var idInput = form.querySelector('input[name="id"], select[name="id"]');
            if (idInput && idInput.value) {
              var nativeVid = idInput.value.toString();
              var matched = null;
              for (var vi = 0; vi < variants.length; vi++) {
                if (variants[vi].id.toString() === nativeVid) {
                  matched = variants[vi];
                  break;
                }
              }
              if (matched) {
                var needsUpdate = false;
                for (var oi = 0; oi < options.length; oi++) {
                  // Only sync the options that we are skipping (i.e. managed by the native form)
                  if (skippedOptions.indexOf(options[oi].name) !== -1) {
                    if (selectedOptions[oi] !== matched['option' + (oi + 1)]) {
                      selectedOptions[oi] = matched['option' + (oi + 1)];
                      needsUpdate = true;
                    }
                  }
                }
                if (needsUpdate) {
                  isVfSyncing = true;
                  updateAllOptions();
                  isVfSyncing = false;
                }
              }
            }
          }, 50); // slight delay to allow theme to update input[name="id"]
        });
      });

    })
    .catch(function (err) {
      loadingEl.textContent = 'Could not load product variants.';
      loadingEl.style.color = '#d72c0d';
      console.error('Pistalix Variant Fetcher error:', err);
    });

  group.appendChild(createErrorMsg());
  return group;
}

function renderHiddenField(element) {
  var group = createGroup(element);
  group.style.display = 'none'; // Hidden on frontend
  var config = typeof element.config === 'string' ? JSON.parse(element.config) : (element.config || {});

  var hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = propName(element.label);
  hiddenInput.value = config.value || '';

  group.appendChild(hiddenInput);
  return group;
}
