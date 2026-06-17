import React from "react";
import Grid from "@mui/material/Grid2";
import { Box, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { TableRows, ViewModule } from "@mui/icons-material";
import { PullRequest } from "../models/PullRequest";
import PullRequestCard from "./Cards/PullRequestCard";
import { PullRequestTable } from "./PullRequestTable";
import { usePersistentState } from "../hooks/usePersistentState";

export type PullRequestViewMode = "table" | "cards";

const isViewMode = (value: unknown): value is PullRequestViewMode =>
  value === "table" || value === "cards";

interface PullRequestListProps {
  pullRequests: PullRequest[];
}

// Renders the pull-request list as either a table (default) or cards, with a
// toggle. The choice is persisted under PR_VIEW_MODE so it's shared across the
// Dashboard and My PRs and remembered between sessions (like DARK_MODE).
export const PullRequestList: React.FC<PullRequestListProps> = ({
  pullRequests,
}) => {
  const [viewMode, setViewMode] = usePersistentState<PullRequestViewMode>(
    "PR_VIEW_MODE",
    {
      defaultValue: "table",
      validator: isViewMode,
      storageType: "localStorage",
    }
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_event, value) => value && setViewMode(value)}
          aria-label="Pull request view mode"
        >
          <ToggleButton value="table" aria-label="Table view">
            <Tooltip title="Table view">
              <TableRows fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="cards" aria-label="Card view">
            <Tooltip title="Card view">
              <ViewModule fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "table" ? (
        <PullRequestTable pullRequests={pullRequests} />
      ) : (
        <Grid container spacing={2}>
          {pullRequests.map(
            (pull) =>
              pull && (
                <Grid
                  key={`${pull.providerHost ?? "github.com"}:${pull.id}`}
                  size={{ xl: 6, xs: 12 }}
                >
                  <PullRequestCard pr={pull} />
                </Grid>
              )
          )}
        </Grid>
      )}
    </Box>
  );
};

export default PullRequestList;
