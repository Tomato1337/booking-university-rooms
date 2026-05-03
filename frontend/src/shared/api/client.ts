import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const apiClient = createClient<paths>({
  baseUrl: "/api",
  credentials: "same-origin",
  fetch: (request: Request) => {
    const headers = new Headers(request.headers);
    headers.set("X-Locale", localStorage.getItem("app_locale") === "en" ? "en" : "ru");
    return fetch(new Request(request, { headers }));
  },
});
