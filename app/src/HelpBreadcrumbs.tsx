import { Breadcrumbs, Link, Stack } from '@mui/material'; // Assuming you are using Material-UI
import { exists } from 'i18next';
import { useLocation } from 'react-router-dom';

export default function HelpBreadcrumbs() {
  const links = [
    { to: "/help/presets", label: "Presets" },
    { to: "/help/datapacks", label: "Datapacks" },
    {
      to: "/help/chart",
      label: "Chart",
      children: [
        { to: "/help/chart/what_is_a_chart", label: "What is a chart?" },
        {
          to: "/help/chart/column_variants",
          label: "Column Variants",
          children: [
            { to: "/help/chart/column_variants/block_columns", label: "Block Column" },
            { to: "/help/chart/column_variants/point_columns", label: "Point Column" },
            {
              to: "/help/chart/column_variants/event_columns/*",
              label: "Event Column",
              children: [
                { to: "/help/chart/column_variants/event_columns/dual_column_comparison", label: "Dual Column Comparison" },
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

  const findBreadcrumbs = (links, path) => {

    let breadcrumbs = [];

    for (let link of links) {
      if (path.startsWith(link.to)) {
        breadcrumbs.push({ to: link.to, label: link.label });

        if (link.children) {
          const childBreadcrumbs = findBreadcrumbs(link.children, path);
          breadcrumbs = [...breadcrumbs, ...childBreadcrumbs];
        }
      }
    }
    return breadcrumbs;
  };

  const breadcrumbs = findBreadcrumbs(links, location.pathname);

  return (
    <Stack spacing={2}>
      <Breadcrumbs separator=">">
        {breadcrumbs.map((breadcrumb, index) => (
          <Link key={index} href={breadcrumb.to}>
            {breadcrumb.label}
          </Link>
        ))}
      </Breadcrumbs>
    </Stack>
  );


}