#!/usr/bin/env bash
set -euo pipefail

APP_NAME="casino"
BASE_DIR="/srv/${APP_NAME}"
RELEASES_DIR="${BASE_DIR}/releases/backend"
CURRENT_LINK="${BASE_DIR}/current/backend"
SHARED_DIR="${BASE_DIR}/shared/backend"
SERVICE_NAME="casino-backend"
ARCHIVE_ROOT_DIR="casino-backend"
ENV_FILE="${SHARED_DIR}/env/backend.env"
BINARY_NAME="casino-server"

restart_service() {
  if [ "$(id -u)" -eq 0 ]; then
    systemctl restart "${SERVICE_NAME}"
    return
  fi

  if ! sudo -n systemctl status "${SERVICE_NAME}" >/dev/null 2>&1; then
    echo "[backend] ERROR: passwordless sudo for systemctl is not configured for ${SERVICE_NAME}" >&2
    exit 1
  fi

  sudo -n systemctl restart "${SERVICE_NAME}"
}

if [ $# -ne 1 ]; then
  echo "Usage: $0 /path/to/backend.tar.gz"
  exit 1
fi

ARCHIVE_PATH="$1"
if [ ! -f "${ARCHIVE_PATH}" ]; then
  echo "[backend] ERROR: archive not found: ${ARCHIVE_PATH}"
  exit 1
fi

TIMESTAMP="$(date +"%Y-%m-%d_%H%M%S")"
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}"

echo "[backend] Creating release directory: ${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}" "$(dirname "${CURRENT_LINK}")" "$(dirname "${ENV_FILE}")"

echo "[backend] Extracting archive..."
tar --warning=no-timestamp -xzf "${ARCHIVE_PATH}" -C "${RELEASE_DIR}"

if [ -d "${RELEASE_DIR}/${ARCHIVE_ROOT_DIR}" ]; then
  RELEASE_DIR="${RELEASE_DIR}/${ARCHIVE_ROOT_DIR}"
fi

if [ ! -f "${RELEASE_DIR}/${BINARY_NAME}" ]; then
  echo "[backend] ERROR: binary not found: ${RELEASE_DIR}/${BINARY_NAME}"
  exit 1
fi

chown -R deploy:deploy "${RELEASE_DIR}"
chmod +x "${RELEASE_DIR}/${BINARY_NAME}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[backend] ERROR: env file not found: ${ENV_FILE}"
  exit 1
fi

echo "[backend] Loading env from ${ENV_FILE}..."
set -a
source "${ENV_FILE}"
set +a

echo "[backend] Running built-in migrations..."
"${RELEASE_DIR}/${BINARY_NAME}" migrate

echo "[backend] Verifying service restart permissions..."
restart_service >/dev/null

echo "[backend] Switching current -> ${RELEASE_DIR}"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
chown -h deploy:deploy "${CURRENT_LINK}"

echo "[backend] Restarting service: ${SERVICE_NAME}"
restart_service

echo "[backend] Done."
