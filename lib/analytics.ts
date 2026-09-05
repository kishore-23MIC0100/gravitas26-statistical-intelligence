export type Row = Record<string, string>;

export type Mapping = Partial<
  Record<
    | "type"
    | "college"
    | "event"
    | "eventId"
    | "category"
    | "registration"
    | "internationalEvent"
    | "country"
    | "internationalParticipant"
    | "payment"
    | "gender",
    string
  >
>;

export type Metric<T> = {
  value: T | null;
  status: "valid" | "unavailable" | "insufficient";
  note?: string;
  records: number;
};

export interface PaymentBreakdownItem {
  name: string;
  count: number;
  percent: number;
  statusType: "success" | "warning" | "danger";
}

export interface CountryBreakdownItem {
  name: string;
  count: number;
  percent: number;
}

export interface CategoryAnalyticsItem {
  name: string;
  eventsCount: number;
  registrations: number;
  share: number;
}

export type Report = {
  rows: number;
  columns: string[];
  mapping: Mapping;
  quality: { duplicates: number; missing: number; status: string };
  internal: Metric<number>;
  external: Metric<number>;
  externalColleges: Metric<{ name: string; count: number }[]>;
  categories: Metric<{ name: string; count: number }[]>;
  ranking: Metric<{ name: string; category: string; count: number }[]>;
  internationalEvents: Metric<number>;
  internationalParticipants: Metric<number>;
  paid: Metric<number>;
  genders: Metric<{ name: string; count: number; percent: number }[]>;
  paymentBreakdown: Metric<PaymentBreakdownItem[]>;
  countryBreakdown: Metric<CountryBreakdownItem[]>;
  categoryAnalytics: Metric<CategoryAnalyticsItem[]>;
};

const aliases: Record<keyof Mapping, string[]> = {
  type: [
    "participant type",
    "college type",
    "internal/external",
    "registration type",
    "type",
  ],
  college: ["college name", "college", "institution"],
  event: ["event name", "event"],
  eventId: ["event id", "event code"],
  category: ["event category", "category"],
  registration: ["registration id", "registration", "participant id"],
  internationalEvent: [
    "international flag",
    "international event",
    "event type",
    "international status",
  ],
  country: ["participant country", "country", "nationality"],
  internationalParticipant: [
    "international participant flag",
    "international participant",
  ],
  payment: [
    "payment status",
    "transaction status",
    "payment confirmation",
    "payment",
  ],
  gender: ["gender", "sex"],
};

const norm = (x: string) =>
  x
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

const yes = (x: string) =>
  ["yes", "true", "international", "intl", "1"].includes(norm(x));

const paid = (x: string) =>
  ["paid", "success", "successful", "confirmed", "completed"].includes(norm(x));

export function detectMapping(columns: string[]): Mapping {
  const m: Mapping = {};
  for (const key of Object.keys(aliases) as (keyof Mapping)[]) {
    const f = columns.find((c) => aliases[key].includes(norm(c)));
    if (f) m[key] = f;
  }
  return m}

function mk<T>(
  value: T | null,
  records: number,
  note?: string
): Metric<T> {
  return {
    value,
    status: value === null ? "unavailable" : records ? "valid" : "insufficient",
    note,
    records,
  };
}

