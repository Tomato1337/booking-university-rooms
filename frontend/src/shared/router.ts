import { reatomRoute } from "@reatom/core"
import { createElement, Fragment } from "react"

const base = (import.meta.env["BASE_URL"] ?? "/").replace(/^\//, "")

export const rootRoute = reatomRoute(
    {
        path: base, render: (self) => {
            console.log("change router", self)
            return self.outlet().at(0) ?? createElement(Fragment)
        }
    },
  "rootRoute",
)
