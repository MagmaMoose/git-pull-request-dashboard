import React from "react";
import {
  Box,
  Chip,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { DesignServices, FileOpen, Lock, Visibility } from "@mui/icons-material";
import { PullRequest } from "../models/PullRequest";
import { PullRequestChecks } from "./PullRequestChecks";
import { PullRequestsApprovals } from "./PullRequestsApprovals";
import { PullRequestMergeCheck } from "./PullRequestMergeCheck";
import getContrastColor from "../utils/getContractColor";
import replaceEmoticons from "../utils/replaceEmoticons";
import { getColorForDaysInReview } from "../utils/getColorsForDaysInReview";

interface PullRequestTableProps {
  pullRequests: PullRequest[];
}

const daysInReview = (createdAt: Date) =>
  Math.floor(
    (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24)
  );

// Dense, scannable table view of pull requests — the same data the
// PullRequestCard shows, one row per PR. The Checks/Merge/Approvals cells reuse
// the same components as the card, so they fetch their own data identically.
export const PullRequestTable: React.FC<PullRequestTableProps> = ({
  pullRequests,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="Pull requests">
        <TableHead>
          <TableRow>
            <TableCell>PR</TableCell>
            <TableCell>Repository</TableCell>
            <TableCell>Author</TableCell>
            <TableCell>Labels</TableCell>
            <TableCell align="center">Days</TableCell>
            <TableCell align="center">Checks</TableCell>
            <TableCell align="center">Merge</TableCell>
            <TableCell align="center">Approvals</TableCell>
            <TableCell align="center">State</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pullRequests.map((pull) => {
            if (!pull) return null;
            const owner = pull.base.repo.owner.login;
            const repo = pull.base.repo.name;
            return (
              <TableRow
                key={`${pull.providerHost ?? "github.com"}:${pull.id}`}
                hover
              >
                <TableCell sx={{ maxWidth: 360 }}>
                  <Link href={pull.html_url} target="_blank" rel="noopener">
                    #{pull.number}
                  </Link>{" "}
                  {pull.title}
                  {pull.draft && (
                    <Tooltip title="Draft PR">
                      <DesignServices
                        color="secondary"
                        fontSize="inherit"
                        sx={{ ml: 0.5, verticalAlign: "middle" }}
                      />
                    </Tooltip>
                  )}
                  {pull.locked && (
                    <Lock
                      fontSize="inherit"
                      sx={{ ml: 0.5, verticalAlign: "middle" }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <span>{pull.base.repo?.full_name || "Unknown"}</span>
                    {pull.providerHost && (
                      <Typography variant="caption" color="text.secondary">
                        {pull.providerHost}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{pull.user.login}</TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.5,
                      maxWidth: 220,
                    }}
                  >
                    {pull.labels.map((label) => (
                      <Chip
                        key={label.id}
                        label={replaceEmoticons(label.name)}
                        size="small"
                        style={{
                          backgroundColor: `#${label.color}`,
                          color: getContrastColor(`#${label.color}`),
                        }}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={daysInReview(pull.created_at)}
                    size="small"
                    sx={{ bgcolor: getColorForDaysInReview(pull.created_at) }}
                  />
                </TableCell>
                <TableCell align="center">
                  <PullRequestChecks
                    owner={owner}
                    repo={repo}
                    prNumber={pull.number}
                    providerHost={pull.providerHost}
                  />
                </TableCell>
                <TableCell align="center">
                  <PullRequestMergeCheck
                    owner={owner}
                    repo={repo}
                    prNumber={pull.number}
                    providerHost={pull.providerHost}
                  />
                </TableCell>
                <TableCell align="center">
                  <PullRequestsApprovals
                    owner={owner}
                    repo={repo}
                    prNumber={pull.number}
                    providerHost={pull.providerHost}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={pull.state.toUpperCase()}
                    color={pull.state === "open" ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box
                    sx={{ display: "flex", gap: 1, justifyContent: "center" }}
                  >
                    <Link href={pull.html_url} target="_blank" rel="noopener">
                      <Tooltip title="View/Open PR">
                        <Visibility fontSize="small" />
                      </Tooltip>
                    </Link>
                    <Link
                      href={pull.html_url + "/files"}
                      target="_blank"
                      rel="noopener"
                    >
                      <Tooltip title="View Changes">
                        <FileOpen fontSize="small" />
                      </Tooltip>
                    </Link>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PullRequestTable;
