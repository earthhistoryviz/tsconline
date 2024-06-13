import { observer } from "mobx-react-lite";
import { useParams } from "react-router";

export const DatapackProfile = observer(() => {
  const { id } = useParams();
  return <div>{id}</div>;
});
