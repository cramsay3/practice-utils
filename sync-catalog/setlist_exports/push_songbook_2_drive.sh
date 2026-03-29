#!/usr/bin/env bash
set -euo pipefail

# Google Drive folder from user:
# https://drive.google.com/drive/folders/1R6CsQfwjQDG5wkanr-p5Ez-fB57qQBIG
DRIVE_FOLDER_ID="1R6CsQfwjQDG5wkanr-p5Ez-fB57qQBIG"
REMOTE_NAME="${1:-gdrive}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

mapfile -t EXPORT_FILES < <(ls -1 "${SCRIPT_DIR}"/*_one_page.{html,txt} 2>/dev/null || true)
mapfile -t SBP_FILES < <(ls -1 "${PROJECT_ROOT}"/*.sbp 2>/dev/null || true)

FILES=("${EXPORT_FILES[@]}" "${SBP_FILES[@]}")

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is not installed."
  echo "Install: sudo apt install -y rclone"
  exit 1
fi

if ! rclone listremotes | grep -q "^${REMOTE_NAME}:$"; then
  echo "Remote '${REMOTE_NAME}' is not configured."
  echo "Run this once to set it up:"
  echo "  rclone config"
  echo "Create a new remote named '${REMOTE_NAME}' of type 'drive'."
  exit 1
fi

if [[ "${#FILES[@]}" -eq 0 ]]; then
  echo "No export or .sbp files found to upload."
  exit 1
fi

for f in "${FILES[@]}"; do
  if [[ ! -f "${f}" ]]; then
    echo "Missing file: ${f}"
    exit 1
  fi
done

echo "Uploading files to Drive folder ${DRIVE_FOLDER_ID}..."
for f in "${FILES[@]}"; do
  base="$(basename "${f}")"
  rclone copyto "${f}" "${REMOTE_NAME}:{$DRIVE_FOLDER_ID}/${base}" --progress
done

echo "Upload complete."
