// app.js — 記帳小本子 (DEMO) · vanilla JS, no dependencies, localStorage only.
// Works by double-clicking index.html (file://) or from any static server.

"use strict";

const STORAGE_KEY = "expense-tracker:demo:v1";
const CATEGORIES = ["食", "交通", "購物", "娛樂", "家居", "其他"];

// ---------- state + storage ----------
let expenses = [];
let storageOk = true;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) expenses = parsed.filter(isValidExpense);
    }
  } catch {
    storageOk = false; // private mode / storage disabled → in-memory only
  }
}

function saveState() {
  if (!storageOk) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    storageOk = false;
  }
}

function isValidExpense(e) {
  return (
    e &&
    typeof e.id === "string" &&
    typeof e.amount === "number" &&
    Number.isFinite(e.amount) &&
    e.amount > 0 &&
    typeof e.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date)
  );
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---------- money / date helpers ----------
function formatMoney(n) {
  return "NT$" + n.toLocaleString("zh-TW");
}

function monthOf(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

// ---------- seed (DEMO data, clearly fake) ----------
const SEED = [
  { amount: 85, category: "食", date: null, note: "早餐三明治+拿鐵（測試）" },
  { amount: 240, category: "食", date: null, note: "午餐便當（測試）" },
  { amount: 30, category: "交通", date: null, note: "捷運（測試）" },
  { amount: 499, category: "購物", date: null, note: "線上書店（測試）" },
  { amount: 150, category: "娛樂", date: null, note: "電影票（測試）" },
  { amount: 1200, category: "家居", date: null, note: "燈泡+電池（測試）" },
];

function seedDemo() {
  const todayStr = today();
  const seeds = SEED.map((s) => ({
    id: makeId(),
    amount: s.amount,
    category: s.category,
    date: s.date || todayStr,
    note: s.note,
  }));
  expenses = seeds.concat(expenses);
  saveState();
  renderAll();
}

// ---------- render ----------
const $ = (sel) => document.querySelector(sel);

function renderAll() {
  renderMonthTotal();
  renderCategoryStats();
  renderList();
}

function renderMonthTotal() {
  const m = monthOf(today());
  const total = expenses.filter((e) => monthOf(e.date) === m).reduce((s, e) => s + e.amount, 0);
  $("#month-total").textContent = formatMoney(total);
}

function renderCategoryStats() {
  const m = monthOf(today());
  const byCat = {};
  let max = 0;
  for (const e of expenses) {
    if (monthOf(e.date) !== m) continue;
    byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    if (byCat[e.category] > max) max = byCat[e.category];
  }
  const box = $("#category-stats");
  box.textContent = "";
  for (const cat of CATEGORIES) {
    const amount = byCat[cat] || 0;
    const row = document.createElement("div");
    row.className = "stat-row";
    const label = document.createElement("span");
    label.className = "stat-label";
    label.textContent = cat;
    const barWrap = document.createElement("span");
    barWrap.className = "stat-bar-wrap";
    const bar = document.createElement("span");
    bar.className = "stat-bar";
    bar.style.width = max > 0 ? Math.max(2, Math.round((amount / max) * 100)) + "%" : "0%";
    barWrap.append(bar);
    const value = document.createElement("span");
    value.className = "stat-value";
    value.textContent = amount > 0 ? formatMoney(amount) : "—";
    row.append(label, barWrap, value);
    box.append(row);
  }
}

function renderList() {
  const list = $("#expense-list");
  list.textContent = "";
  const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  for (const e of sorted.slice(0, 30)) {
    const li = document.createElement("li");
    li.className = "expense";
    const main = document.createElement("div");
    main.className = "expense-main";
    const top = document.createElement("div");
    top.className = "expense-top";
    const cat = document.createElement("span");
    cat.className = "expense-cat";
    cat.textContent = e.category;
    const note = document.createElement("span");
    note.className = "expense-note";
    note.textContent = e.note || "（無備註）";
    top.append(cat, note);
    const date = document.createElement("span");
    date.className = "expense-date";
    date.textContent = e.date;
    main.append(top, date);
    const side = document.createElement("div");
    side.className = "expense-side";
    const amount = document.createElement("strong");
    amount.className = "expense-amount";
    amount.textContent = formatMoney(e.amount);
    const del = document.createElement("button");
    del.className = "expense-del";
    del.type = "button";
    del.textContent = "刪除";
    del.setAttribute("aria-label", "刪除這筆支出");
    del.addEventListener("click", () => {
      expenses = expenses.filter((x) => x.id !== e.id);
      saveState();
      renderAll();
    });
    side.append(amount, del);
    li.append(main, side);
    list.append(li);
  }
  $("#list-empty").hidden = sorted.length > 0;
}

// ---------- events ----------
function initForm() {
  const select = $("#f-category");
  for (const cat of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.append(opt);
  }
  $("#f-date").value = today();
  $("#add-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const amountRaw = $("#f-amount").value.trim();
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      $("#f-amount").focus();
      return;
    }
    const entry = {
      id: makeId(),
      amount: Math.round(amount * 100) / 100,
      category: $("#f-category").value,
      date: $("#f-date").value || today(),
      note: $("#f-note").value.trim().slice(0, 80),
    };
    expenses.push(entry);
    saveState();
    renderAll();
    $("#add-form").reset();
    $("#f-date").value = today();
    $("#f-amount").focus();
  });
  $("#btn-clear").addEventListener("click", () => {
    if (confirm("確定清除全部測試資料？此動作無法復原。")) {
      expenses = [];
      saveState();
      renderAll();
    }
  });
  $("#btn-seed").addEventListener("click", seedDemo);
}

// ---------- boot ----------
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initForm();
  if (!storageOk) {
    const note = document.createElement("p");
    note.className = "storage-warning";
    note.textContent = "警告：此瀏覽器無法使用 localStorage，資料不會保存（僅本次開啟有效）。";
    document.querySelector(".app").prepend(note);
  }
  renderAll();
});
