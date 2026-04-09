import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

export const apiClient = createClient<paths>({
  baseUrl: "/api",
  credentials: "same-origin",
});

const notOkMiddleware: Middleware = {
  onResponse({ response }) {
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return undefined;
  },
};

apiClient.use(notOkMiddleware);
