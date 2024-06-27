import { TextField } from "@mui/material";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import "./Search.css";
export const Search = observer(function Search() {
  const [term, setTerm] = useState("");
  return (
    <div className="search-container">
      <TextField
        className="search-bar"
        label="Search"
        variant="outlined"
        size="small"
        fullWidth
        onChange={(e) => setTerm(e.target.value)}
        value={term}
      />
    </div>
  );
});
