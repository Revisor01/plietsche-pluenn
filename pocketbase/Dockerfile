# Das Abbild für die Auslieferung: fremdes PocketBase plus unsere Dateien.
#
# Warum überhaupt ein eigenes Abbild, wo PocketBase doch nichts zu bauen hat:
# Bisher wurden pb_hooks/ und pb_migrations/ von Hand per scp in die
# Bind-Mounts des Servers kopiert. Genau das ist im August schiefgegangen —
# die Instanz lief vier Wochen auf einem alten Stand, und ein im Repo als
# behoben geführter Sicherheitsfehler stand in Produktion weiter offen.
# Liegen die Dateien im Abbild, ist der Stand des Containers per Konstruktion
# der Stand eines Commits; es gibt keinen Weg mehr, bei dem jemand das
# Kopieren vergisst.
#
# Die Version des Basis-Abbilds bleibt fest gepinnt. Ein gleitendes Tag würde
# bei jedem Deploy eine neue PocketBase-Version einziehen, ohne dass sich im
# Repo etwas geändert hätte — Migrationen und Hooks sind aber gegen genau
# diese Version geschrieben.
FROM ghcr.io/muchobien/pocketbase:0.22.21

# Hooks und Migrationen gehören ab hier zum Abbild.
#
# WICHTIG für den Stack: Solange /pb_hooks und /pb_migrations als Bind-Mount
# vom Host eingehängt sind, überdecken die Host-Verzeichnisse diese Dateien
# und der Container läuft weiter auf dem alten Stand. In
# docker-compose.portainer.yml wird deshalb nur noch pb_data gemountet.
# Siehe docs/deploy.md, Abschnitt „Einmalige Umstellung".
COPY pb_hooks /pb_hooks
COPY pb_migrations /pb_migrations

# Der Commit, aus dem dieses Abbild gebaut ist. GET /api/pp/version liefert
# ihn aus, und die Nachher-Prüfung des Deploys vergleicht ihn mit dem
# ausgelieferten (.github/scripts/deploy-verify.py).
#
# Er landet als Datei IN /pb_hooks und nicht als Umgebungsvariable: So meldet
# die Route den Stand der Hooks, die PocketBase tatsächlich geladen hat. Eine
# Variable hinge am Abbild und bliebe auch dann neu, wenn ein Bind-Mount die
# Hooks mit einem alten Stand überdeckt.
#
# Ohne gültigen Hash bricht der Bau ab. Ein Abbild ohne Commit ließe die
# Prüfung später nur rätseln, und die Prüfung auf Hex-Zeichen hält den Wert
# aus dem JavaScript heraus, in das er geschrieben wird.
ARG PP_COMMIT=""
RUN case "$PP_COMMIT" in \
      ''|*[!0-9a-f]*) echo "PP_COMMIT fehlt oder ist kein Commit-Hash: '$PP_COMMIT'" >&2; exit 1 ;; \
    esac \
 && printf 'module.exports = { commit: "%s" };\n' "$PP_COMMIT" > /pb_hooks/lib/build.js
