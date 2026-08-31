import { useEffect, useState } from "react";

/**
 * Reference zones. `lat`/`lon` are the real coordinates of each city and are
 * used to place its marker on the globe — they are geography, not a claim that
 * we have an office there. The decorative "19.07°N / 72.87°E" strings that used
 * to be printed next to each row are gone; they were set dressing.
 */
export const ZONES = [
  { code: "IND", city: "India", tz: "Asia/Kolkata", lat: 19.07, lon: 72.87 },
  { code: "LDN", city: "London", tz: "Europe/London", lat: 51.5, lon: -0.12 },
  { code: "NYC", city: "New York", tz: "America/New_York", lat: 40.71, lon: -74.0 },
  { code: "DXB", city: "Dubai", tz: "Asia/Dubai", lat: 25.2, lon: 55.27 },
  { code: "SGP", city: "Singapore", tz: "Asia/Singapore", lat: 1.35, lon: 103.81 },
  { code: "SYD", city: "Sydney", tz: "Australia/Sydney", lat: -33.86, lon: 151.2 },
];

/**
 * The zone's own abbreviation for this instant — `EST` or `EDT` for New York,
 * depending on where `now` falls relative to the DST boundary. Reading it from
 * Intl rather than storing a string on the zone is what makes the switch
 * automatic: nothing here knows the changeover dates, so nothing here can drift
 * when the US moves them. Zones without a lettered abbreviation (Kolkata) come
 * back as a GMT offset, which is the correct answer for them.
 */
function abbreviate(tz, now) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

function format(tz, now) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  } catch {
    return "--:--";
  }
}

/**
 * Live local time for each reference zone. These are clocks, not client
 * claims — they signal "we work across time zones", nothing more.
 * Ticks once a minute rather than once a second: no wasted frames.
 */
export default function useWorldClock() {
  const [times, setTimes] = useState(() => {
    const now = new Date();
    return ZONES.map((z) => ({ ...z, time: format(z.tz, now), abbr: abbreviate(z.tz, now) }));
  });

  useEffect(() => {
    let timeoutId;
    let intervalId;

    const tick = () => {
      const now = new Date();
      setTimes(ZONES.map((z) => ({ ...z, time: format(z.tz, now), abbr: abbreviate(z.tz, now) })));
    };

    // align to the top of the next minute, then run every minute
    const msToNextMinute = 60000 - (Date.now() % 60000);
    timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return times;
}
