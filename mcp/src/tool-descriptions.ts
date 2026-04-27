// Tool descriptions for MCP server tools
// Exported as a single object for import in mcp.ts

const SESSION_GUIDANCE = `SESSION CONTINUITY (CRITICAL):
- You may start with any tool. On the first call only, sessionId may be omitted.
- After you receive a sessionId once, you MUST include it on every subsequent tool call.
- Always use the sessionId from the immediately previous tool response.
- Before each call, check prior tool responses and copy forward the latest sessionId.
- If you omit sessionId after first use, the server may create a new session and state continuity will be lost.
- Each tool response includes: { data: ..., sessionId: "..." }.
- Never reveal sessionId to the end user.`;

export const TOOL_DESCRIPTIONS = {
  getCurrentChartState: {
    title: "Get Current Chart State",
    description: `Returns the current chart state for this session.

Includes datapackTitles, merged overrides, merged columnToggles, and last chart metadata.

When to use:
- Inspect current state before making incremental edits
- Confirm state after updateChartState
- Debug unexpected chart output

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  resetChartState: {
    title: "Reset Chart State",
    description: `Clears chart state for this session.

After reset, chart state is empty until updateChartState is called.

When to use:
- User asks to start over
- You want a clean state before building a different chart

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  updateChartState: {
    title: "Update/Generate Chart",
    description: `Merges chart updates into session state and renders a chart.

Behavior:
- datapackTitles is required on every call and replaces previous datapacks.
- overrides and columnToggles are merged into existing state.
- Column toggle keys are case-insensitive in practice (normalized to lowercase).
- useCache defaults to true.
- isCrossPlot defaults to false.

Input shape:
- {
    datapackTitles: string[];
    overrides?: Record<string, unknown>;
    columnToggles?: Record<string, { on?: boolean; width?: number }>;
    useCache?: boolean;
    isCrossPlot?: boolean;
  sessionId?: string;
  }

Column guidance:
- Prefer column names returned by listColumns (name values only).
- Avoid path-like values (for example "Group/Column").

Output (inside data):
- directUrl
- embeddedChartUrl
- currentState

Response presentation (required after successful updateChartState):
- Always embed the chart image using embeddedChartUrl in Markdown.
- Always show directUrl as a plain user-facing link right under the image.
- Use this exact link label format: "Link to TSC Online: <directUrl>".
- Never omit directUrl when a chart is generated.

Notes:
- This tool does not accept xAxis/yAxis/series/title.
- Supported override keys with known effects include:
  topAge, baseAge, unitsPerMY, skipEmptyColumns, variableColors,
  noIndentPattern, negativeChk, doPopups, enEventColBG,
  enChartLegend, enPriority, enHideBlockLable.

${SESSION_GUIDANCE}`
  },

  listDatapacks: {
    title: "List Available Datapacks",
    description: `Lists datapacks available for chart generation.

Use when:
- Choosing datapacks for updateChartState
- Verifying exact datapack titles

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  listColumns: {
    title: "List Columns",
    description: `Returns the column tree for the provided datapacks.

Use when:
- User asks what columns are available
- You need column names for focused toggling
- You are debugging a failed/ineffective column toggle

Input:
- { datapackTitles: string[]; sessionId?: string }

Column guidance for updateChartState:
- Use column name values from this output.
- Do not send concatenated paths (for example "Parent/Child").

${SESSION_GUIDANCE}`
  },

  login: {
    title: "Login",
    description: `Generates a login URL for the current session.

What to show the user:
- loginUrl

What to keep internal:
- sessionId

Session timing:
- Pre-login sessions expire after 30 minutes.
- Authenticated sessions expire after 4 hours of inactivity.

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  whoami: {
    title: "Who Am I? Am I logged in?",
    description: `Checks authentication status for a session.

Typical outcomes:
- Logged in: returns basic user info
- Session exists but not authenticated yet
- Missing/invalid session: returns login-required style error with a new sessionId

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  uploadDatapack: {
    title: "Upload Datapack",
    description: `Uploads a datapack with metadata, and optional profile image and PDF attachments.

Authentication:
- Requires a valid authenticated sessionId.

Input highlights:
- Provide exactly one datapack source:
  - datapackUri (HTTP/HTTPS URL), or
  - datapackContent (raw inline content)
- Required metadata: title, description
- Optional: datapackFileName, datapackImageUri, pdfFilesUris, contact, date, tags, references, notes, priority

datapackContent requirements:
- Send full raw content exactly as provided
- Preserve tab/newline structure (\\t and \\n boundaries)

Failure handling:
- If title already exists, retry with a distinct title.

${SESSION_GUIDANCE}`
  }
} as const;
