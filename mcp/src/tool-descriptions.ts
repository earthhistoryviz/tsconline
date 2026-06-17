// Tool descriptions for MCP server tools
// Exported as a single object for import in mcp.ts

const SESSION_GUIDANCE = `SESSION WORKFLOW:
- Chart state is ALWAYS stale unless getUserStatus was called in this same assistant response.
- For ANY chart change: getUserStatus → updateChartState.
- NEVER call updateChartState using chart state from a previous user message.
- NEVER say getUserStatus was "already called"; call it again.
- User may change TSCOnline directly between messages, so getUserStatus is mandatory read-before-write.
- Reuse the returned sessionId after each tool call.
- A sessionId does NOT need to be connected to an account in order to use tools.
- Unauthenticated sessions can still use tools, inspect datapacks, inspect columns, and generate charts from accessible datapacks.
- Only call login if the user explicitly wants to authenticate or needs account-only resources such as personal datapacks.
- Never reveal sessionId to the user.`;

export const TOOL_DESCRIPTIONS = {
  getUserStatus: {
    title: "Get User Status",
    description: `Sync the session with TSCOnline and return the current chart state.

Works with or without authentication.
- Authenticated users: see personal datapacks, saved charts, account info.
- Unauthenticated users: see public datapacks only, empty chart state.
- A valid sessionId does not require account login.

When:
- Always call before any chart modification.

Returns:
- authentication status, user identity (if any), and currentChartState
- loginRequired should not be treated as "you must log in to continue using tools"

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
- Do not ask the user to log in just to use this tool with public or otherwise accessible datapacks.

  - Use ONLY the currentChartState returned by that same-response getUserStatus as the baseline.
  - Never reuse prior chart state, even if it was fetched moments ago.

  Required order:
  1. getUserStatus
  2. updateChartState

  Topic-focused chart workflow:
  1. If the user is still choosing a datapack, call listDatapacks first.
  2. If the user has chosen a datapack but wants a chart about a specific topic within it, call listColumns next.
  3. Then call updateChartState and pass the relevant columns in columnToggles instead of sending only datapackTitles.
  4. For topic-focused charts, turn the relevant columns on and unrelated columns off whenever practical.
  5. Do not invent time-range or scale overrides just to make the chart "fit" unless the user explicitly asks for them.

  Input:
  - { datapackTitles: string[]; overrides?: { fonts?: Record<FontTarget, FontSettings>; [key: string]: unknown }; columnToggles?: Record<string, { on?: boolean; width?: number; fonts?: Record<FontTarget, FontSettings>; }>; useCache?: boolean; isCrossPlot?: boolean; sessionId?: string }

  Output data:
  - { directUrl, embeddedChartUrl, currentState }

  Response presentation:
  - Embed the chart image using embeddedChartUrl.
  - Include directUrl as a plain link labeled (link to share) immediately below the image.

  Notes:
  - datapackTitles replaces previous list; toggles/overrides merge into state.
  - Column keys are case-insensitive.
  - If the user names a specific column, use columnToggles[columnName].fonts, not overrides.fonts.
  - Use overrides.fonts only when the user asks for all columns, every column, global/default fonts, or apply all.
  - FontSettings: { on?: boolean; inheritable?: boolean; fontFace?: "Arial" | "Courier" | "Verdana"; size?: number; bold?: boolean; italic?: boolean; color?: string }. Include on: true when changing fontFace, size, bold, italic, or color. Color must use rgb(r, g, b), for example "rgb(0, 128, 0)", not color names or hex.  - Common FontTargets: "Column Header" = column title/header; "Zone Column Label" = text inside zone columns; "Sequence Column Label" = sequence-column labels; "Event Column Label" = event-column labels; "Popup Body" = popup text.
  - If the user says "column header" or asks to change the column name/title text, use "Column Header".
  - If the user says "text inside the chart" or is ambiguous, prefer the column's own likely label target, such as "Zone Column Label" for zone columns, instead of overrides.fonts.
  - If you used listColumns to identify relevant columns, do not stop there; carry those chosen column names into columnToggles when calling updateChartState.
  - A request like "teach me about planetary systems using this datapack" should usually produce a focused updateChartState call with planet-related columns toggled on, not a bare datapack-only request.
  - columnToggles must be a flat object whose keys are actual column names/identifiers, not the nested object structure returned by listColumns.
  - Do not concatenate parent and child names with dots or arrows. For example, use "Period (Lunar)" or "Events (Lunar)", not "Moon.Period (Lunar)" or "Planetary Time Scale.Events (Lunar)".
  - The nested structure from listColumns is only for discovery. Convert the selected leaf column names into flat columnToggles keys for updateChartState.
  - Example: if listColumns shows Planetary Time Scale > Moon > Period (Lunar), then updateChartState should use { "Period (Lunar)": { "on": true } }.
  - Prefer leaving overrides empty unless the user explicitly asks to change age range, vertical scale, colors, or other chart settings.
  - In particular, do not set topAge, baseAge, or unitsPerMY by default for topic-focused charts.
  - If the user did not request a time-range change, preserve the datapack's natural/default time extent.
  - Never guess a large age range such as 4500 just because a topic is planetary; only use such values if the user requested them or provided them.
  - Remember that topAge must be less than baseAge.

  ${SESSION_GUIDANCE}`
  },

  listDatapacks: {
    title: "List Available Datapacks",
    description: `Return available datapack titles (fallback only).

Works with or without authentication.
- Authenticated users: see personal datapacks + public datapacks.
- Unauthenticated users: see public datapacks only.
- Do not redirect the user to login just to explore available public datapacks.

When:
- Only after updateChartState fails due to unknown datapack names, or when user asks.
- Use when the user is trying to learn what datapacks are available to them.
- Use when the user wants help choosing which datapack would be best for a topic or goal.
- Use before listColumns if the user has not chosen a datapack yet and is still exploring options.

Input:
- { sessionId?: string }

${SESSION_GUIDANCE}`
  },

  listColumns: {
    title: "List Columns",
    description: `Return columns for given datapacks (fallback only).

Works with or without authentication.
- Works for any datapack the session can access (public or personal).
- No account login is required to inspect columns for accessible public datapacks.

When:
- Only after updateChartState fails due to unknown column names, or when user asks.
- Use when the user wants to understand what a specific datapack covers.
- Use when the user asks about a specific subject inside a chosen datapack (for example, planets, climate, or stratigraphy within that datapack).
- Use to inspect the available columns so you can judge which columns would help answer the user's topic-specific question or build the most relevant chart.
- After identifying the relevant columns, use those exact column names to drive the next updateChartState call.
- Do not treat listColumns as the final step for a chart request; it is a discovery step that should inform columnToggles.

Response format:
- { datapackTitles: string[], columns: { nested structure of column names } }
- This nested response is for understanding the datapack, not for direct reuse as columnToggles.
- Parent groups such as "Planetary Time Scale" and "Moon" describe context; the selectable chart columns are typically the leaf names inside those groups.

Input:
- { datapackTitles: string[]; sessionId?: string }

${SESSION_GUIDANCE}`
  },

  login: {
    title: "Login",
    description: `Create a login URL for TSCOnline account authentication.

When:
- Call only if the user asks to log in, or when they want access to personal datapacks.
- Login is optional; charts can be generated with public datapacks without authentication.
- Do not call login just because a session is unauthenticated.
- Do not call login as part of the normal flow for public datapacks, listDatapacks, listColumns, or updateChartState.

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
