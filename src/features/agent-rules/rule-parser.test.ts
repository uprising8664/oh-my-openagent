import { createHash } from "node:crypto";
import { describe, expect, it } from "bun:test";
import { parseAgentRuleFrontmatter } from "./rule-parser";

describe("parseAgentRuleFrontmatter", () => {
  describe("#given valid frontmatter with agents field", () => {
    describe("#when agents is inline array", () => {
      it("should parse agents as array", () => {
        const content = `---
agents: [sisyphus, oracle]
---
Rule body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.agents).toEqual(["sisyphus", "oracle"]);
        expect(result.body).toBe("Rule body");
      });
    });

    describe("#when agents is multi-line array", () => {
      it("should parse agents as array", () => {
        const content = `---
agents:
  - sisyphus
  - oracle
---
Rule body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.agents).toEqual(["sisyphus", "oracle"]);
        expect(result.body).toBe("Rule body");
      });
    });

    describe("#when agents is a single string", () => {
      it("should normalize to array with one element", () => {
        const content = `---
agents: sisyphus
---
Rule body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.agents).toEqual(["sisyphus"]);
      });
    });

    describe("#when agents is quoted inline array", () => {
      it("should parse agents stripping quotes", () => {
        const content = `---
agents: ["sisyphus", "oracle"]
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.agents).toEqual(["sisyphus", "oracle"]);
      });
    });
  });

  describe("#given valid frontmatter with categories field", () => {
    describe("#when categories is inline array", () => {
      it("should parse categories as array", () => {
        const content = `---
categories: [quick, deep]
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.categories).toEqual(["quick", "deep"]);
      });
    });

    describe("#when categories is multi-line array", () => {
      it("should parse categories as array", () => {
        const content = `---
categories:
  - quick
  - deep
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.categories).toEqual(["quick", "deep"]);
      });
    });

    describe("#when categories is a single string", () => {
      it("should normalize to array", () => {
        const content = `---
categories: quick
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.categories).toEqual(["quick"]);
      });
    });
  });

  describe("#given valid frontmatter with scope field", () => {
    describe("#when scope is global", () => {
      it("should parse scope as global", () => {
        const content = `---
scope: global
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.scope).toBe("global");
      });
    });

    describe("#when scope is an invalid value", () => {
      it("should not set scope", () => {
        const content = `---
scope: local
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.scope).toBeUndefined();
      });
    });
  });

  describe("#given valid frontmatter with description field", () => {
    describe("#when description is a plain string", () => {
      it("should parse description", () => {
        const content = `---
description: Rule for TypeScript files
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.description).toBe("Rule for TypeScript files");
      });
    });

    describe("#when description is a quoted string", () => {
      it("should parse description stripping quotes", () => {
        const content = `---
description: "TypeScript coding standards"
---
Body`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.description).toBe("TypeScript coding standards");
      });
    });
  });

  describe("#given all frontmatter fields together", () => {
    describe("#when parsing complete frontmatter", () => {
      it("should parse all fields correctly", () => {
        const content = `---
agents: [sisyphus, hephaestus]
categories:
  - quick
  - deep
scope: global
description: "Full rule example"
---
# Rule Content
This is the body.`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.agents).toEqual(["sisyphus", "hephaestus"]);
        expect(result.metadata.categories).toEqual(["quick", "deep"]);
        expect(result.metadata.scope).toBe("global");
        expect(result.metadata.description).toBe("Full rule example");
        expect(result.body).toBe("# Rule Content\nThis is the body.");
      });
    });
  });

  describe("#given no frontmatter", () => {
    describe("#when content is plain markdown", () => {
      it("should return empty metadata and full content as body", () => {
        const content = `# Instructions
This is a plain rule file without frontmatter.`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata).toEqual({});
        expect(result.body).toBe(content);
      });
    });

    describe("#when content is empty", () => {
      it("should return empty metadata and empty body", () => {
        const result = parseAgentRuleFrontmatter("");

        expect(result.metadata).toEqual({});
        expect(result.body).toBe("");
      });
    });
  });

  describe("#given malformed YAML frontmatter", () => {
    describe("#when YAML is syntactically wrong", () => {
      it("should return empty metadata and full content as body without throwing", () => {
        const content = `---
agents: [unclosed
description: test
---
Body content`;

        expect(() => parseAgentRuleFrontmatter(content)).not.toThrow();
        const result = parseAgentRuleFrontmatter(content);
        expect(result.body).toBeDefined();
      });
    });
  });

  describe("#given SHA-256 content hash", () => {
    describe("#when body is non-empty", () => {
      it("should compute 64-char hex SHA-256 of body text", () => {
        const content = `---
agents: [sisyphus]
---
Hello world`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.contentHash).toHaveLength(64);
        expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
      });

      it("should match expected SHA-256 hash", () => {
        const body = "Hello world";
        const expectedHash = createHash("sha256").update(body).digest("hex");
        const content = `---
agents: [sisyphus]
---
${body}`;

        const result = parseAgentRuleFrontmatter(content);

        expect(result.contentHash).toBe(expectedHash);
      });
    });

    describe("#when no frontmatter present", () => {
      it("should hash the full content", () => {
        const content = "No frontmatter here";
        const expectedHash = createHash("sha256").update(content).digest("hex");

        const result = parseAgentRuleFrontmatter(content);

        expect(result.contentHash).toBe(expectedHash);
      });
    });
  });

  describe("#given Windows-style line endings", () => {
    describe("#when content uses CRLF", () => {
      it("should parse frontmatter correctly", () => {
        const content = "---\r\nagents: [sisyphus]\r\n---\r\nWindows body";

        const result = parseAgentRuleFrontmatter(content);

        expect(result.metadata.agents).toEqual(["sisyphus"]);
        expect(result.body).toBe("Windows body");
      });
    });
  });
});
