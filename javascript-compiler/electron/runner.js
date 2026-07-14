/**
 * Language helpers for code execution
 * Supports: javascript, typescript (stripped), html (+js), node-style
 */

function stripTypeScript(code) {
  let src = String(code || "");

  // Remove import type / export type lines
  src = src.replace(/^\s*import\s+type\s+[\s\S]*?;\s*$/gm, "");
  src = src.replace(/^\s*export\s+type\s+[\s\S]*?;\s*$/gm, "");

  // Remove interface / type alias blocks (simple)
  src = src.replace(/^\s*(export\s+)?interface\s+\w[\w<>,\s]*\{[\s\S]*?\n\}/gm, "");
  src = src.replace(/^\s*(export\s+)?type\s+\w[\w<>,\s]*=\s*[\s\S]*?;\s*$/gm, "");

  // Remove `as Type` casts
  src = src.replace(/\s+as\s+const\b/g, "");
  src = src.replace(/\s+as\s+[A-Za-z0-9_$.<>\[\]|&\s,]+(?=[,);\n\]])/g, "");

  // Remove satisfies
  src = src.replace(/\s+satisfies\s+[A-Za-z0-9_$.<>\[\]|&\s,]+(?=[,);\n])/g, "");

  // Remove return type annotations: ): Type {
  src = src.replace(/\)\s*:\s*[A-Za-z0-9_$.<>\[\]|&{}\s,]+\s*\{/g, ") {");
  src = src.replace(/\)\s*:\s*[A-Za-z0-9_$.<>\[\]|&{}\s,]+\s*=>/g, ") =>");

  // Remove param / variable type annotations: name: Type
  // (conservative — avoids matching object keys in some cases via simple pass)
  src = src.replace(/([,(]\s*[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z0-9_$.<>\[\]|&{}\s,]+(?=\s*[,)=])/g, "$1");
  src = src.replace(
    /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[A-Za-z0-9_$.<>\[\]|&{}\s,]+\s*=/g,
    "$1 $2 ="
  );

  // Remove generic function params: function foo<T>
  src = src.replace(/\bfunction\s+([A-Za-z_$][\w$]*)\s*<[^>]+>/g, "function $1");
  src = src.replace(/\b(async\s+)?function\s*\*/g, "$1function");

  // Non-null assertion !
  src = src.replace(/([A-Za-z0-9_$\])])!(?=[.\[]|\s*[,;)\]}])/g, "$1");

  return src;
}

function extractHtmlScripts(html) {
  const scripts = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[0].slice(0, m[0].indexOf(">"));
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (m[1] && m[1].trim()) scripts.push(m[1]);
  }
  return scripts.join("\n\n");
}

function wrapNodePrelude() {
  return `
    const process = {
      env: { NODE_ENV: 'development' },
      argv: ['node', 'snippet.js'],
      cwd: () => '/',
      platform: ${JSON.stringify(process.platform)},
      version: 'v20.0.0-sandbox',
      exit: (code) => { throw new Error('process.exit(' + (code || 0) + ')'); },
    };
    const __dirname = '/snippet';
    const __filename = '/snippet/index.js';
    const module = { exports: {} };
    const exports = module.exports;
    const require = (id) => {
      if (id === 'path') {
        return {
          join: (...a) => a.join('/').replace(/\\/+/g, '/'),
          basename: (p) => String(p).split(/[/\\\\]/).pop(),
          extname: (p) => { const b = String(p).split(/[/\\\\]/).pop(); const i = b.lastIndexOf('.'); return i >= 0 ? b.slice(i) : ''; },
          dirname: (p) => { const s = String(p).replace(/[/\\\\][^/\\\\]*$/, ''); return s || '/'; },
        };
      }
      if (id === 'os') {
        return { platform: () => process.platform, homedir: () => '/home/user', tmpdir: () => '/tmp' };
      }
      if (id === 'util') {
        return { inspect: (v) => JSON.stringify(v, null, 2), format: (...a) => a.map(String).join(' ') };
      }
      throw new Error('require(\"' + id + '\") is not available in the sandbox. Allowed: path, os, util');
    };
    const Buffer = {
      from: (v, enc) => ({
        toString: (e) => String(v),
        length: String(v).length,
      }),
      isBuffer: () => false,
    };
  `;
}

/**
 * Prepare user code for the worker based on language.
 * @returns {{ code: string, language: string, note?: string }}
 */
function prepareCode(raw, language = "javascript") {
  const lang = String(language || "javascript").toLowerCase();
  const source = String(raw || "");

  if (lang === "typescript" || lang === "ts") {
    return {
      code: stripTypeScript(source),
      language: "typescript",
      note: "TypeScript types stripped for runtime",
    };
  }

  if (lang === "html" || lang === "html+js") {
    const scripts = extractHtmlScripts(source);
    if (!scripts.trim()) {
      // Allow pure JS if no script tags
      if (/^\s*</.test(source)) {
        return {
          code: `console.log("HTML snippet loaded. Add <script>…</script> tags to run JavaScript.");\nconsole.log("Markup length:", ${source.length});`,
          language: "html",
          note: "No inline <script> found — logged markup info only",
        };
      }
      return { code: source, language: "html" };
    }
    return {
      code: scripts,
      language: "html",
      note: "Running JavaScript from <script> tags",
    };
  }

  if (lang === "node" || lang === "nodejs") {
    return {
      code: `${wrapNodePrelude()}\n${source}`,
      language: "node",
      note: "Node-style sandbox (process, require path/os/util)",
    };
  }

  return { code: source, language: "javascript" };
}

function defaultExtension(language) {
  switch (String(language || "").toLowerCase()) {
    case "typescript":
    case "ts":
      return "ts";
    case "html":
    case "html+js":
      return "html";
    case "node":
    case "nodejs":
      return "js";
    default:
      return "js";
  }
}

function exportFilters(language) {
  const ext = defaultExtension(language);
  if (ext === "ts") {
    return [
      { name: "TypeScript", extensions: ["ts"] },
      { name: "JavaScript", extensions: ["js"] },
      { name: "All Files", extensions: ["*"] },
    ];
  }
  if (ext === "html") {
    return [
      { name: "HTML", extensions: ["html", "htm"] },
      { name: "All Files", extensions: ["*"] },
    ];
  }
  return [
    { name: "JavaScript", extensions: ["js"] },
    { name: "TypeScript", extensions: ["ts"] },
    { name: "HTML", extensions: ["html"] },
    { name: "Text", extensions: ["txt"] },
    { name: "All Files", extensions: ["*"] },
  ];
}

module.exports = {
  prepareCode,
  stripTypeScript,
  extractHtmlScripts,
  defaultExtension,
  exportFilters,
};
