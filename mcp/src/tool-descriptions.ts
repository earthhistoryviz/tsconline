// Tool descriptions for MCP server tools
// Exported as a single object for import in mcp.ts

const SESSION_GUIDANCE = `SESSION WORKFLOW:
- Reuse the returned sessionId after each tool call.
- A sessionId does NOT need to be connected to an account in order to use tools.
- Unauthenticated sessions can still use tools, inspect datapacks, inspect columns, and generate charts from accessible datapacks.
- Only call login if the user explicitly wants to authenticate or needs account-only resources such as personal datapacks.
- Never reveal sessionId to the user.

LIVE CHART SYNC (getUserStatus):
- Chart state is ALWAYS stale unless getUserStatus was called in this same assistant response.
- For ANY chart modification or discussion of the in-progress chart: getUserStatus first, then updateChartState.
- NEVER call updateChartState using chart state from a previous user message.
- NEVER say getUserStatus was "already called"; call it again every time.
- The user may edit columns, blank slate, widths, or other settings directly in TSCOnline between messages; getUserStatus is the only way to see those changes.

COLUMN DISCOVERY (listColumns):
- Column names are ambiguous without inspection. If you will generate a chart using specific columns (columnToggles), you should have called listColumns on that datapack at some point in the workflow — not guessed names.
- listColumns is NOT required on every message the way getUserStatus is; it is a one-time discovery step per datapack/topic when you need to map a subject to real column names.
- Typical flow for a topic-focused chart: listDatapacks (if needed) → listColumns → getUserStatus → updateChartState with chosen column names in columnToggles.`;

