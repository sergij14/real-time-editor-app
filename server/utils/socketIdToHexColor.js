function socketIdToHexColor(socketId) {
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) {
    hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32-bit integer
  }

  const r = (hash >> 16) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = hash & 0xff;

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

module.exports = socketIdToHexColor;