function groups(rows: Row[], field: string, distinct?: string) {
  const m = new Map<string, Set<string>>();
  rows.forEach((r, i) => {
    const k = r[field]?.trim();
    if (!k) return;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(distinct && r[distinct] ? r[distinct] : String(i));
  });
  return [...m]
    .map(([name, s]) => ({ name, count: s.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function analyze(
  input: Row[],
  columns: string[],
  override: Mapping = {}
): Report {
  const mapping = { ...detectMapping(columns), ...override };
  const rows = input.filter((r) =>
    Object.values(r).some((v) => v && v.trim())
  );

  const seen = new Set<string>();
  const dups = new Set<string>();
  rows.forEach((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) dups.add(k);
    seen.add(k);
  });

  const missing = rows.filter((r) =>
    Object.values(mapping).some((f) => f && !r[f]?.trim())
  ).length;

  const type = mapping.type;
  const col = mapping.college;
  const event = mapping.event || mapping.eventId;
  const cat = mapping.category;
  const reg = mapping.registration;
  const intE = mapping.internationalEvent;
  const intP = mapping.internationalParticipant;
  const country = mapping.country;
  const pay = mapping.payment;
  const gender = mapping.gender;

  const internal = type
    ? rows.filter((r) => norm(r[type]) === "internal")
    : [];
  const external = type
    ? rows.filter((r) => norm(r[type]) === "external")
    : [];

  const rank = event
    ? groups(rows, event, reg).map((x) => ({
        ...x,
        category: cat
          ? rows.find((r) => r[event] === x.name)?.[cat] || "—"
          : "—",
      }))
    : [];

  const intEvents =
    intE && event
      ? new Set(
          rows
            .filter((r) => yes(r[intE]))
            .map((r) => r[event])
            .filter(Boolean)
        ).size
      : 0;

  const intParticipants = intP
    ? rows.filter((r) => yes(r[intP])).length
    : country
    ? rows.filter((r) => {
        const x = norm(r[country]);
        return x && !["india", "indian", "in"].includes(x);
      }).length
    : 0;

  const gs = gender
    ? groups(rows, gender, reg).map((x) => ({
        ...x,
        percent: Number(((x.count / rows.length) * 100).toFixed(1)),
      }))
    : [];

  // Payment Breakdown
  let paymentBreakdown: PaymentBreakdownItem[] | null = null;
  if (pay && rows.length > 0) {
    const rawStatus = groups(rows, pay, reg);
    paymentBreakdown = rawStatus.map((x) => {
      const nKey = norm(x.name);
      let statusType: "success" | "warning" | "danger" = "warning";
      if (paid(nKey)) statusType = "success";
      else if (["failed", "cancelled", "declined", "refunded"].includes(nKey))
        statusType = "danger";
      return {
        name: x.name,
        count: x.count,
        percent: Number(((x.count / rows.length) * 100).toFixed(1)),
        statusType,
      };
    });
  }

  // Country Breakdown
  let countryBreakdown: CountryBreakdownItem[] | null = null;
  if (country && rows.length > 0) {
    const rawCountry = groups(rows, country, reg);
    countryBreakdown = rawCountry.map((x) => ({
      name: x.name,
      count: x.count,
      percent: Number(((x.count / rows.length) * 100).toFixed(1)),
    }));
  }

  // Detailed Category Analytics
  let categoryAnalytics: CategoryAnalyticsItem[] | null = null;
  if (cat && rows.length > 0) {
    const catMap = new Map<string, { events: Set<string>; registrations: number }>();
    rows.forEach((r) => {
      const c = r[cat]?.trim();
      if (!c) return;
      if (!catMap.has(c)) {
        catMap.set(c, { events: new Set(), registrations: 0 });
      }
      const entry = catMap.get(c)!;
      entry.registrations++;
      if (event && r[event]) {
        entry.events.add(r[event].trim());
      }
    });

    categoryAnalytics = [...catMap.entries()]
      .map(([name, data]) => ({
        name,
        eventsCount: data.events.size,
        registrations: data.registrations,
        share: Number(((data.registrations / rows.length) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.registrations - a.registrations);
  }

  return {
    rows: rows.length,
    columns,
    mapping,
    quality: {
      duplicates: dups.size,
      missing,
      status: dups.size || missing ? "Review Required" : "Valid",
    },
    internal: type
      ? mk<number>(internal.length, internal.length)
      : mk<number>(null, 0, "Map an Internal/External field."),
    external: type
      ? mk<number>(external.length, external.length)
      : mk<number>(null, 0, "Map an Internal/External field."),
    externalColleges:
      type && col
        ? mk<{ name: string; count: number }[]>(groups(external, col, reg), external.length)
        : mk<{ name: string; count: number }[]>(null, 0, "Map both type and college fields."),
    categories:
      cat && event
        ? mk<{ name: string; count: number }[]>(groups(rows, cat, event), rows.length)
        : mk<{ name: string; count: number }[]>(null, 0, "Map category and event fields."),
    ranking: event
      ? mk<{ name: string; category: string; count: number }[]>(rank, rows.length)
      : mk<{ name: string; category: string; count: number }[]>(null, 0, "Map an event field."),
    internationalEvents:
      intE && event
        ? mk<number>(intEvents, intEvents)
        : mk<number>(null, 0, "Map international-event and event fields."),
    internationalParticipants:
      intP || country
        ? mk<number>(intParticipants, intParticipants)
        : mk<number>(
            null,
            0,
            "International participant count cannot be determined from the available dataset."
          ),
    paid: pay
      ? mk<number>(rows.filter((r) => paid(r[pay])).length, rows.length)
      : mk<number>(null, 0, "Map a payment-status field."),
    genders: gender
      ? mk<{ name: string; count: number; percent: number }[]>(gs, rows.length)
      : mk<{ name: string; count: number; percent: number }[]>(null, 0, "Map a gender field."),
    paymentBreakdown: pay
      ? mk<PaymentBreakdownItem[]>(paymentBreakdown, rows.length)
      : mk<PaymentBreakdownItem[]>(null, 0, "Map a payment status field."),
    countryBreakdown: country
      ? mk<CountryBreakdownItem[]>(countryBreakdown, rows.length)
      : mk<CountryBreakdownItem[]>(null, 0, "Map a country field."),
    categoryAnalytics: cat
      ? mk<CategoryAnalyticsItem[]>(categoryAnalytics, rows.length)
      : mk<CategoryAnalyticsItem[]>(null, 0, "Map a category field."),
  };
}
