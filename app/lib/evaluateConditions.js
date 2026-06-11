/**
 * Evaluates a list of conditional rules against the current values of form elements.
 * Works in both Node.js (backend) and browser (storefront script).
 * 
 * @param {Array} conditions - The array of condition rules
 * @param {string} logicGate - "and" | "or"
 * @param {Object} currentValues - A map of elementId -> string|string[] representing current user selections
 * @returns {boolean} - true if the element should be shown, false if it should be hidden
 */
export function evaluateConditions(conditions, logicGate, currentValues) {
  if (!conditions || conditions.length === 0) return true; // Show by default if no conditions

  const results = conditions.map((cond) => {
    const { sourceElementId, operator, value } = cond;
    const currentVal = currentValues[sourceElementId];

    if (currentVal === undefined) {
      // If the source element hasn't been rendered or has no value, 
      // evaluate empty operators
      if (operator === "is_empty") return true;
      if (operator === "not_equals") return true; // not equal to anything because it's undefined
      return false;
    }

    const sourceValStr = Array.isArray(currentVal) ? currentVal.join(",") : String(currentVal);
    const targetValStr = String(value);

    switch (operator) {
      case "equals":
        if (Array.isArray(currentVal)) return currentVal.includes(targetValStr);
        return sourceValStr === targetValStr;
      case "not_equals":
        if (Array.isArray(currentVal)) return !currentVal.includes(targetValStr);
        return sourceValStr !== targetValStr;
      case "contains":
        return sourceValStr.includes(targetValStr);
      case "not_contains":
        return !sourceValStr.includes(targetValStr);
      case "greater_than":
        return Number(sourceValStr) > Number(targetValStr);
      case "less_than":
        return Number(sourceValStr) < Number(targetValStr);
      case "is_empty":
        return !sourceValStr || sourceValStr.trim() === "";
      case "is_not_empty":
        return !!sourceValStr && sourceValStr.trim() !== "";
      default:
        return false;
    }
  });

  if (logicGate === "or") {
    return results.some(Boolean);
  }
  
  // default to "and"
  return results.every(Boolean);
}
