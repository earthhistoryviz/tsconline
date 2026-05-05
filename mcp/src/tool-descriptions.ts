// Tool descriptions for MCP server tools
// Exported as a single object for import in mcp.ts

const SESSION_GUIDANCE = `SESSION WORKFLOW:
- Chart state is ALWAYS stale unless getUserStatus was called in this same assistant response.
- For ANY chart change: getUserStatus → updateChartState.
- NEVER call updateChartState using chart state from a previous user message.
- NEVER say getUserStatus was "already called"; call it again.
- User may change TSCOnline directly between messages, so getUserStatus is mandatory read-before-write.
- Reuse the returned sessionId after each tool call.
- Only call login if getUserStatus returns loginRequired: true.
- Never reveal sessionId to the user.`;

export const TOOL_DESCRIPTIONS = {
  getUserStatus: {
    title: "Get User Status",
    description: `Sync the session with TSCOnline and return the current chart state.

Works with or without authentication.
- Authenticated users: see personal datapacks, saved charts, account info.
- Unauthenticated users: see public datapacks only, empty chart state.

When:
- Always call before any chart modification.

Returns:
- authentication status, user identity (if any), and currentChartState

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
    description: `Apply modifications and render a chart.

Works with or without authentication.
- No login required to generate charts.
- Unauthenticated users can use public datapacks or upload their own.
- Authenticated users can also use their personal account datapacks.

  - Use ONLY the currentChartState returned by that same-response getUserStatus as the baseline.
  - Never reuse prior chart state, even if it was fetched moments ago.

  Required order:
  1. getUserStatus
  2. updateChartState

  Input:
  - { datapackTitles: string[]; overrides?: Record<string, unknown>; columnToggles?: Record<string, { on?: boolean; width?: number }>; useCache?: boolean; isCrossPlot?: boolean; sessionId?: string }

  Output data:
  - { directUrl, embeddedChartUrl, currentState }

  Response presentation:
  - Embed the chart image using embeddedChartUrl.
  - Include directUrl as a plain link labeled (link to share) immediately below the image.

  Notes:
  - datapackTitles replaces previous list; toggles/overrides merge into state.
  - Column keys are case-insensitive.

  ${SESSION_GUIDANCE}`
  },

  listDatapacks: {
    title: "List Available Datapacks",
    description: `Return available datapack titles (fallback only).

Works with or without authentication.
- Authenticated users: see personal datapacks + public datapacks.
- Unauthenticated users: see public datapacks only.

When:
- Only after updateChartState fails due to unknown datapack names, or when user asks.

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  listColumns: {
    title: "List Columns",
    description: `Return columns for given datapacks (fallback only).

Works with or without authentication.
- Works for any datapack the session can access (public or personal).

When:
- Only after updateChartState fails due to unknown column names, or when user asks.

Input:
- { datapackTitles: string[]; sessionId?: string }

${SESSION_GUIDANCE}`
  },

  login: {
    title: "Login",
    description: `Create a login URL when authentication is required.

When:
- Call only if getUserStatus reports loginRequired: true.

Returns:
- { loginUrl }

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  uploadDatapack: {
    title: "Upload Datapack",
    description: `Upload a datapack.

Authentication required for organized ownership.
- Unauthenticated users: can upload, but datapack will not be tied to an account.
- Authenticated users: datapack is stored under their account.

Input highlights:
- Provide exactly one source: datapackUri or datapackContent.
- Required: title, description.

${SESSION_GUIDANCE}`
  }
} as const;
