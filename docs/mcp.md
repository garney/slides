# my-slides MCP server

Streamable HTTP MCP is served on the **same app** as the CMS (no extra pod).

| Environment | URL |
| --- | --- |
| Test | `https://my-slides.stationalpha.com/mcp` |
| Local | `http://localhost:3090/mcp` |

Set `MCP_ENABLED=false` to disable the endpoint.

## Authentication

When Cognito is enabled (test/prod), **`MCP_API_KEY` is required**. Send it as a Bearer token on every MCP request:

```http
Authorization: Bearer YOUR_MCP_API_KEY
```

Add `MCP_API_KEY` to AWS Secrets Manager JSON (`test/my-slides`, `prod/my-slides`) and list it under Helm `externalSecrets.keys`.

Local dev without Cognito may omit `MCP_API_KEY` (not recommended on any shared host).

## Cursor configuration

```json
{
  "mcpServers": {
    "my-slides": {
      "url": "https://my-slides.stationalpha.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

## Tools (public decks only)

| Tool | Purpose |
| --- | --- |
| `list_public_presentations` | List public decks with presenter URLs |
| `get_public_presentation` | Export JSON for one public slug |
| `create_public_presentation` | Create a new **public** deck (default **astro** template + **full** space background) |
| `add_slides_to_public_presentation` | Append slides to an existing **public** slug |
| `update_public_presentation_slide` | Change one slide by `slideId` or **1-based** `slideIndex` |

Authenticated-only decks cannot be read or modified through MCP.

## Slide length (overflow)

Presenter is **1280×720**. Agents should use **one idea per slide**: about **4 bullets max** or **~8 lines** of markdown. The server **auto-splits** dense bullet slides when you call create/append, but shorter source slides look better. If text still overflows, the slide **scrolls** in the browser.

## Prompt

`create-slides-from-brief` — optional planning prompt before calling `create_public_presentation`.
