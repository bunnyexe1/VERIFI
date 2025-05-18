export function extractCid(url) {
  if (!url) return "";
  if (url.includes("ipfs/")) {
    const parts = url.split("ipfs/");
    return parts[parts.length - 1];
  } else if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "");
  } else if (url.match(/^[a-zA-Z0-9]{46}$/)) {
    return url;
  }
  return url;
}