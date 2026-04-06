// Tool descriptions for MCP server tools
// Exported as a single object for import in mcp.ts

export const TOOL_DESCRIPTIONS = {
  getCurrentChartState: {
    title: "Get Current Chart State",
    description: `What it does: returns the server's current chart configuration (datapacks, merged overrides, column toggles, last chart path/time).

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

This tool (like ALL tools) returns: { "data": {...}, "sessionId": "uuid" }
The sessionId flows through: listDatapacks → login → whoami → updateChartState → (etc)

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId on subsequent calls breaks the session chain and creates a NEW session (losing all previous state).

    When to use:
    - Before incremental changes (see what's set)
    - After updateChartState (verify changes)
    - When debugging why a chart looks a certain way

    Input: { sessionId?: string }
    - sessionId: REQUIRED (except first call) - the sessionId from your previous tool call

    Example output shape:
    {
      "data": {
        "datapackTitles": ["Africa Bight"],
        "overrides": { "topAge": 0, "baseAge": 65 },
        "columnToggles": { "off": ["nigeria coast"], "on": [] },
        "lastChartPath": "/charts/...",
        "lastModified": "..."
      },
      "sessionId": "uuid-to-use-in-next-call"
    }`
  },
  resetChartState: {
    title: "Reset Chart State",
    description: `What it does: clears the server's current chart configuration for this session. Next updateChartState call starts fresh.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

WARNING: Omitting sessionId breaks the session chain and creates a NEW session (losing all previous state).

    When to use:
    - Usually if a user says "start over" or "clear everything"
    - If state feels too confusing and you want a clean slate
    - When a user has asked for a different datapack then their last chart, it is likely they want to reset state (since datapack settings persist across calls)
    - Starting a brand new chart setup
    - State feels confusing; you want a clean slate

    Input: { sessionId?: string }
    - sessionId: REQUIRED (except first call) - the sessionId from your previous tool call`
  },

  updateChartState: {
    title: "Update/Generate Chart",
    description: `What it does: merges into the chart state and triggers chart render. Returns the generated chart SVG and updated state.


====================
!!! CRITICAL COLUMN TOGGLING RULES !!!
====================
**You MUST use ONLY the name property from listColumns for column toggles.**
**NEVER use slashes, paths, or concatenated names.**

CORRECT: { columnToggles: { on: ["Moon", "Mars"] } }
INCORRECT: { columnToggles: { on: ["Planetary Time Scale/Moon"] } }

When the user requests a focus on a topic (e.g., "dinosaurs"), you MUST search all column names in listColumns for relevant matches (including partial, plural, or related terms) and turn on ALL that apply. Do not just toggle a single exact match—find and enable all columns related to the topic.

Example:
User: "Show me a chart focused on mammals"
AI: (searches listColumns, finds "Mammals", "Mammal Evolution", "Early Mammals", etc., and turns them all on)

Before sending, CHECKLIST:
- Are all column names exactly as shown in the name property from listColumns? (case-insensitive)
- No slashes, no paths, no concatenation, no parent/child structure—just the name.
- If the user was vague, did you search for and enable all relevant columns?

====================
!!! CRITICAL TIME SCALE RULES !!!
====================
**NEVER include topAge, baseAge, or unitsPerMY in overrides unless the user has directly requested a value.**
**If the user does NOT mention a time range or scale, DO NOT send any of these keys in the payload. Let the server use its own defaults.**

INCORRECT: {overrides: {topAge: 0, baseAge: 4500}} (unless user asked for this)

====================

CRITICAL REQUIREMENT: Every call MUST include datapackTitles (array, non-empty). Partial updates are allowed for overrides and columnToggles, but datapacks cannot be omitted.
A good workflow is to try to use the datapackTitles given to you (or what you assume the user wants). And should chart generation fail, you can always call listDatapacks to see available options.
If you are suspicious of a given chart name or are unsure which datapacks to use, first call listDatapacks to see available options. Try to best align with existing + expected datapacks.

When to use:
- First chart or changing datapacks: provide datapackTitles (required).
- Adjust time/settings: provide overrides (object, optional). Only known keys have guaranteed effect; unknown keys are accepted but may be ignored by the renderer.
- Toggle columns: provide columnToggles with on/off arrays (optional). Just use the column names the user gives you - assume they're correct. Case-insensitive; exclusive on/off (adding to off removes from on).
- Debugging: always set useCache to true

Column toggling workflow:
- If user says "turn off column X": just do it with { columnToggles: { off: ["X"] } }
- Don't pre-emptively call listColumns to verify names
- Only if chart generation FAILS or user complains about missing columns, or user is exploring and asking for help learning/focusing on an area of a datapack, THEN call listColumns to see available options
- When putting column names in on/off toggles, you MUST use the name property from listColumns output exactly as shown (case-insensitive, no paths, no concatenation, no slashes). Just the name.

NEVER change or adjust the time scale (topAge/baseAge/unitsPerMY) unless the user explicitly asks for a time range or scale change. Never default to 0–4500 Ma unless explicitly requested.

Payload shape (ALWAYS FOLLOWS THIS SHAPE):
{ datapackTitles: string[]; overrides?: Record<string, unknown>; columnToggles?: { on?: string[]; off?: string[] }; useCache?: boolean; isCrossPlot?: boolean; sessionId?: string }

This tool does NOT accept chart geometry/axes/series. Do not send xAxis/yAxis/series/title. Use datapacks + overrides + column toggles only.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

Example flow: listDatapacks → (get sessionId) → login WITH THAT sessionId → (get sessionId) → updateChartState WITH THAT sessionId

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId on subsequent calls breaks the session chain and creates a NEW session (losing all previous state).

Response format:
{
  "data": { "message": "Chart generated!", "directUrl": "...", "embeddedChartUrl": "...", "currentState": {...} },
  "sessionId": "uuid-to-use-in-next-call"
}

Important notes:
- Do NOT wrap payload twice. In MCP Inspector's per-field input, enter {...} directly, not { overrides: {...} }.
- Unknown override keys are allowed by the schema but may be silently ignored by the renderer.
- Only these override keys are officially supported: topAge, baseAge, unitsPerMY, skipEmptyColumns, variableColors, noIndentPattern, negativeChk, doPopups, enEventColBG, enChartLegend, enPriority, enHideBlockLable.

useCache behavior: it should ALWAYS be true for predictable results, no matter what. Setting to false may yield unexpected charts due to caching logic.

Don't invent chart structure from thin air; always build incrementally from existing state. The only exception is the first call after resetChartState, which starts fresh.
Follow these patterns ALWAYS (don't invent stuff):

Example 1 (minimal/default/basic):
{ "datapackTitles": ["Africa Bight"] }

Example 2 (override topAge, baseAge, and vertical scale):
{
  "datapackTitles": ["GTS2020"],
  "overrides": { "topAge": 0, "baseAge": 100, "unitsPerMY": 2 },
  "useCache": true
}

Example 3 (toggle columns by id, change overrides):
{
  "datapackTitles": ["GTS2020"],
  "overrides": { "topAge": 5, "baseAge": 150 },
  "columnToggles": { "on": ["column-id-1"], "off": ["column-id-2"] },
  "useCache": true
}

These are just examples for changing datapacks, overrides, and column toggles. You can mix and match as needed.

Remember: datapack settings will persist across calls until resetChartState is used. If a column is toggled off, it stays off until explicitly toggled on again. Same with toggling it on.
The point is you only have to include the changes you want to make; the rest of the state is preserved automatically.

AUTO-DISPLAY REQUIREMENT (default behavior):
After every successful updateChartState call, the assistant MUST immediately display the generated chart inline in the conversation.

This is an example for how to display it in Markdown with an embedded image:

Use the url marked as <![Chart] below to embed the chart image like this:
![Chart](https://pr-preview.geolex.org/public/charts/b3427e1d4e367edd668b65695e4df0f4/chart.svg)

so ![Chart](<INSERT_RETURNED_CHART_URL_HERE>)

There are 2 URLs in the response. Use the one labeled as <Embedded Chart URL> for embedding the image in Markdown. Do not display this link to the user directly; it's for embedding only. Use the URL marked as Direct URL to show the user the direct link to the chart.

Example response snippet:
{
  "content": [
    {
      "type": "text",
      "text": "Chart generated!\n\nDirect URL: https://pr-preview.geolex.org/chart-view?mcpChartState=eyJkYXRhcGFja3MiOlsiQWZyaWNhIEJpZ2h\n\nCurrent state:\n{...}\n\n<Embedded Chart URL>: https://pr-preview.geolex.org/public/charts/b3427e1d4e367edd668b65695e4df0f4/chart.svg"
    },
}

The assistant MUST embed the chart image using the returned chart URL in a Markdown image tag as shown above.

The assistant SHOULD still provide the direct URL as plain text under the embed.`
  },

  listDatapacks: {
    title: "List Available Datapacks",
    description: `What it does: lists datapacks you can use when building a chart.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

This tool (like ALL tools) returns: { "data": [...], "sessionId": "uuid" }
The returned sessionId MUST be passed to your NEXT tool call (whether it's login, updateChartState, or any other tool).

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId on subsequent calls breaks the session chain and creates a NEW session.

    When to use:
    - First step before selecting datapacks
    - Need to confirm titles/ids available

    Input: { sessionId?: string }
    - sessionId: REQUIRED (except first call) - the sessionId from your previous tool call
    - Do not wrap payload twice (no nested { input: {...} }).`
  },

  listColumns: {
    title: "List Columns",
    description: `What it does: returns a tree of column names (and defaultOn status) for the given datapacks.


  ====================
  !!! CRITICAL COLUMN TOGGLING RULES !!!
  ====================
  **For toggling columns, you MUST use ONLY the name property of the node in the listColumns output.**
  **Never use a path, never concatenate parent/child names, never use slashes or build a path.**
  **The value to use is always exactly as shown in the name property, regardless of depth or parent.**

  CORRECT: ["Moon", "Mars"]
  INCORRECT: ["Planetary Time Scale/Moon"]

  When the user requests a focus on a topic (e.g., "mammals"), you MUST search all column names in listColumns for relevant matches (including partial, plural, or related terms) and turn on ALL that apply. Do not just toggle a single exact match—find and enable all columns related to the topic.

  Example:
  User: "Show me a chart focused on mammals"
  AI: (searches listColumns, finds "Mammals", "Mammal Evolution", "Early Mammals", etc., and turns them all on)

  All nodes in the listColumns tree—both parent and leaf nodes—are valid, toggleable columns. You may use the name of any node (parent or leaf) as a valid column toggle in updateChartState. Do not assume only the deepest nodes are toggleable.

  If a user requests to make a chart with a datapack and asks for extra knowledge (e.g., about planets), you MUST run listColumns on that datapack before assuming it lacks relevant information. Only suggest creating or uploading a new datapack if listColumns confirms there are no relevant columns.

  WHEN TO USE THIS:
  - User explicitly ASKS "what columns are available?" or "show me the columns"
  - updateChartState FAILED and you need to troubleshoot which columns actually exist
  - User complains about missing columns after chart generation
  - The user has a vaguer question about some of the charts. For instance, they ask to see a chart focusing on "Dinosaurs" or "Planetary" from a certain datapack—use listColumns to see if there are any relevant columns to turn on and turn everything else off for a more focused chart.

  IMPORTANT:
  - Do NOT change the chart's time scale (topAge, baseAge, or unitsPerMY) unless the user specifically asks for a time range or scale change. Never default to the full 0–4500 Ma range unless explicitly requested.
  - When building a focused chart (e.g., for planetary topics), use listColumns to identify relevant columns, but only adjust the time scale if the user requests it.
  - The returned column names (name property) are what you should use for toggling columns in updateChartState. Do not include paths, do not concatenate names, do not use slashes—just the name.

  WHEN NOT TO USE:
  - Before calling updateChartState "just to check"—DON'T do this!
  - User says "turn off column X"—just trust them and call updateChartState directly
  - Preemptively verifying column names—unnecessary, wastes time

  Workflow: ALWAYS call listColumns before updateChartState. Trust user's column names → updateChartState fails? → THEN call listColumns to debug

  === SESSION MANAGEMENT (CRITICAL) ===
  Session continuity is MANDATORY across ALL tool calls in a conversation.
  After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

  WARNING: Omitting sessionId breaks the session chain and creates a NEW session (losing all previous state).

  Input: { datapackTitles: string[], sessionId?: string }
  - Titles must exist (see listDatapacks)
  - sessionId: REQUIRED (except first call) - the sessionId from your previous tool call
  - Do not wrap payload twice (no nested { input: {...} })

  Example: { "datapackTitles": ["GTS2020"], "sessionId": "<from-previous-call>" }`
  },

  login: {
    title: "Login",
    description: `Generate a login link for user authentication.

========================================================================
CRITICAL: The sessionId is a SECRET. NEVER display the sessionId to the user.
It must ONLY be used in subsequent internal tool calls.
========================================================================

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

EXAMPLE: If you just called listDatapacks and received sessionId "abc-123", you MUST pass "abc-123" to THIS login call.
The session chain flows: listDatapacks → (returns sessionId) → login WITH THAT sessionId → (returns sessionId) → next tool WITH THAT sessionId

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId when you already have one breaks the chain and creates a NEW session (user will see different states).

What to show the user:
- loginUrl ONLY - this is the ONLY thing the user should see

What to keep internal:
- sessionId - store this for passing to tool calls, DO NOT display it

Session lifecycle:
- Pre-login sessions: 30 minutes valid
- After login completed: session valid for 10 minutes of inactivity
- Pass sessionId to tool calls to track activity and extend session

Response format: { "data": { "message": "...", "loginUrl": "..." }, "sessionId": "uuid-string" }`
  },

  whoami: {
    title: "Who Am I? Am I logged in?",
    description: `What it does: Check if you're logged in and get user details.
    If the user pastes a GeoGPT session ID from TSC Online into chat, call this tool with that sessionId.
    If valid, this confirms which logged-in user that session belongs to.
    After a successful call, continue using that same sessionId for future authenticated tool calls in this conversation.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

EXAMPLE: If you just called login and received sessionId "abc-123", you MUST pass "abc-123" to THIS whoami call to check the status of THAT specific session.

WARNING: Omitting sessionId breaks the session chain and creates a NEW session (you'll check a different session, not the one you just created with login).

REMINDER: sessionId is internal only - don't show it to the user!

Returns one of three states:
1. LOGGED IN: Returns user object (username, email, isAdmin, etc.) → session is authenticated
2. NOT YET AUTHENTICATED: Session exists but user hasn't completed login → show login link again or wait
3. AUTO-CREATED NEW SESSION: If session expired/omitted, a new one is automatically created

Input: { sessionId?: string }
- sessionId: REQUIRED (except first call) - the sessionId from your previous tool call

Session Expiration Rules:
- Pre-login: 30 minutes from creation (user must complete login within 30 min)
- Authenticated: 10 minutes of inactivity (any tool call resets timer)
- Invalid/expired: Auto-replaced with new session on any tool call`
  },
  uploadDatapack: {
    title: "Upload Datapack",
    description: `Upload a datapack file to the server as well as meta data, profile picture, and optional pdf files. The user uploads the datapack file, optional profile picture, and optional pdf files to the AI, the AI saves the file at some internal storage and serves the HTTP/HTTPS URL.

    When to use:
    - user asks to upload a datapack
    - user provides the datapack file, optional profile picture, and optional pdf files


    Input:
    - datapackUri OR datapackContent: The datapack file to upload.
      - datapackUri: HTTP/HTTPS URL to fetch file bytes.
      - datapackContent: Raw datapack content as a string (for direct tool input).
        IMPORTANT FOR datapackContent:
        - Include the full raw datapack content, not just metadata or a summary.
        - Preserve the original structure exactly.
        - ALWAYS preserve tab and newline delimiters using \t between columns and \n between rows.
        - Do not omit blank lines, header rows, or user-provided metadata lines.
        - Before calling the tool, verify the datapackContent string matches the user's provided content exactly.
    - datapackFileName: The name of the datapack file. If not provided, the AI should try to send filename from the user uploaded datapack. 
    - title: The title of the datapack
    - description: The description of the datapack
    - datapackImageUri: A HTTP or HTTPS URL of the profile picture file uploaded to cloud storage by the AI. If not provided, the profile picture will not be uploaded.
    - pdfFilesUris: Array of HTTP or HTTPS URLs of the pdf files uploaded to cloud storage by the AI. If not provided, the pdf files will not be uploaded.
    - contact: The contact of the datapack (optional)
    - date: The date of the datapack (optional)
    - tags: The tags of the datapack (optional)
    - notes: The notes of the datapack (optional)
    - priority: An integer priority of the datapack (optional)
    
    Note about file Uploads:
    - A user will upload a datapack file. The user may also upload a profile picture and a number of attached pdfs. If there is confusion of which file is the datapack, profile picture, or pdfs, the AI should ask the user to clarify. 
    - Do not generate fake tags, references or notes unless a user prompts you to do so.
    - If an upload fails because the title already exists, retry with a distinct title such as appending a version suffix or timestamp.
    
    `
  }
} as const;
