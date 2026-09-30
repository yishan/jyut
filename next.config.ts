import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Not a static export: /api/translate needs a server. The page itself is
  // still prerendered — only that one route is dynamic.
  // A lockfile in a parent directory would otherwise be picked as the root.
  turbopack: { root: import.meta.dirname },
  // `trailingSlash` existed only to make the static export map cleanly to
  // directories. It also 308-redirects POSTs to /api/translate, so it goes.
}

export default nextConfig
