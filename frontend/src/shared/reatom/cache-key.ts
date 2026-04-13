type Primitive = string | number | boolean | null

type SerializableValue =
  | Primitive
  | SerializableValue[]
  | { [key: string]: SerializableValue | undefined }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeValue(value: unknown): SerializableValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item))
  }

  if (isPlainObject(value)) {
    const normalized: Record<string, SerializableValue | undefined> = {}
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b))

    for (const key of keys) {
      const item = value[key]
      if (item === undefined) continue
      normalized[key] = normalizeValue(item)
    }

    return normalized
  }

  return String(value)
}

export function serializeCacheParams(params: unknown): string {
  return JSON.stringify(normalizeValue(params))
}

export function createCacheKey(namespace: string, params?: unknown): string {
  if (!params) return namespace
  return `${namespace}:${serializeCacheParams(params)}`
}
