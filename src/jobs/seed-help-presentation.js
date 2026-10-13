import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { HELP_PRESENTATION_SLUG } from "../config/help.js";
import { getPresentationBySlug, importPresentation } from "../services/presentations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELP_JSON = path.join(__dirname, "../../docs/examples/how-to-create-presentations.json");

async function seedHelpPresentation() {
  const raw = JSON.parse(fs.readFileSync(HELP_JSON, "utf8"));
  const slug = raw.slug || HELP_PRESENTATION_SLUG;

  const existing = await getPresentationBySlug(slug);
  if (existing) {
    await importPresentation(raw, { mode: "replace", targetSlug: slug });
    console.log(`Updated help presentation: /p/${slug}`);
    return;
  }

  await importPresentation(raw, { mode: "create" });
  console.log(`Created help presentation: /p/${slug}`);
}

seedHelpPresentation().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
