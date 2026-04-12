import { reatomField, reatomForm, wrap } from "@reatom/core";

import { loginSchema, registerSchema } from "../domain/schemas";
import { loginAction, registerAction } from "./auth-atoms";

export const loginForm = reatomForm(
  {
    email: "",
    password: "",
  },
  {
    name: "loginForm",
    validateOnBlur: true,
    schema: loginSchema,
    onSubmit: async (values) => {
      await wrap(loginAction(values));
    },
  },
);

export const registerForm = reatomForm(
  {
    email: "",
    password: "",
    confirmPassword: reatomField("", {
      validate: ({ state }): string | undefined =>
        state && state !== registerForm.fields.password() ? "Passwords do not match" : "",
    }),
    firstName: "",
    lastName: "",
    department: "",
  },
  {
    name: "registerForm",
    validateOnChange: true,
    schema: registerSchema,
    onSubmit: async (values) => {
      const { confirmPassword: _confirmPassword, ...credentials } = values;
      await wrap(
        registerAction({
          ...credentials,
          department: credentials.department || undefined,
        }),
      );
    },
  },
);
