import {
  Button,
  ButtonProps,
  Divider,
  FormControlLabel,
  IconButton,
  SvgIcon,
  SvgIconProps,
  Tab,
  Tabs,
  Tooltip,
  TooltipProps,
  Typography,
  styled,
  useTheme
} from "@mui/material";
import { SubMenu, MenuItem } from "@szhsin/react-menu";
import Color from "color";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import styles from "./TSCComponents.module.css";
import SecurityResearch from "../assets/icons/security-research.json";
import Lottie from "./TSCLottie";

export const ColoredIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main
}));
export const TabWrapper = styled(Tab, { shouldForwardProp: (prop) => prop !== "showIndicator" })<{
  showIndicator?: boolean;
}>(({ theme, showIndicator }) => ({
  textTransform: "none",
  minHeight: "auto",
  justifyContent: "flex-start",
  borderRadius: "10px",
  marginLeft: "5px",
  "&.Mui-selected": {
    backgroundColor: Color(theme.palette.button.main).alpha(0.15).string(),
    transition: "background-color 0.3s"
  },
  ...(showIndicator && {
    "&::before": {
      content: '""',
      position: "absolute",
      bottom: "10px",
      left: 0,
      width: "1px",
      height: "22px",
      backgroundColor: theme.palette.button.main,
      transition: "width 0.3s ease"
    }
  }),
  "&:hover:not(.Mui-selected)": {
    backgroundColor: Color(theme.palette.button.light).alpha(0.1).string(),
    transition: "background-color 0.3s"
  }
}));
export const TabsWrapper = styled(Tabs, {
  shouldForwardProp: (prop) => prop !== "width"
})<{
  width?: string;
}>(({ width }) => ({
  width: width ?? "180px",
  justifyContent: "flex-start",
  "& .MuiTabs-indicator": {
    display: "none"
  }
}));

export const CustomHeader = styled(Typography)(({ theme }) => ({
  "&::before": {
    backgroundColor: theme.palette.icon.main,
    content: '""',
    left: "0",
    width: "2px",
    position: "absolute",
    height: "20px",
    borderRadius: "2px"
  },
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "left",
  fontSize: "1.1rem",
  paddingLeft: "21px",
  paddingBottom: "30px"
}));

export const CustomDivider = styled(Divider)(() => ({
  height: "0.05px",
  width: "100%",
  backgroundColor: "rgba(197, 197, 197, 0.281)"
}));
export const TSCInputAdornment = styled("div")(
  () => `
  margin-left: auto;
  margin-right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: 400;
  line-height: 1.5;
  grid-row: 1/3;
  grid-column: 2;`
);
export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  backgroundColor: theme.palette.secondaryBackground.main
}));
export const StyledScrollbar = styled(SimpleBar)(({ theme, color }) => {
  const backgroundColor = color || theme.palette.scrollbar.main;
  return {
    height: "100%",
    width: "100%",
    "& .simplebar-scrollbar:before": {
      backgroundColor: backgroundColor
    },
    "& .simplebar-scrollbar.simplebar-visible.simplebar-hover:before": {
      backgroundColor: `${Color(backgroundColor).lighten(0.15)}`
    },
    "& .simplebar-track": {
      backgroundColor: Color(backgroundColor).darken(0.8).alpha(0.1).string()
      // this is if we ever decide to make scrollbars "clickable"
      // cursor: "pointer",
    }
  };
});
export const BorderedIcon = ({
  component,
  className,
  strokeWidth,
  ...props
}: {
  component: React.ElementType<object>;
  className?: string;
  strokeWidth?: number;
} & SvgIconProps) => {
  return (
    <SvgIcon
      className={className}
      component={component}
      style={{
        fontSize: 40,
        fill: "currentColor",
        stroke: "black",
        strokeWidth: strokeWidth || "0.5"
      }}
      {...props}
    />
  );
};
export const TSCSubMenu = styled(SubMenu)(({ theme }) => ({
  "&.szh-menu__submenu > .szh-menu__item--hover": {
    backgroundColor: theme.palette.action.hover
  },
  "&.szh-menu__item--hover": {
    backgroundColor: theme.palette.secondaryBackground.main
  }
}));
export const TSCMenuItem = styled(MenuItem)(({ theme }) => ({
  "&.szh-menu__item--hover": {
    backgroundColor: theme.palette.action.hover
  }
}));

type CustomTooltipProps = {
  offset?: number[];
} & TooltipProps;
export const CustomTooltip: React.FC<CustomTooltipProps> = ({ offset = [0, -10], ...props }) => {
  return <Tooltip arrow PopperProps={{ modifiers: [{ name: "offset", options: { offset } }] }} {...props} />;
};

export const CustomFormControlLabel = styled(FormControlLabel)(
  ({ width, fontSize }: { width?: number; fontSize?: string }) => ({
    width: width || "105px",
    "& .MuiTypography-root": {
      fontSize: fontSize || "0.8rem"
    }
  })
);
export const TagButton: React.FC<ButtonProps> = ({ ...props }) => {
  return <Button {...props} className={styles.tagbutton} sx={{ color: "backgroundColor.contrastText" }} />;
};

type NotImplementedProps = {
  size?: "small" | "medium" | "large";
};
export const NotImplemented: React.FC<NotImplementedProps> = ({ size = "large" }) => {
  const width = size === "small" ? 200 : size === "medium" ? 300 : 500;
  const height = size === "small" ? 200 : size === "medium" ? 300 : 500;
  return (
    <div className={styles.notimplemented}>
      <Lottie animationData={SecurityResearch} width={width} height={height} autoplay loop />
      <Typography variant="h5">Not Yet Implemented</Typography>
      <Typography>Stay tuned for updates!</Typography>
      <Attribution>
        <a
          href="https://iconscout.com/lottie-animations/security-research"
          className="text-underline font-size-sm"
          target="_blank"
          rel="noreferrer">
          Security Research
        </a>{" "}
        by{" "}
        <a href="https://iconscout.com/contributors/nanoagency" className="text-underline font-size-sm">
          nanoagency
        </a>{" "}
        on{" "}
        <a href="https://iconscout.com" className="text-underline font-size-sm">
          IconScout
        </a>
      </Attribution>
    </div>
  );
};

export const Attribution = ({ children }: { children: React.ReactNode }) => {
  return <div className={styles.attribution}>{children}</div>;
};

export const CheckIcon = () => {
  const theme = useTheme();
  return (
    <svg width="20px" height="20px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle
        className={styles.circle}
        color={theme.palette.button.main}
        cx="10"
        cy="10"
        r="9"
        fill={Color(theme.palette.button.light).alpha(0.2).string()}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        className={styles.check}
        color={theme.palette.button.main}
        d="M6 10 l2.5 3 l5 -5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const Loader = () => {
  return (
    <svg className={styles.spinner} viewBox="0 0 22 22">
      <defs>
        <clipPath id="loaderClip">
          <rect x="10" y="10" width="22" height="22" />
        </clipPath>
      </defs>
      <circle stroke="darkgray" cx="11" cy="11" r="9" fill="none" strokeWidth={1.2} />
      <circle
        className={styles.spinnerPath}
        cx="11"
        cy="11"
        r="9"
        fill="none"
        strokeWidth={1.2}
        clipPath="url(#loaderClip)"
      />
    </svg>
  );
};
