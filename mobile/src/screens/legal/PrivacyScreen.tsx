import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../../theme';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.mainTitle}>Datenschutzerklärung – Plietsche Plünn</Text>

      <Text style={styles.sectionTitle}>1. Verantwortlicher</Text>
      <Text style={styles.bodyText}>
        Verantwortlich für die Verarbeitung deiner Daten ist der Betreiber des
        Plietsche-Plünn-Tauschladens. Bei Fragen wende dich bitte direkt an den
        Store-Betreiber vor Ort.
      </Text>

      <Text style={styles.sectionTitle}>2. GPS-Standortdaten</Text>
      <Text style={styles.bodyText}>
        Diese App ermittelt deinen GPS-Standort ausschließlich zur Verifizierung
        deiner Vor-Ort-Anwesenheit beim Check-In. Die Koordinaten werden NICHT
        gespeichert — sie werden nur für einen kurzen Moment serverseitig geprüft
        (Radius-Check) und danach sofort verworfen.
      </Text>
      <Text style={styles.bodyText}>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung — der
        Check-In setzt Vor-Ort-Anwesenheit voraus).
      </Text>

      <Text style={styles.sectionTitle}>3. PlietschPunkte</Text>
      <Text style={styles.bodyText}>
        Dein Punktestand wird deinem Nutzer-Konto zugeordnet. Welche Aktionen
        (Scan, Check-In) Punkte ergeben, wird gespeichert — aber NICHT welches
        konkrete Kleidungsstück du mitgenommen hast.
      </Text>

      <Text style={styles.sectionTitle}>4. Deine Rechte</Text>
      <Text style={styles.bodyText}>
        Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner Daten
        (Art. 15–17 DSGVO). Wende dich dafür an den Store-Betreiber.
      </Text>

      <Text style={styles.sectionTitle}>5. Datenweitergabe</Text>
      <Text style={styles.bodyText}>
        Deine Daten werden nicht an Dritte weitergegeben.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md, paddingBottom: 40 },
  mainTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
