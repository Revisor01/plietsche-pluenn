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
