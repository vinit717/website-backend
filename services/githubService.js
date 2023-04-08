const utils = require("../utils/fetch");
const { fetchUser } = require("../models/users");
/**
 * Extracts only the necessary details required from the object returned by Github API
 * @param data {Object} - Object returned by Github API
 */

const extractPRdetails = (data) => {
  const allPRs = [];
  data.items.forEach(
    ({
      title,
      user,
      html_url: url,
      state,
      created_at: createdAt,
      updated_at: updatedAt,
      repository_url: repositoryUrl,
      labels,
      assignees,
      pull_request: pullRequest,
    }) => {
      const allAssignees = assignees.map((object) => object.login);
      const allLabels = labels.map((object) => object.name);
      const repositoryUrlSplit = repositoryUrl.split("/");
      const repository = repositoryUrlSplit[repositoryUrlSplit.length - 1];
      allPRs.push({
        title,
        username: user.login,
        state,
        createdAt,
        updatedAt,
        repository,
        url,
        labels: allLabels,
        assignees: allAssignees,
      });
    }
  );
  return allPRs;
};

/**
 * Creates the custom API URL with the required params in the format
 * expected by Github
 * https://docs.github.com/en/free-pro-team@latest/rest/reference/search
 * @access private
 * @param searchParams {Object} - List of params to create github API URL
 * @param resultsOptions {Object} - Ordering and pagination of results
 */
const getGithubURL = (searchParams, resultsOptions = {}) => {
  const baseURL = config.get("githubApi.baseUrl");
  const issuesAndPRsPath = "/search/issues";

  const urlObj = new URL(baseURL);
  urlObj.pathname = issuesAndPRsPath;

  const defaultParams = {
    org: config.get("githubApi.org"),
  };

  const finalSearchParams = Object.assign({}, defaultParams, searchParams);

  const paramsObjArr = Object.entries(finalSearchParams);
  const paramsStrArr = paramsObjArr.map(([key, value]) => `${key}:${value}`);

  // The string that can be entrered as text on Github website for simple search
  const prsSearchText = paramsStrArr.join(" ");

  urlObj.searchParams.append("q", prsSearchText);

  // Manipulate returned results
  // e.g number of results, pagination, etc
  Object.entries(resultsOptions).forEach(([key, value]) => {
    urlObj.searchParams.append(key, value);
  });

  const createdURL = urlObj.href;
  return createdURL;
};

/** Create the fetch object to call on github url
 * @access private
 * @param url {string} - URL on github to call
 */
function getFetch(url) {
  return utils.fetch(url, "get", null, null, null, {
    auth: {
      username: config.get("githubOauth.clientId"),
      password: config.get("githubOauth.clientSecret"),
    },
  });
}

/**
 * Fetches the pull requests in Real-Dev-Squad by user using GitHub API
 * @param username {string} - Username String
 */

const fetchPRsByUser = async (username) => {
  try {
    const { user } = await fetchUser({ username });
    const url = getGithubURL({
      author: user.github_id,
      type: "pr",
    });
    return getFetch(url);
  } catch (err) {
    logger.error(`Error while fetching pull requests: ${err}`);
    throw err;
  }
};

/**
 * Fetches the latest `per_page` open PRs
 *
 * Order by default is desc, which will fetch latest open PRs,
 * to fetch stale PRs just change pass order as asc
 *
 */
const fetchOpenPRs = async (params = {}) => {
  const { perPage = 100, page = 1, searchParams = {}, resultOptions = {} } = params;

  try {
    const url = getGithubURL(
      {
        type: "pr",
        is: "open",
        ...searchParams,
      },
      {
        sort: "created",
        per_page: perPage,
        page,
        ...resultOptions,
      }
    );
    return getFetch(url);
  } catch (err) {
    logger.error(`Error while fetching open pull requests: ${err}`);
    throw err;
  }
};

const fetchMergedPRs = async (params = {}) => {
  const { perPage = 100, page = 1, searchParams = {}, resultOptions = {} } = params;

  try {
    const url = getGithubURL(
      {
        type: "pr",
        is: "merged",
        ...searchParams,
      },
      {
        sort: "updated",
        ...resultOptions,
        per_page: perPage,
        page,
      }
    );

    return getFetch(url);
  } catch (err) {
    logger.error(`Error while fetching closed pull requests: ${err}`);
    throw err;
  }
};

const fetchOpenIssues = async (params = {}) => {
  const { perPage = 100, page = 1, searchParams = {}, resultOptions = {} } = params;

  try {
    const url = getGithubURL(
      {
        type: "issue",
        is: "open",
        ...searchParams,
      },
      {
        sort: "created",
        per_page: perPage,
        page,
        ...resultOptions,
      }
    );
    return getFetch(url);
  } catch (err) {
    logger.error(`Error while fetching open issues: ${err}`);
    throw err;
  }
};

const fetchClosedIssues = async (params = {}) => {
  const { perPage = 100, page = 1, searchParams = {}, resultOptions = {} } = params;

  try {
    const url = getGithubURL(
      {
        type: "issue",
        is: "closed",
        ...searchParams,
      },
      {
        sort: "updated",
        per_page: perPage,
        page,
        ...resultOptions,
      }
    );
    return getFetch(url);
  } catch (err) {
    logger.error(`Error while fetching closed issues: ${err}`);
    throw err;
  }
};

module.exports = {
  fetchPRsByUser,
  fetchOpenPRs,
  fetchMergedPRs,
  getFetch,
  extractPRdetails,
  fetchOpenIssues,
  fetchClosedIssues,
};
