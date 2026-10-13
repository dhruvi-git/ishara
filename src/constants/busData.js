export const BUS = {
  reg: "MH01-4471",
  route: "A-202",
  from: "Andheri Stn (W)",
  to: "Marol Naka"
};

export const DEFAULT_ZONE = "R4C";

export const TYPES = [
  { id: 1, label: "Staring / comments", labelHi: "घूरना / फब्तियां कसना" },
  { id: 2, label: "Touching / pressing", labelHi: "छूना / धक्कामुक्की" },
  { id: 3, label: "Following / blocking", labelHi: "पीछा करना / रास्ता रोकना" },
  { id: 0, label: "Prefer not to say", labelHi: "बताना नहीं चाहती" }
];

export const SCRIPT = [
  {
    lv: "L1",
    t: "Ticket check in her zone",
    d: "Walk to the zone and check tickets of nearby passengers. Presence alone often halts harassment without drawing attention.",
    action: "Conducting routine ticket check nearby"
  },
  {
    lv: "L2",
    t: "Offer her a seat in front",
    d: "“Madam, a seat is vacant upfront.” Moves her away safely without naming anyone.",
    action: "Discreetly moved passenger to front ladies row"
  },
  {
    lv: "L3",
    t: "Check his ticket and destination",
    d: "Ask the man nearby for his pass and destination. Signals clearly that he is being watched.",
    action: "Directly verified suspect's ticket & warned"
  },
  {
    lv: "L4",
    t: "Escalate (only if she agrees)",
    d: "Driver halts at next police chowki or Nirbhaya squad point; live GPS streamed to control room.",
    esc: true,
    action: "Alerted control room & Nirbhaya squad"
  }
];

export const ZONE_ROWS = [
  ["F1L", "F1C", "F1R"],
  ["F2L", "F2C", "F2R"],
  ["F3L", "F3C", "F3R"],
  ["F4L", "F4C", "F4R"],
  ["R1L", "R1C", "R1R"],
  ["R2L", "R2C", "R2R"],
  ["R3L", "R3C", "R3R"],
  ["R4L", "R4C", "R4R"]
];

export function zoneName(z) {
  if (!z || z.length < 3) return z || "Unknown";
  const sec = z[0] === "F" ? "Front" : "Rear";
  const side = { L: "Left window/seats", C: "Centre aisle (standing)", R: "Right window/seats" }[z[2]] || "";
  return `${sec} section, Row ${z[1]}, ${side}`;
}

export const STOPS = [
  { name: "Andheri Stn (W)", eta: "-4 min", status: "passed" },
  { name: "Gundavali", eta: "Now", status: "current" },
  { name: "Chakala Metro", eta: "+5 min", status: "upcoming" },
  { name: "Marol Naka", eta: "+11 min", status: "upcoming" },
  { name: "Saki Naka", eta: "+18 min", status: "upcoming" }
];

// 7-day realistic transit incident seed data for Depot console analytics
export const SAMPLE_INCIDENTS = (() => {
  const stretches = [
    { r: "A-202", s: "Andheri Stn → Chakala", w: 12 },
    { r: "A-202", s: "Chakala → Marol Naka", w: 8 },
    { r: "332",   s: "Kurla Depot → Saki Naka", w: 10 },
    { r: "A-61",  s: "Sion → Dharavi Depot", w: 6 },
    { r: "C-79",  s: "Borivali Stn → Kandarpada", w: 4 },
    { r: "28",    s: "Dadar TT → Worli Naka", w: 3 }
  ];

  const hourWeights = [0, 0, 0, 0, 0, 1, 2, 5, 8, 7, 3, 2, 2, 2, 3, 4, 6, 9, 14, 12, 8, 4, 2, 1];
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const pick = (arr, weightFn) => {
    const total = arr.reduce((acc, item) => acc + weightFn(item), 0);
    let r = rnd() * total;
    for (const item of arr) {
      r -= weightFn(item);
      if (r <= 0) return item;
    }
    return arr[0];
  };

  const out = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const hours = [...Array(24).keys()];

  for (let i = 0; i < 48; i++) {
    const st = pick(stretches, x => x.w);
    const h = pick(hours, x => hourWeights[x]);
    const day = Math.floor(rnd() * 7) + 1;
    const t = base.getTime() - day * 86400000 + h * 3600000 + Math.floor(rnd() * 60) * 60000;
    const respSec = Math.round(55 + rnd() * 190);
    const ch = rnd() < 0.60 ? "app" : rnd() < 0.75 ? "sms" : "phrase";
    const safe = rnd() < 0.84;
    const zr = ZONE_ROWS[Math.floor(rnd() * 8)];
    const zone = zr[rnd() < 0.5 ? 1 : Math.floor(rnd() * 3)];
    const typeId = pick([1, 2, 3, 0], x => [3, 4, 2, 1][[1, 2, 3, 0].indexOf(x)]);

    out.push({
      id: "hist_" + i,
      sample: true,
      route: st.r,
      stretch: st.s,
      zone,
      channel: ch,
      type: typeId,
      createdAt: t,
      ackAt: t + respSec * 1000,
      status: "closed",
      outcome: safe ? "safe" : "closed"
    });
  }

  return out.sort((a, b) => b.createdAt - a.createdAt);
})();

export function formatDuration(ms) {
  if (ms == null || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem < 10 ? '0' : ''}${rem}s`;
}

export function formatClock(t) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
