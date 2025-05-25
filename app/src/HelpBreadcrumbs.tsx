import { Breadcrumbs, Link, Stack, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";
import { getHelpKeysFromPath } from "./state/non-action-util";
import { MarkdownFile, MarkdownParent, isMarkdownFile } from "@tsconline/shared";

type Breadcrumb = {
  to: string;
  title: string;
};
type BreadCrumbsWrapperProps = {
  markdownParent: MarkdownParent;
};

const compileBreadcrumbs = (markdownParent: MarkdownParent | MarkdownFile, keys: string[]) => {
  const pathBreadcrumbs: Breadcrumb[] = [];
  let fullPath = "";
  for (const key of keys) {
    // cast because we know it can't be MarkdownFile
    if (!(markdownParent as MarkdownParent).children[key]) {
      // not valid
      break;
    }
    fullPath += `/${key}`;
    markdownParent = (markdownParent as MarkdownParent).children[key];
    if (isMarkdownFile(markdownParent)) {
      pathBreadcrumbs.push({
        to: (fullPath += `/${markdownParent.pathname}`),
        title: markdownParent.title
      });
    } else {
      pathBreadcrumbs.push({
        to: fullPath,
        title: key
      });
    }
  }
  return pathBreadcrumbs;
};

export const BreadcrumbsWrapper: React.FC<BreadCrumbsWrapperProps> = ({ markdownParent }) => {
  const theme = useTheme();

  const currentPath = useLocation().pathname;
  const navigate = useNavigate();
  const keys = getHelpKeysFromPath(currentPath);
  const pathBreadcrumbs: Breadcrumb[] = compileBreadcrumbs(markdownParent, keys);

  const breadcrumbs: Breadcrumb[] = [{ to: "", title: "All Categories" }, ...pathBreadcrumbs];

  const handleBreadcrumbClick = (breadcrumbPath: string, event: React.MouseEvent) => {
    event.preventDefault();
    navigate(`/help${breadcrumbPath}`);
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={2}>
        <Breadcrumbs
          separator={<span style={{ color: theme.palette.button.main }}>{">"}</span>}
          sx={{ color: theme.palette.button.main }}>
          {breadcrumbs.map((breadcrumb: Breadcrumb, index: number) => (
            <Link
              key={index}
              href={`/help${breadcrumb.to}`}
              onClick={(e) => handleBreadcrumbClick(breadcrumb.to, e)}
              underline="always"
              sx={{ color: theme.palette.button.main }}>
              {breadcrumb.title}
            </Link>
          ))}
        </Breadcrumbs>
      </Stack>

      {breadcrumbs.length > 0 && (
        <div>
          <Typography variant="h4">{breadcrumbs[breadcrumbs.length - 1].title}</Typography>
        </div>
      )}
    </Stack>
  );
};
