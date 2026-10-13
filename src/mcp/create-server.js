import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config/env.js";
import {
  appendSlidesToPublicPresentation,
  createPublicPresentation,
  exportPublicPresentation,
  listPublicPresentations,
  presenterUrl,
  updateSlideInPublicPresentation,
} from "../services/public-presentations.js";

const slideInputSchema = z.object({
  markdown: z
    .string()
    .describe(
      "Reveal-ready Markdown. Keep slides short: one ## heading, at most 4 bullets OR ~8 lines; long content is auto-split but prefer extra slides."
    ),
  layout: z
    .enum(["title", "section", "content", "two-column"])
    .optional()
    .describe("Slide layout (default content)"),
  notes: z.string().optional().describe("Speaker notes"),
  id: z.string().optional().describe("Stable slide id (auto-generated if omitted)"),
});

function textResult(value) {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
  };
}

function errorResult(message) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export function createMySlidesMcpServer() {
  const server = new McpServer({
    name: "my-slides",
    version: "0.1.0",
    websiteUrl: config.publicUrl || undefined,
  });

  server.registerTool(
    "list_public_presentations",
    {
      description:
        "List all public presentations (title, slug, slide count, presenter path). MCP can create, edit slides on, or extend public decks.",
      inputSchema: {},
    },
    async () => {
      try {
        const items = await listPublicPresentations();
        const enriched = items.map((item) => ({
          ...item,
          presentUrl: presenterUrl(config.publicUrl, item.slug),
        }));
        return textResult({ presentations: enriched });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : "list failed");
      }
    }
  );

  server.registerTool(
    "get_public_presentation",
    {
      description: "Fetch full export JSON for a public presentation by slug.",
      inputSchema: {
        slug: z.string().describe("Presentation slug (URL segment after /p/)"),
      },
    },
    async ({ slug }) => {
      try {
        const payload = await exportPublicPresentation(slug);
        if (!payload) {
          return errorResult(`Public presentation not found: ${slug}`);
        }
        return textResult(payload);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : "get failed");
      }
    }
  );

  server.registerTool(
    "create_public_presentation",
    {
      description:
        "Create a new public presentation from a title and slides. Defaults: templateId astro, full Astro space background. Visibility is always public.",
      inputSchema: {
        title: z.string().describe("Presentation title"),
        slides: z
          .array(slideInputSchema)
          .min(1)
          .describe(
            "Slides to create. Use more slides with less text each — dense slides overflow on 16:9."
          ),
        slug: z
          .string()
          .optional()
          .describe("URL slug (kebab-case). Auto-generated from title if omitted."),
        templateId: z
          .enum(["default", "dark", "night", "astro", "minimal"])
          .optional()
          .describe("Reveal template (default astro)"),
        backgroundScene: z
          .enum(["none", "minimal", "full"])
          .optional()
          .describe("Astro space background (default full for MCP creates)"),
        backgroundOpacity: z
          .number()
          .min(0.1)
          .max(1)
          .optional()
          .describe("Background opacity when scene is not none (default 0.5)"),
        meta: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional metadata object stored on the deck"),
      },
    },
    async ({ title, slides, slug, templateId, backgroundScene, backgroundOpacity, meta }) => {
      try {
        const created = await createPublicPresentation({
          title,
          slides,
          slug,
          templateId,
          backgroundScene,
          backgroundOpacity,
          meta,
        });
        return textResult({
          id: created.id,
          slug: created.slug,
          title: created.title,
          visibility: created.visibility,
          slideCount: created.document.slides.length,
          presentUrl: presenterUrl(config.publicUrl, created.slug),
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : "create failed");
      }
    }
  );

  server.registerTool(
    "add_slides_to_public_presentation",
    {
      description:
        "Append slides to an existing public presentation. Fails if the slug is missing or not public.",
      inputSchema: {
        slug: z.string().describe("Existing public presentation slug"),
        slides: z.array(slideInputSchema).min(1).describe("Slides to append"),
      },
    },
    async ({ slug, slides }) => {
      try {
        const updated = await appendSlidesToPublicPresentation(slug, slides);
        return textResult({
          id: updated.id,
          slug: updated.slug,
          title: updated.title,
          slideCount: updated.document.slides.length,
          presentUrl: presenterUrl(config.publicUrl, updated.slug),
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : "add slides failed");
      }
    }
  );

  server.registerTool(
    "update_public_presentation_slide",
    {
      description:
        "Update one slide on an existing public presentation (markdown, layout, or notes). Target by slideId or slideIndex (1-based, first slide is 1).",
      inputSchema: {
        slug: z.string().describe("Existing public presentation slug"),
        slideId: z
          .string()
          .optional()
          .describe("Stable slide id from get_public_presentation (preferred)"),
        slideIndex: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("1-based slide position when slideId is omitted"),
        markdown: z
          .string()
          .optional()
          .describe("New Reveal-ready Markdown for the slide body"),
        layout: z
          .enum(["title", "section", "content", "two-column"])
          .optional()
          .describe("New layout"),
        notes: z.string().optional().describe("New speaker notes"),
      },
    },
    async ({ slug, slideId, slideIndex, markdown, layout, notes }) => {
      try {
        const result = await updateSlideInPublicPresentation(slug, {
          slideId,
          slideIndex,
          markdown,
          layout,
          notes,
        });
        const { updated, slideIndex: index, slideId: id } = result;
        return textResult({
          id: updated.id,
          slug: updated.slug,
          title: updated.title,
          slideIndex: index,
          slideId: id,
          slideCount: updated.document.slides.length,
          presentUrl: presenterUrl(config.publicUrl, updated.slug),
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : "update slide failed");
      }
    }
  );

  server.registerPrompt(
    "create-slides-from-brief",
    {
      description:
        "Guidance for turning a topic brief into my-slides public deck content before calling create_public_presentation.",
      argsSchema: {
        topic: z.string().describe("What the deck should explain"),
        audience: z.string().optional().describe("Who will watch"),
      },
    },
    async ({ topic, audience }) => {
      const audienceLine = audience ? `Audience: ${audience}\n` : "";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${audienceLine}Topic: ${topic}

Plan 6–10 slides: title, optional section dividers, content slides with one idea each.
Use create_public_presentation with templateId "astro" (default). Full space background is applied automatically unless you set backgroundScene.
Each slide needs markdown with ## headings and bullet lists where helpful.
After creating, share presentUrl from the tool result.`,
            },
          },
        ],
      };
    }
  );

  return server;
}
