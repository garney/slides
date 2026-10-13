#!/usr/bin/env node
/**
 * Update image.tag in a Helm values file (top-level image: block).
 * Usage: node scripts/lib/update-values-image-tag.js <values.yaml> <tag>
 */
import fs from "fs";

const path = process.argv[2];
const tag = process.argv[3];

if (!path || !tag) {
  console.error("Usage: update-values-image-tag.js <values.yaml> <tag>");
  process.exit(1);
}

const content = fs.readFileSync(path, "utf8");
const pattern = /^  tag: .+$/m;
if (!pattern.test(content)) {
  console.error(`Could not find image.tag in ${path}`);
  process.exit(1);
}

const yamlTag = `'${tag.replace(/'/g, "''")}'`;
fs.writeFileSync(path, content.replace(pattern, `  tag: ${yamlTag}`));
