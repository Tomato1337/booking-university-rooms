/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TZ: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
