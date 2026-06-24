import YAML from 'yaml'

/**
 * Parse YAML even if the document contains duplicate map keys.
 * Some upstream specs (converted from PDFs) include duplicates; YAML.parse throws.
 */
export function parseYamlSafe<T = any>(yamlText: string): T {
  try {
    return YAML.parse(yamlText) as T
  } catch (err: any) {
    // Fallback: allow duplicate keys; YAML will keep the last occurrence by default.
    const doc = YAML.parseDocument(yamlText, { uniqueKeys: false })
    // If the document is still empty for any reason, rethrow original error.
    const js = doc.toJS({}) as T
    if (!js) throw err
    return js
  }
}
