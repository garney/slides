/**
 * Built-in Reveal.js theme presets. Custom templates can be added here or via JSON import metadata.
 */
export const TEMPLATES = [
  {
    id: "default",
    name: "Default Light",
    description: "Clean white theme with blue accents",
    revealTheme: "white",
    transition: "slide",
  },
  {
    id: "dark",
    name: "Dark",
    description: "High contrast black background",
    revealTheme: "black",
    transition: "slide",
  },
  {
    id: "night",
    name: "Night",
    description: "Soft dark theme for long sessions",
    revealTheme: "night",
    transition: "fade",
  },
  {
    id: "astro",
    name: "Astro",
    description: "Astro typography over animated space background (minimal or full)",
    revealTheme: "black",
    customTheme: "astro",
    transition: "slide",
    defaultBackgroundScene: "minimal",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple serif layout on white",
    revealTheme: "simple",
    transition: "none",
  },
];

/**
 * @param {string} templateId
 */
export function getTemplate(templateId) {
  return TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
}

export function listTemplates() {
  return TEMPLATES;
}
