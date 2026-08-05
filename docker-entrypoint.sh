#!/bin/sh
# Runtime RPC override for the standalone Next.js image.
#
# NEXT_PUBLIC_* values are inlined into the compiled bundles at build time,
# so a normal env flip on the running container has no effect. As an ops
# escape hatch (e.g. the configured RPC endpoint dies), setting
# NEXT_PUBLIC_ETN_MAINNET_RPC_URL on the container rewrites the baked URL
# across the compiled output before the server starts.
#
# Caveat: /_next/static assets are served with immutable cache headers, so
# browsers holding cached chunks keep the old RPC until the next real build
# changes the chunk hashes. Fine for new visitors / fresh deploys; a rebuild
# is still the durable fix.
set -e

BAKED_FILE=/app/.baked-rpc-url
BAKED="$(cat "$BAKED_FILE" 2>/dev/null || true)"

if [ -n "$NEXT_PUBLIC_ETN_MAINNET_RPC_URL" ] && [ -n "$BAKED" ] \
  && [ "$NEXT_PUBLIC_ETN_MAINNET_RPC_URL" != "$BAKED" ]; then
  echo "Overriding baked RPC URL: $BAKED -> $NEXT_PUBLIC_ETN_MAINNET_RPC_URL"
  find /app/.next -type f \( -name '*.js' -o -name '*.html' -o -name '*.json' \) \
    -exec sed -i "s|$BAKED|$NEXT_PUBLIC_ETN_MAINNET_RPC_URL|g" {} +
  echo "$NEXT_PUBLIC_ETN_MAINNET_RPC_URL" > "$BAKED_FILE"
fi

exec node /app/server.js