export const TOOL_DESCRIPTIONS = {
  getUserStatus: {
    title: "Get User Status",
    description: `Sync the session with the user's live TSCOnline UI and return the current chart state.

Works with or without authentication.
- Authenticated users: see personal datapacks, saved charts, account info.
- Unauthenticated users: see public datapacks only, empty chart state.
- A valid sessionId does not require account login.

When (mandatory, every time):
- Before every updateChartState call — in the same assistant response, never from a prior message.
- Before discussing or continuing work on a chart that is in progress, because the user may have changed column toggles, blank slate, widths, or other settings in TSCOnline since your last tool call.
- This is live read-before-write sync, not column discovery. Use listColumns separately when you need to know which columns exist in a datapack.

Returns:
- authentication status, user identity (if any), chartState, and currentChartState
- chartState.overrides.hideDatapackDefaults controls the column baseline: false = datapack defaults apply, true = blank slate
- When hideDatapackDefaults is false, chartState.columnToggles contains ONLY explicit leaf-column deltas vs datapack defaults (empty {} means the chart matches defaults)
- Leaves hidden because a parent folder is off are omitted entirely; the off parent folder itself may appear once as { on: false }
- When hideDatapackDefaults is true, chartState.columnToggles lists every effectively-on column (folders and leaves) as positive { on: true } entries
- When hideDatapackDefaults is false, only leaf-column deltas appear; off parent folders may appear once as { on: false }
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
  2. Once a datapack is chosen and the chart will use specific columns, call listColumns to discover real column names for that topic — do not guess. If you are about to set columnToggles, you should already have called listColumns on that datapack in this conversation.
  3. Call getUserStatus (same response) to pick up any live UI edits, then updateChartState with the relevant columns in columnToggles — not datapackTitles alone.
  4. For topic-focused charts, turn the relevant columns on and unrelated columns off whenever practical.
  5. Do not invent time-range or scale overrides just to make the chart "fit" unless the user explicitly asks for them.

  Column visibility (same behavior as the TSCOnline column settings UI):
  - Baseline with hideDatapackDefaults false: datapack defaults are assumed; only send leaf-column deltas in columnToggles
  - Turn OFF a default-on leaf: { "Events": { "on": false } }
  - Turn ON a default-off leaf: { "Ranges": { "on": true } }
  - Width only: { "Age/Stage": { "width": 110 } }
  - Reorder sibling columns: pass a flat columnOrder array with the exact column names in the desired sibling order
  - Blank slate: overrides.hideDatapackDefaults true, then list every kept column (folder or leaf) with { "on": true }
  - Restore datapack defaults: overrides.hideDatapackDefaults false
  - In normal mode, only toggle leaf column names; ancestors are turned on automatically
  - Changes sync to the user's open TSCOnline session in real time before the chart finishes rendering

  Input:
  - { datapackTitles: string[]; overrides?: { fonts?: Record<FontTarget, FontSettings>; [key: string]: unknown }; columnToggles?: Record<string, { on?: boolean; width?: number; enableTitle?: boolean; showAgeLabels?: boolean; fonts?: Record<FontTarget, FontSettings>; }>; columnOrder?: string[]; useCache?: boolean; isCrossPlot?: boolean; sessionId?: string }
  Output data:
  - { directUrl, embeddedChartUrl, currentState }

  Response presentation:
  - Embed the chart image using embeddedChartUrl.
  - Include directUrl as a plain link labeled (link to share) immediately below the image.

  Notes:
  - datapackTitles replaces previous list; toggles/overrides merge into state.
  - Column keys are case-insensitive.
  - If listColumns was used to identify relevant columns, carry those exact leaf names into columnToggles — do not stop at discovery.
  - Do not call updateChartState with topic-specific columnToggles unless listColumns has already been used for that datapack in this conversation.
  - If the user names a specific column, use columnToggles[columnName].fonts, not overrides.fonts.
  - Use overrides.fonts only when the user asks for all columns, every column, global/default fonts, or apply all.
  - FontSettings: { on?: boolean; inheritable?: boolean; fontFace?: "Arial" | "Courier" | "Verdana"; size?: number; bold?: boolean; italic?: boolean; color?: string }. Include on: true when changing fontFace, size, bold, italic, or color. Color must use rgb(r, g, b), for example "rgb(0, 128, 0)", not color names or hex.  - Common FontTargets: "Column Header" = column title/header; "Zone Column Label" = text inside zone columns; "Sequence Column Label" = sequence-column labels; "Event Column Label" = event-column labels; "Popup Body" = popup text.
  - If the user says "column header" or asks to change the column name/title text, use "Column Header".
  - If the user says "text inside the chart" or is ambiguous, prefer the column's own likely label target, such as "Zone Column Label" for zone columns, instead of overrides.fonts.
  - If you used listColumns to identify relevant columns, do not stop there; carry those chosen column names into columnToggles when calling updateChartState.
  - A request like "teach me about planetary systems using this datapack" should usually produce a focused updateChartState call with planet-related columns toggled on, not a bare datapack-only request.
  - columnToggles must be a flat object whose keys are actual column names/identifiers, not the nested object structure returned by listColumns.
  - columnToggles entries may include enableTitle to control whether a column's title is shown.
  - columnToggles entries may include showAgeLabels to control whether a column's age label is shown.
  - columnOrder reorders sibling columns inside each parent group. Use it for changes like swapping Eon and Era.
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
    description: `Return the column hierarchy for given datapacks so you can map a topic to real column names.

Works with or without authentication.
- Works for any datapack the session can access (public or personal).
- No account login is required to inspect columns for accessible public datapacks.

When:
- Before generating any chart that will use columnToggles for a specific topic or subset of data — you should have called listColumns on that datapack at some point; do not invent or guess column names.
- When the user wants a chart about something within a datapack but the exact columns are unknown (e.g. a region, taxon group, or stratigraphic theme — use listColumns to see what exists, then pick matching leaves).
- When the user wants to understand what a datapack covers, even if no chart is generated yet.
- Not required on every message (unlike getUserStatus). Call once per datapack when column names are needed; reuse discovered names in later updateChartState calls, but still call getUserStatus before each update to sync live UI edits.

After identifying relevant columns, pass those exact leaf names into columnToggles on the next updateChartState call. listColumns is discovery only — not the final step.

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
