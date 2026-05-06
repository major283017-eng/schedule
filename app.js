const staff = [
  "黃建隆",
  "張志賢",
  "周誌賢",
  "王啟光",
  "陳建緯",
  "劉恆古",
  "晏士俊",
  "黃吉祥",
  "陳柏瑋",
  "張國光",
  "龐國銘",
  "李明蒼",
];

const fullShiftStaff = ["張志賢", "周誌賢"];
const restrictedStaff = "陳建緯";
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

const holidays = new Map([
  ["2026-04-03", "兒童節及清明節連假"],
  ["2026-04-04", "兒童節及清明節連假"],
  ["2026-04-05", "兒童節及清明節連假"],
  ["2026-04-06", "兒童節及清明節連假"],
  ["2026-05-01", "勞動節"],
  ["2026-05-02", "勞動節連假"],
  ["2026-05-03", "勞動節連假"],
  ["2026-06-19", "端午節"],
  ["2026-06-20", "端午節連假"],
  ["2026-06-21", "端午節連假"],
]);

const state = {
  schedule: [],
};

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isHoliday(date) {
  const key = formatDate(date);
  return date.getDay() === 0 || date.getDay() === 6 || holidays.has(key);
}

function rotatePool(pool, startName) {
  const index = pool.indexOf(startName);
  if (index < 0) return pool.slice();
  return pool.slice(index).concat(pool.slice(0, index));
}

function fillSelect(id, names, selected) {
  const select = document.getElementById(id);
  select.innerHTML = "";
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = name === selected;
    select.appendChild(option);
  });
}

function setupControls() {
  const generalStaff = staff.filter((name) => !fullShiftStaff.includes(name));
  const workdayNightStaff = generalStaff.filter((name) => name !== restrictedStaff);
  const holidayNightStaff = generalStaff.slice();

  fillSelect("workdayDayStart", generalStaff, "張國光");
  fillSelect("workdayNightStart", workdayNightStaff, "黃建隆");
  fillSelect("holidayFullStart", fullShiftStaff, "張志賢");
  fillSelect("holidayNightStart", holidayNightStaff, "陳建緯");
}

function generateSchedule() {
  const start = parseLocalDate(document.getElementById("startDate").value);
  const end = parseLocalDate(document.getElementById("endDate").value);

  const generalStaff = staff.filter((name) => !fullShiftStaff.includes(name));
  const workdayDayPool = rotatePool(generalStaff, document.getElementById("workdayDayStart").value);
  const workdayNightPool = rotatePool(
    generalStaff.filter((name) => name !== restrictedStaff),
    document.getElementById("workdayNightStart").value
  );
  const holidayFullPool = rotatePool(fullShiftStaff, document.getElementById("holidayFullStart").value);
  const holidayNightPool = rotatePool(generalStaff, document.getElementById("holidayNightStart").value);

  let workdayDayIndex = 0;
  let workdayNightIndex = 0;
  let holidayFullIndex = 0;
  let holidayNightIndex = 0;
  const rows = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const current = new Date(d);
    const key = formatDate(current);
    const holiday = isHoliday(current);
    const row = {
      date: key,
      weekday: weekdays[current.getDay()],
      type: holiday ? "假日" : "平日",
      day: "",
      night: "",
      full: "",
      holidayName: holidays.get(key) || (current.getDay() === 0 || current.getDay() === 6 ? "週末" : ""),
    };

    if (holiday) {
      row.full = holidayFullPool[holidayFullIndex % holidayFullPool.length];
      row.night = holidayNightPool[holidayNightIndex % holidayNightPool.length];
      holidayFullIndex += 1;
      holidayNightIndex += 1;
    } else {
      row.day = workdayDayPool[workdayDayIndex % workdayDayPool.length];
      row.night = workdayNightPool[workdayNightIndex % workdayNightPool.length];
      workdayDayIndex += 1;
      workdayNightIndex += 1;
    }

    rows.push(row);
  }

  state.schedule = rows;
  renderSchedule(rows);
  renderStats(rows);
}

function renderSchedule(rows) {
  const tbody = document.querySelector("#scheduleTable tbody");
  tbody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = row.type === "假日" ? "holiday" : "workday";
    [row.date, row.weekday, row.type, row.day || "-", row.night || "-", row.full || "-", row.holidayName || "-"].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderStats(rows) {
  const stats = new Map(staff.map((name) => [name, { day: 0, night: 0, full: 0 }]));

  rows.forEach((row) => {
    if (row.day) stats.get(row.day).day += 1;
    if (row.night) stats.get(row.night).night += 1;
    if (row.full) stats.get(row.full).full += 1;
  });

  const tbody = document.querySelector("#statsTable tbody");
  tbody.innerHTML = "";
  let min = Infinity;
  let max = 0;

  staff.forEach((name) => {
    const item = stats.get(name);
    const total = item.day + item.night + item.full;
    min = Math.min(min, total);
    max = Math.max(max, total);

    const tr = document.createElement("tr");
    [name, item.day, item.night, item.full, total].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  document.getElementById("summaryText").textContent = `合計差距 ${max - min} 班，共 ${rows.length} 天`;
}

function toCsvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  if (!state.schedule.length) generateSchedule();

  const header = ["日期", "星期", "類型", "日班", "夜班", "全天", "假日名稱"];
  const lines = [
    header.map(toCsvValue).join(","),
    ...state.schedule.map((row) =>
      [row.date, row.weekday, row.type, row.day, row.night, row.full, row.holidayName].map(toCsvValue).join(",")
    ),
  ];
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "115年4到7月排班表.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.getElementById("generateBtn").addEventListener("click", generateSchedule);
document.getElementById("csvBtn").addEventListener("click", exportCsv);

setupControls();
generateSchedule();
