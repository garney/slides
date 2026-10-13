const MAX_BULLETS_PER_SLIDE = 4;
const MAX_NON_EMPTY_LINES = 14;

/**
 * Split agent-generated slides so content fits the 16:9 presenter (MCP creates only).
 * @param {Array<{ markdown: string; layout?: string; notes?: string; id?: string }>} slides
 */
export function expandSlidesForPresenter(slides) {
  return slides.flatMap((slide) => expandOneSlide(slide));
}

/**
 * @param {{ markdown: string; layout?: string; notes?: string; id?: string }} slide
 */
function expandOneSlide(slide) {
  const markdown = String(slide.markdown || "").trim();
  if (!markdown) {
    return [slide];
  }

  const byHeading = splitOnH2(markdown);
  if (byHeading.length > 1) {
    return byHeading.map((chunk, index) => ({
      ...slide,
      id: index === 0 ? slide.id : undefined,
      markdown: chunk.trim(),
    }));
  }

  const parsed = parseBulletSlide(markdown);
  if (!parsed || parsed.bullets.length <= MAX_BULLETS_PER_SLIDE) {
    if (countNonEmptyLines(markdown) <= MAX_NON_EMPTY_LINES) {
      return [slide];
    }
  }

  if (parsed && parsed.bullets.length > MAX_BULLETS_PER_SLIDE) {
    const chunks = chunkArray(parsed.bullets, MAX_BULLETS_PER_SLIDE);
    return chunks.map((bulletChunk, index) => {
      const heading = index === 0 ? parsed.heading : demoteHeading(parsed.heading);
      const body = [heading, "", ...bulletChunk, parsed.footer].filter(Boolean).join("\n");
      return {
        ...slide,
        id: index === 0 ? slide.id : undefined,
        markdown: body.trim(),
      };
    });
  }

  return [slide];
}

/**
 * @param {string} markdown
 */
function splitOnH2(markdown) {
  const lines = markdown.split("\n");
  const chunks = [];
  let current = [];

  for (const line of lines) {
    if (/^##\s+/.test(line) && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    chunks.push(current.join("\n"));
  }
  return chunks.length > 1 ? chunks : [markdown];
}

/**
 * @param {string} markdown
 */
function parseBulletSlide(markdown) {
  const lines = markdown.split("\n");
  const headingLines = [];
  const bullets = [];
  const footer = [];
  let phase = "heading";

  for (const line of lines) {
    if (/^\s*[-*+]\s+/.test(line)) {
      phase = "bullets";
      bullets.push(line);
      continue;
    }
    if (phase === "bullets" && line.trim() !== "") {
      phase = "footer";
    }
    if (phase === "heading") {
      headingLines.push(line);
    } else if (phase === "footer") {
      footer.push(line);
    }
  }

  if (bullets.length === 0) {
    return null;
  }

  return {
    heading: headingLines.join("\n").trim(),
    bullets,
    footer: footer.join("\n").trim(),
  };
}

/**
 * @param {string} heading
 */
function demoteHeading(heading) {
  if (!heading) {
    return "## (continued)";
  }
  if (/^#\s+/.test(heading) && !/^##\s+/.test(heading)) {
    return heading.replace(/^#\s+/, "## ");
  }
  return heading;
}

/**
 * @param {string} text
 */
function countNonEmptyLines(text) {
  return text.split("\n").filter((line) => line.trim()).length;
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} size
 */
function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
