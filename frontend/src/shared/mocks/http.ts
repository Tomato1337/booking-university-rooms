import { createOpenApiHttp } from "openapi-msw";
import type { paths } from "@/shared/api/schema";

export const http = createOpenApiHttp<paths>({
  baseUrl: "/api",
});
