#!/usr/bin/env bash
set -euo pipefail

APP_NAME="casino"
BASE_DIR="/srv/${APP_NAME}"
RELEASES_DIR="${BASE_DIR}/releases/frontend"
CURRENT_LINK="${BASE_DIR}/current/frontend"
SHARED_DIR="${BASE_DIR}/shared/frontend"
SERVICE_NAME="casino-frontend"
ARCHIVE_ROOT_DIR="casino-frontend"
ENV_FILE="${SHARED_DIR}/env/frontend.env"

restart_service() {
  if [ "$(id -u)" -eq 0 ]; then
    systemctl restart "${SERVICE_NAME}"
    return
  fi

  if ! sudo -n systemctl restart "${SERVICE_NAME}"; then
    echo "[frontend] ERROR: systemctl restart ${SERVICE_NAME} failed (check passwordless sudo for this unit)" >&2
    exit 1
  fi
}

if [ $# -ne 1 ]; then
  echo "Usage: $0 /path/to/frontend.tar.gz"
  exit 1
fi

ARCHIVE_PATH="$1"
if [ ! -f "${ARCHIVE_PATH}" ]; then
  echo "[frontend] ERROR: archive not found: ${ARCHIVE_PATH}"
  exit 1
fi

TIMESTAMP="$(date +"%Y-%m-%d_%H%M%S")"
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}"

echo "[frontend] Creating release directory: ${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}" "$(dirname "${CURRENT_LINK}")" "$(dirname "${ENV_FILE}")"

echo "[frontend] Extracting archive..."
tar --warning=no-timestamp -xzf "${ARCHIVE_PATH}" -C "${RELEASE_DIR}"

if [ -d "${RELEASE_DIR}/${ARCHIVE_ROOT_DIR}" ]; then
  RELEASE_DIR="${RELEASE_DIR}/${ARCHIVE_ROOT_DIR}"
fi

if [ ! -f "${RELEASE_DIR}/server.js" ]; then
  echo "[frontend] ERROR: standalone server not found: ${RELEASE_DIR}/server.js"
  exit 1
fi

if [ ! -d "${RELEASE_DIR}/.next/static" ]; then
  echo "[frontend] ERROR: .next/static not found in release"
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "[frontend] ERROR: env file not found: ${ENV_FILE}"
  exit 1
fi

chown -R deploy:deploy "${RELEASE_DIR}"
chmod -R u=rwX,go=rX "${RELEASE_DIR}"

echo "[frontend] Loading env from ${ENV_FILE}..."
set -a
source "${ENV_FILE}"
set +a

echo "[frontend] Switching current -> ${RELEASE_DIR}"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
chown -h deploy:deploy "${CURRENT_LINK}"

echo "[frontend] Restarting service: ${SERVICE_NAME}"
restart_service

echo "[frontend] Done."
