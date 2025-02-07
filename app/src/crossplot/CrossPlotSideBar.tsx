import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { context } from "../state";
import styles from "./CrossPlotSideBar.module.css";

export const CrossPlotSideBar: React.FC = observer(() => {
  const { state } = useContext(context);
  return <div className={styles.crossPlotSideBar}>here</div>;
});
