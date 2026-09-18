# -*- coding: utf-8 -*-
"""Gestaltete Mail-Vorlagen fuer PocketBase.

Mailprogramme koennen kein <style>-Blatt und kein Flexbox. Deshalb:
Tabellen statt divs, jede Regel inline am Element, feste Pixelbreiten.
Outlook rendert ueber Word — dort faellt border-radius weg, der Knopf
bleibt eckig, aber lesbar.
"""

TEAL, MINT, SKY = "#27b092", "#79c4b0", "#80b4e2"
# {ACTION_URL} ist Pflicht — PocketBase weist eine Vorlage ohne diesen
# Platzhalter ab. Der Knopf zeigt deshalb darauf; wohin er fuehrt, steuert
# appUrl in den Einstellungen. Steht dort die Webseite, ergibt sich
#   https://plietsche-pluenn.de/_/#/auth/confirm-verification/<token>
# und die Seite /konto liest Fall und Token aus dieser Adresse.

INK, INK2, INK3 = "#1A2E2C", "#5A6B6A", "#657473"
BG, FLAECHE, LINIE = "#F4F7F4", "#FFFFFF", "#E5EDEB"

def mail(vorspann, knopf, nachsatz, hinweis=None):
    hinweis_block = ""
    if hinweis:
        hinweis_block = f"""
                  <tr>
                    <td style="padding:0 40px 28px 40px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                             style="background-color:{BG};border-radius:10px;">
                        <tr>
                          <td style="padding:16px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:{INK2};">
                            {hinweis}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>"""

    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:{BG};margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560"
             style="width:560px;max-width:100%;background-color:{FLAECHE};border-radius:16px;overflow:hidden;">

        <!-- Kopf: Markenverlauf. Mailprogramme ohne Verlauf sehen Teal. -->
        <tr>
          <td style="background-color:{TEAL};background-image:linear-gradient(135deg,{TEAL} 0%,{MINT} 52%,{SKY} 100%);padding:28px 40px;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:19px;font-weight:600;color:#ffffff;letter-spacing:0.2px;">
              Plietsche Pl&uuml;nn
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 8px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;line-height:26px;color:{INK};">
            <p style="margin:0 0 16px 0;">Moin,</p>
            <p style="margin:0;">{vorspann}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:{TEAL};border-radius:10px;">
                  <a href="{{ACTION_URL}}" target="_blank" rel="noopener"
                     style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                    {knopf}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
{hinweis_block}
        <tr>
          <td style="padding:0 40px 32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:{INK3};">
            {nachsatz}
          </td>
        </tr>

        <tr>
          <td style="border-top:1px solid {LINIE};padding:20px 40px 28px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:{INK3};">
            Der Kleiderladen der Kirchengemeinde Hennstedt<br>
            <a href="https://plietsche-pl&uuml;nn.de" style="color:{TEAL};text-decoration:none;">plietsche-pl&uuml;nn.de</a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>"""

VORLAGEN = {
    "verificationTemplate": {
        "subject": "Bitte bestätige deine E-Mail-Adresse",
        "body": mail(
            "schön, dass du dabei bist. Bestätige bitte einmal kurz deine "
            "E-Mail-Adresse — dann können wir dir helfen, wenn du dein Passwort "
            "vergisst.",
            "Adresse bestätigen",
            "Hast du dich nicht angemeldet, löschst du diese Nachricht einfach. "
            "Dann passiert nichts weiter.",
            hinweis="Der Link gilt eine Woche. Du kannst die App auch ohne "
                    "Bestätigung schon benutzen.",
        ),
    },
    "resetPasswordTemplate": {
        "subject": "Neues Passwort für Plietsche Plünn",
        "body": mail(
            "du möchtest dein Passwort zurücksetzen. Mit dem Knopf darunter "
            "kannst du dir ein neues setzen.",
            "Neues Passwort setzen",
            "Warst du das nicht, kannst du diese Nachricht einfach löschen — "
            "dein Passwort bleibt dann, wie es ist.",
        ),
    },
    "confirmEmailChangeTemplate": {
        "subject": "Neue E-Mail-Adresse bestätigen",
        "body": mail(
            "du möchtest die E-Mail-Adresse deines Kontos ändern. Bestätige das "
            "bitte mit dem Knopf darunter.",
            "Adresse bestätigen",
            "Warst du das nicht, löschst du diese Nachricht am besten. Deine "
            "Adresse bleibt dann unverändert.",
        ),
    },
}
