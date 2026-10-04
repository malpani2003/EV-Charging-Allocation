#!/usr/bin/env node

/**
 * Scrapes the Delhi Government's public "Switch Delhi" charging station
 * locator (ev.delhi.gov.in) and extracts every station into the same JSON
 * shape used by fetch-ncr-stations.js, so both sources can be merged/
 * compared later.
 *
 * The real data lives in an inline `let all_locations = [...]` JS array
 * embedded in the page (used to power its map widget) — NOT in the
 * rendered HTML cards. The rendered cards only show a connector *count*;
 * this array has the actual charger_type, power capacity, live available
 * slot count, and cost per unit, so it's extracted directly instead.
 *
 * This only covers Delhi proper (the page is run by the Delhi government).
 * Gurgaon (Haryana) / Noida & Ghaziabad (UP) are NOT included here — no
 * equivalent public locator was found for those states (checked HAREDA /
 * UPREDA directly; both are policy pages with no station data).
 *
 * Note: this site's TLS certificate chain fails standard verification
 * (confirmed independently via curl -k), which is why TLS verification is
 * disabled for this one request. This is a one-off local scraping script,
 * not something that should be reused as a pattern.
 *
 * Usage: node scripts/parse-delhi-gov-stations.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const SOURCE_URL = "https://ev.delhi.gov.in/charging_station";
const ARRAY_START_MARKER = "let all_locations = [";

const fetchHtml = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(fetchHtml(res.headers.location));
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });

// Extracts the `all_locations` JS array literal by bracket-depth scanning
// (safe: it's a static data literal embedded by the server, not a function
// call), then evaluates it as JS since its keys/strings use single quotes
// (not valid JSON).
const extractLocationsArray = (html) => {
  const start = html.indexOf(ARRAY_START_MARKER);

  if (start === -1) {
    throw new Error("Could not find 'all_locations' data array in the page — site structure may have changed.");
  }

  const arrayStart = start + ARRAY_START_MARKER.length - 1; // position of the opening '['

  let depth = 0;
  let end = -1;

  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error("Could not find the end of the 'all_locations' array — malformed or truncated page.");
  }

  const arrayText = html.slice(arrayStart, end + 1);

  // eslint-disable-next-line no-new-func
  return new Function(`return ${arrayText}`)();
};

const parseCapacityKw = (capacity) => {
  if (!capacity) return null;

  const match = String(capacity).match(/([\d.]+)\s*kw/i);
  return match ? Number(match[1]) : null;
};

const mapToStation = (entry) => {
  const latitude = Number(entry.latitude);
  const longitude = Number(entry.longitude);

  return {
    sourceId: `DELHI-GOV-${entry.id || entry.vendor || ""}`,
    name: entry.vendor || entry.name || "Unnamed Station",
    address: [entry.address, entry.city, entry.postal_code].filter(Boolean).join(", "),
    latitude,
    longitude,
    operator: entry.vendor || null,
    timing: entry.timing || null,
    paymentModes: entry.payment_modes || null,
    costPerUnit: entry.cost_per_unit ?? null,
    connectors: [
      {
        type: entry.charger_type && entry.charger_type.trim() ? entry.charger_type.trim() : "Unknown",
        powerKW: parseCapacityKw(entry.capacity),
        quantity: Number(entry.no_of_chargers) || 1,
      },
    ],
    availableSlots: typeof entry.available === "number" ? entry.available : null,
  };
};

async function main() {
  console.log(`Fetching ${SOURCE_URL} ...`);

  const html = await fetchHtml(SOURCE_URL);

  console.log(`Fetched ${html.length} bytes, extracting embedded data array...`);

  const rawLocations = extractLocationsArray(html);

  console.log(`Found ${rawLocations.length} raw entries, mapping...`);

  const stations = rawLocations
    .map(mapToStation)
    .filter((s) => s.latitude && s.longitude);

  const outputPath = path.join(__dirname, "../data/delhi-gov-charging-stations.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(stations, null, 2));

  const skipped = rawLocations.length - stations.length;
  const unknownType = stations.filter((s) => s.connectors[0].type === "Unknown").length;

  console.log(`Saved ${stations.length} stations to ${outputPath}`);
  console.log(`Skipped ${skipped} entries with missing/invalid coordinates.`);
  console.log(`${unknownType} of ${stations.length} stations have no reported connector type.`);
}

main().catch((error) => {
  console.error("Failed to parse Delhi govt stations:", error.message);
  process.exit(1);
});
