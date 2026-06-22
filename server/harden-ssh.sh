#!/usr/bin/env bash
# harden-ssh.sh — hinterlegt deinen SSH-Public-Key für root und schaltet
# danach den Passwort-Login ab. WICHTIG, weil das per E-Mail/Screenshot
# verschickte Hetzner-Root-Passwort als kompromittiert gelten muss.
#
#   bash harden-ssh.sh "ssh-ed25519 AAAA... dein@key"
#
# Den Public-Key bekommst du lokal mit:  cat ~/.ssh/id_ed25519.pub
# (Falls keiner da:  ssh-keygen -t ed25519)
set -euo pipefail

PUBKEY="${1:-}"
if [ -z "$PUBKEY" ] || ! printf '%s' "$PUBKEY" | grep -qE '^(ssh-ed25519|ssh-rsa|ecdsa-) '; then
  echo "✗ Bitte gültigen SSH-Public-Key übergeben:"
  echo '   bash harden-ssh.sh "ssh-ed25519 AAAA... name"'
  exit 1
fi

mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
if ! grep -qF "$PUBKEY" /root/.ssh/authorized_keys; then
  printf '%s\n' "$PUBKEY" >> /root/.ssh/authorized_keys
  echo "✓ Public-Key hinterlegt."
else
  echo "· Public-Key war schon vorhanden."
fi

echo "▶ Passwort-Login abschalten (nur noch SSH-Key)"
SSHD=/etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD"
grep -q '^PasswordAuthentication no' "$SSHD" || echo 'PasswordAuthentication no' >> "$SSHD"

# In Drop-in-Dateien (Ubuntu 22.04+/cloud-init) ggf. überschreiben
if [ -d /etc/ssh/sshd_config.d ]; then
  printf 'PasswordAuthentication no\nPermitRootLogin prohibit-password\n' \
    > /etc/ssh/sshd_config.d/99-abannews-harden.conf
fi

sshd -t && systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true

cat <<EOF

✅ SSH gehärtet: Login nur noch per Key, Passwort-Login aus.

\033[1;33mWICHTIG:\033[0m Teste JETZT in einem ZWEITEN Terminal, dass der Key-Login geht:
    ssh root@$(hostname -I 2>/dev/null | awk '{print $1}')
Erst wenn das klappt, diese Session schließen. Das alte Hetzner-Passwort ist
damit wertlos (kein Passwort-Login mehr) — zusätzlich im Hetzner-Panel rotieren.
EOF
