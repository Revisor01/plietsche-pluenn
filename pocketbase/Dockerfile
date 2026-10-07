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
#
# 0.40.4 (seit 26.09.2026, vorher 0.22.21). Muss zur Version in
# tests/integration/pocketbase-binary.mjs passen — die Integrationstests
# prüfen Hooks und Migrationen gegen genau dieses Binary.
#
# Was sich am Basis-Abbild gegenüber 0.22.21 geändert hat (nachgelesen in der
# Abbild-Konfiguration auf ghcr.io):
#   - Einstiegspunkt ist jetzt /usr/local/bin/entrypoint.sh statt des
#     Binarys. Beginnt das erste Argument mit „-" (bei uns
#     --encryptionEnv=…), setzt das Skript „serve --http=0.0.0.0:8090
#     --dir=/pb_data --publicDir=/pb_public --hooksDir=/pb_hooks" davor —
#     dieselben Pfade wie bisher. Der Stack muss dafür nicht angepasst werden.
#   - Migrationen: kein --migrationsDir, PocketBase nimmt wie bisher
#     /pb_data/../pb_migrations = /pb_migrations (gemessen mit 0.40.4).
#   - Neu ist das Paket tzdata. Das 0.22.21-Abbild installierte nur
#     ca-certificates, und keines der beiden Binarys bettet Zeitzonendaten
#     ein. TZ=Europe/Berlin aus dem Stack dürfte deshalb bisher ins Leere
#     gegangen sein (Go fällt dann auf UTC zurück) und wirkt ab jetzt —
#     die nächtlichen Aufgaben laufen dann nach Berliner Uhr. Abgeleitet aus
#     dem Abbild, nicht in Produktion gemessen; siehe docs/deploy.md.
#   - Optional legen PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD beim Start einen
#     Superuser an. Nutzen wir nicht.
FROM ghcr.io/muchobien/pocketbase:0.40.4

# Hooks und Migrationen gehören ab hier zum Abbild. pb_migrations_022/ (die
# alten 0.22-Migrationen) bewusst NICHT — sie laufen unter 0.40 nicht.
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
