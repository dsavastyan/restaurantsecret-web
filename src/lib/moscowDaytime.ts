const MOSCOW_LAT = 55.7558;
const MOSCOW_LON = 37.6173;
const MOSCOW_TZ_HOURS = 3;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getMoscowDateParts(now = new Date()): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    second: Number(byType.second),
  };
}

function getDayOfYear(year: number, month: number, day: number) {
  const start = Date.UTC(year, 0, 0);
  const date = Date.UTC(year, month - 1, day);
  return Math.floor((date - start) / 86400000);
}

function getMoscowSunTimesMinutes(year: number, month: number, day: number) {
  const n = getDayOfYear(year, month, day);
  const gamma = (2 * Math.PI / 365) * (n - 1);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = MOSCOW_LAT * DEG_TO_RAD;
  const zenith = 90.833 * DEG_TO_RAD;
  const cosHa =
    Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl);

  const ha = Math.acos(Math.min(1, Math.max(-1, cosHa)));
  const solarNoon = 720 - 4 * MOSCOW_LON - eqTime + MOSCOW_TZ_HOURS * 60;
  const delta = RAD_TO_DEG * ha * 4;

  return {
    sunrise: solarNoon - delta,
    sunset: solarNoon + delta,
  };
}

export function isMoscowDaytime(now = new Date()) {
  const moscow = getMoscowDateParts(now);
  const hour = moscow.hour % 24;
  const nowMinutes = hour * 60 + moscow.minute + moscow.second / 60;
  const { sunrise, sunset } = getMoscowSunTimesMinutes(moscow.year, moscow.month, moscow.day);
  return nowMinutes >= sunrise && nowMinutes < sunset;
}
