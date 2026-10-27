# PocketBase 0.40.4 plus Hooks und Migrationen; Version wie in tests/integration/pocketbase-binary.mjs.
FROM ghcr.io/muchobien/pocketbase:0.40.6

# pb_migrations_022/ nicht, die laufen unter 0.40 nicht; Bind-Mounts auf diese Pfade wuerden das Abbild ueberdecken.
COPY pb_hooks /pb_hooks
COPY pb_migrations /pb_migrations

# Commit als Datei in /pb_hooks, damit /api/pp/version den Stand der geladenen Hooks meldet; ohne gueltigen Hash bricht der Bau ab.
ARG PP_COMMIT=""
RUN case "$PP_COMMIT" in \
      ''|*[!0-9a-f]*) echo "PP_COMMIT fehlt oder ist kein Commit-Hash: '$PP_COMMIT'" >&2; exit 1 ;; \
    esac \
 && printf 'module.exports = { commit: "%s" };\n' "$PP_COMMIT" > /pb_hooks/lib/build.js
