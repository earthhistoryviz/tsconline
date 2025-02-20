export const links = [
  { to: "/help/presets", label: "Presets" },
  { to: "/help/datapacks", label: "Datapacks" },
  {
    to: "/help/chart",
    label: "Chart",
    children: [
      { to: "/help/chart/what_is_a_chart", label: "What is a chart" },
      {
        to: "/help/chart/column_variants",
        label: "Column Variants",
        children: [
          { to: "/help/chart/column_variants/block_columns", label: "Block Column" },
          { to: "/help/chart/column_variants/point_columns", label: "Point Column" },
          {
            to: "/help/chart/column_variants/event_columns/",
            label: "Event Column",
            children: [
              {
                to: "/help/chart/column_variants/event_columns/dual_column_comparison",
                label: "Dual Column Comparison"
              },
              { to: "/help/chart/column_variants/event_columns/data_mining", label: "Data Mining" }
            ]
          },
          { to: "/help/chart/column_variants/freehand_columns", label: "Freehand Column" }
        ]
      },
      { to: "/help/chart/saving_a_chart", label: "Saving a Chart" }
    ]
  },
  { to: "/help/settings", label: "Settings" },
  { to: "/help/help", label: "Help" },
  { to: "/help/workshops", label: "Workshops" },
  { to: "/help/options", label: "Options" }
];

export default links;
