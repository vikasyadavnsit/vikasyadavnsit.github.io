/**
 * A more robust, lightweight code formatter for JavaScript and Java.
 * Handles nested indentation and preserves valid language tokens like '};'
 */

export function prettify(code: string): string {
  let indentLevel = 0;
  const tab = "    ";

  // 1. Normalize line breaks around braces and semicolons (without breaking tokens like };)
  let normalized = code
    .replace(/\{/g, "{\n")
    .replace(/\}(?!\s*;)/g, "\n}\n") // Add newline after } unless followed by ;
    .replace(/\};/g, "\n};\n")      // Keep }; together and add newline
    .replace(/;/g, ";\n")           // Add newline after ;
    .replace(/\n\s*\n/g, "\n");     // Remove double empty lines

  const lines = normalized.split("\n");
  const result: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if the current line decreases the indent level
    // This applies if the line STARTS with a closing brace
    if (line.startsWith("}")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add line with current indentation
    result.push(tab.repeat(indentLevel) + line);

    // Check if the current line increases the indent level for the NEXT lines
    // This applies if the line ENDS with an opening brace
    if (line.endsWith("{")) {
      indentLevel++;
    }
  }

  return result.join("\n");
}
