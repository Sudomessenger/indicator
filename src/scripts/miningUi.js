import { computeMining } from "../lib/miningScore.js";

const detailCardColors = [
  "rgba(255, 244, 232, 0.96)",
  "rgba(239, 247, 255, 0.96)",
  "rgba(241, 252, 244, 0.96)",
  "rgba(247, 241, 255, 0.96)",
  "rgba(255, 246, 241, 0.96)",
  "rgba(242, 248, 239, 0.96)"
];

const salesValue = document.querySelector("[data-sales-value]");
const gaugeArc = document.querySelector(".gauge__arc");
const gaugeNeedle = document.querySelector("[data-gauge-needle]");
const filterTitle = document.querySelector("[data-filter-title]");
const filterList = document.querySelector("[data-filter-list]");
const miningCaption = document.querySelector("[data-mining-caption]");

let activeFilter = "Trust";
let needleTarget = 0;

const formatWeight = (value) => {
  const normalized = Math.min(1, Math.max(0.1, Number(value) || 0));
  return normalized.toFixed(2);
};

const formatScore = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toFixed(1);
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const currentMining = () => {
  if (window.__SUDO_MINING__) return window.__SUDO_MINING__;
  const profile = window.__SUDO_PROFILE__;
  if (!profile) return computeMining({});
  return computeMining(profile);
};

const setNeedleRotation = (progress) => {
  needleTarget = -90 + (180 * progress) / 100;
};

const renderGauge = (mining) => {
  const workpower = Number(mining?.workpower) || 0;
  const progress = Math.min(100, Math.max(10, workpower * 100));

  if (salesValue) salesValue.textContent = formatWeight(workpower);
  if (gaugeArc) gaugeArc.style.setProperty("--progress", `${progress}%`);
  setNeedleRotation(progress);

  if (miningCaption) {
    const gate = Number(mining?.sybilGate);
    const ubw = formatScore(mining?.ubw);
    const euw = formatScore(mining?.euw);
    const risk = mining?.sybilLabel || "Unscored";
    miningCaption.textContent = `UBW ${ubw} · EUW ${euw} · gate ${gate.toFixed(2)} · ${risk}`;
  }
};

const renderShortcuts = (mining) => {
  const scores = Object.fromEntries(
    (mining?.shortcuts || []).map((item) => [item.id, item.score])
  );

  document.querySelectorAll("[data-shortcut]").forEach((button) => {
    const key = button.dataset.shortcut;
    const note = button.querySelector("[data-shortcut-note]");
    if (note && scores[key] != null) {
      note.textContent = formatScore(scores[key]);
    }
  });
};

const renderFilterDetails = (name, mining = currentMining()) => {
  const component = mining?.components?.[name];
  if (!component || !filterTitle || !filterList) return;

  activeFilter = name;
  filterTitle.textContent = `${name}  ${formatScore(component.score)}`;
  filterList.innerHTML = component.parts
    .map((part, index) => {
      const signal = part.signal ? `<small>${escapeHtml(part.signal)}</small>` : "";
      const weight = Math.round(part.weight * 100);

      return `
        <li style="--card-tint: ${detailCardColors[index % detailCardColors.length]}">
          <div class="filter-detail-copy">
            <span>${escapeHtml(part.label)}</span>
            <small>Weight ${weight}%</small>
            ${signal}
          </div>
          <strong>${formatScore(part.score)}</strong>
        </li>
      `;
    })
    .join("");
};

const applyMining = (mining) => {
  if (!mining) return;
  window.__SUDO_MINING__ = mining;
  renderGauge(mining);
  renderShortcuts(mining);
  renderFilterDetails(activeFilter, mining);
};

let animationFrame = null;
const animateNeedle = () => {
  if (gaugeNeedle) {
    const wobble = Math.sin(Date.now() / 320) * 3.5;
    gaugeNeedle.style.transform = `translateX(-50%) rotate(${needleTarget + wobble}deg)`;
  }
  animationFrame = window.requestAnimationFrame(animateNeedle);
};

document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("is-selected", chip === button);
    });
    renderFilterDetails(button.dataset.filter);
    renderGauge(currentMining());
  });
});

document.querySelectorAll("[data-shortcut]").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.shortcut;
    const chip = document.querySelector(`[data-filter="${filter}"]`);
    if (chip) chip.click();
  });
});

window.addEventListener("sudo-profile", (event) => {
  const profile = event.detail || window.__SUDO_PROFILE__;
  if (profile?.mining) {
    applyMining(profile.mining);
    return;
  }
  applyMining(computeMining(profile || {}));
});

window.addEventListener("sudo-mining", (event) => {
  applyMining(event.detail);
});

applyMining(currentMining());
animateNeedle();

void animationFrame;
