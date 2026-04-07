import { HttpResponse } from "msw";

function createHttpErrorClass(status: number, name: string) {
  return class extends Error {
    constructor(message?: string) {
      super(message);
      this.name = name;
      return Object.assign(HttpResponse.json({ error: { message } }, { status }), this);
    }
  };
}
export const Error400 = createHttpErrorClass(400, "Error400");
export const Error401 = createHttpErrorClass(401, "Error401");
export const Error404 = createHttpErrorClass(404, "Error404");
export const Error500 = createHttpErrorClass(500, "Error500");
export const to500 = (msg = "Internal Server Error") => {
  throw new Error500(msg);
};
export const to404 = (msg = "Not Found") => {
  throw new Error404(msg);
};
export const to401 = (msg = "Unauth") => {
  throw new Error401(msg);
};
export async function neverResolve(): Promise<never> {
  return new Promise(() => {}); // Никогда не разрешается
}
