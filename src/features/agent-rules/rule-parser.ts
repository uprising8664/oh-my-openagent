import { createHash } from "node:crypto";
import type { AgentRuleMetadata } from "./types";

export interface ParsedAgentRule {
  metadata: AgentRuleMetadata;
  body: string;
  contentHash: string;
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseAgentRuleFrontmatter(content: string): ParsedAgentRule {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return { metadata: {}, body: content, contentHash: hashBody(content) };
  }

  const yamlContent = match[1];
  const body = match[2];

  try {
    const metadata = parseYamlContent(yamlContent);
    return { metadata, body, contentHash: hashBody(body) };
  } catch {
    return { metadata: {}, body: content, contentHash: hashBody(content) };
  }
}

function hashBody(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

function parseYamlContent(yamlContent: string): AgentRuleMetadata {
  const lines = yamlContent.split("\n");
  const metadata: AgentRuleMetadata = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colonIndex = line.indexOf(":");

    if (colonIndex === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();

    if (key === "description") {
      metadata.description = parseStringValue(rawValue);
    } else if (key === "scope") {
      const val = parseStringValue(rawValue);
      if (val === "global") {
        metadata.scope = "global";
      }
    } else if (key === "agents" || key === "categories") {
      const { value, consumed } = parseArrayOrStringValue(rawValue, lines, i);
      const arr = normalizeToArray(value);
      if (key === "agents") {
        metadata.agents = arr;
      } else {
        metadata.categories = arr;
      }
      i += consumed;
      continue;
    }

    i++;
  }

  return metadata;
}

function normalizeToArray(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function parseStringValue(value: string): string {
  if (!value) return "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseArrayOrStringValue(
  rawValue: string,
  lines: string[],
  currentIndex: number
): { value: string | string[]; consumed: number } {
  if (rawValue.startsWith("[")) {
    return { value: parseInlineArray(rawValue), consumed: 1 };
  }

  if (!rawValue || rawValue === "") {
    const arrayItems: string[] = [];
    let consumed = 1;

    for (let j = currentIndex + 1; j < lines.length; j++) {
      const nextLine = lines[j];
      const arrayMatch = nextLine.match(/^\s+-\s*(.*)$/);

      if (arrayMatch) {
        const itemValue = parseStringValue(arrayMatch[1].trim());
        if (itemValue) {
          arrayItems.push(itemValue);
        }
        consumed++;
      } else if (nextLine.trim() === "") {
        consumed++;
      } else {
        break;
      }
    }

    if (arrayItems.length > 0) {
      return { value: arrayItems, consumed };
    }
  }

  return { value: parseStringValue(rawValue), consumed: 1 };
}

function parseInlineArray(value: string): string[] {
  const content = value.slice(1, value.lastIndexOf("]")).trim();
  if (!content) return [];

  const items: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = true;
      quoteChar = char;
    } else if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = "";
    } else if (!inQuote && char === ",") {
      const trimmed = current.trim();
      if (trimmed) {
        items.push(parseStringValue(trimmed));
      }
      current = "";
    } else {
      current += char;
    }
  }

  const trimmed = current.trim();
  if (trimmed) {
    items.push(parseStringValue(trimmed));
  }

  return items;
}
