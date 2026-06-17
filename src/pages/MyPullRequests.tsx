import React from "react";
import { ConfigContext } from "../context/ConfigContext";
import { useQueries } from "@tanstack/react-query";
import { PullRequest } from "../models/PullRequest";
import Box from "@mui/material/Box";

import { PullRequestList } from "../components/PullRequestList";
import { Typography } from "@mui/material";
import { useActiveRepositories } from "../hooks/useActiveRepositories";

export const MyPullRequests: React.FC = () => {
  const { clients, repositorySettings, accounts } = React.useContext(ConfigContext);
  const activeRepositories = useActiveRepositories(repositorySettings, clients);
  const accountsByHost = React.useMemo(
    () => new Map(accounts.map((account) => [account.provider.host, account])),
    [accounts]
  );

  const { data, pending } = useQueries({
    queries: activeRepositories.map((repository) => ({
      queryKey: ["pulls", repository.providerHost, repository.fullName],
      queryFn: async () => {
        const pulls = await repository.client.getPullRequests(repository.fullName);
        return pulls.map((pull) => ({
          ...pull,
          providerHost: repository.providerHost,
          repositoryKey: repository.key,
        }));
      },
      enabled:
        clients.length > 0 &&
        activeRepositories.length > 0 &&
        accounts.length > 0,
    })),
    combine: (results) => {
      return {
        data: results
          .map((result) => result.data ?? [])
          .flat()
          .filter((pr) => {
            const login = accountsByHost.get(pr.providerHost ?? "")?.user.login;
            return (
              !!login &&
              (pr.user?.login === login ||
                (pr.assignee as any)?.login === login ||
                pr.assignees?.some((a) => a.login === login) ||
                pr.requested_reviewers?.some((r) => r.login === login))
            );
          }),
        pending: results.some((result) => result.isLoading),
      };
    },
  });

  if (accounts.length === 0) {
    return (
      <Box padding={2} width={"calc(100vw - 2em)"}>
        <Typography component="p">
          You need to be logged in to view your pull requests
        </Typography>
      </Box>
    );
  }

  if (pending && data.length === 0) {
    return (
      <Box padding={2} width={"calc(100vw - 2em)"}>
        <Typography component="p">Loading your pull requests...</Typography>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box padding={2} width={"calc(100vw - 2em)"}>
        <Typography component="p">
          No pull requests found for your account
        </Typography>
      </Box>
    );
  }

  return <PullRequestList pullRequests={data as unknown as PullRequest[]} />;
};
