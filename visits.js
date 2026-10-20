(() => {
  "use strict";
  const key = "virtual-lab-visits-v1";
  const counter = document.getElementById("visit-counter");
  const status = document.getElementById("visit-status");
  const endpoint = (window.SITE_CONFIG || {}).visitsApiUrl || "api/visits";
  const increment = () => {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return 1 + Math.floor(random[0] / 4294967296 * 9);
  };
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let inView = false;
  let latestTotal = null;
  let played = false;
  const render = (value, animate = true) => {
    if (!counter) return;
    counter.replaceChildren();
    counter.setAttribute("aria-label", `累计访问量 ${value.toLocaleString("zh-CN")}`);
    const formatted = String(value);
    counter.style.fontSize = `clamp(20px, ${Math.min(16, 78 / formatted.length)}vw, ${Math.min(180, 1000 / formatted.length)}px)`;
    let column = 0;
    for (const character of formatted) {
      const cell = document.createElement("span");
      cell.setAttribute("aria-hidden", "true");
      if (character === ",") {
        cell.className = "counter-comma";
        cell.textContent = ",";
      } else {
        cell.className = "counter-digit";
        const reel = document.createElement("span");
        reel.className = "digit-reel";
        // Several full revolutions create a fast opening and a long, gradual reveal.
        const target = Number(character) + 40 + column * 10;
        for (let digit = 0; digit <= target; digit++) {
          const item = document.createElement("span");
          item.textContent = digit % 10;
          reel.append(item);
        }
        cell.append(reel);
        const finalPosition = `translateY(-${target * 1.16}em)`;
        reel.style.transform = finalPosition;
        if (animate && !motion.matches) {
          const duration = 2600 + column * 260;
          const animation = reel.animate([
            { transform: "translateY(0)", filter: "blur(2px)", offset: 0 },
            { transform: `translateY(-${target * 1.16 * .72}em)`, filter: "blur(1px)", offset: .42 },
            { transform: finalPosition, filter: "blur(0)", offset: 1 }
          ], { duration, easing: "cubic-bezier(.12,.55,.22,1)", fill: "none" });
          const stopOnMotionPreference = () => { if (motion.matches) animation.finish(); };
          motion.addEventListener("change", stopOnMotionPreference);
          animation.finished.finally(() => motion.removeEventListener("change", stopOnMotionPreference));
        }
        column++;
      }
      counter.append(cell);
    }
  };
  const reveal = () => {
    if (!inView || latestTotal === null) return;
    render(latestTotal, !played);
    played = true;
  };
  const updateTotal = value => {
    latestTotal = value;
    reveal();
  };
  if (counter && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        inView = true;
        reveal();
        observer.disconnect();
      }
    }, { threshold: .5 });
    observer.observe(counter);
  } else {
    inView = true;
  }
  const localCount = () => {
    let saved = 1000;
    try {
      const parsed = Number(localStorage.getItem(key));
      if (Number.isSafeInteger(parsed) && parsed >= 1000) saved = parsed;
    } catch (_) { /* Browser storage can be disabled. */ }
    // Each page load counts once; ordinary clicks and scrolling do not count again.
    const value = Math.min(Number.MAX_SAFE_INTEGER, saved + increment());
    try { localStorage.setItem(key, String(value)); } catch (_) { /* Keep this page usable. */ }
    return value;
  };
  const load = async () => {
    try {
      if (location.protocol === "file:") throw new Error("local file");
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error("counter unavailable");
      const data = await response.json();
      if (!Number.isSafeInteger(data.total) || data.total < 1000) throw new Error("invalid total");
      updateTotal(data.total);
      if (status) status.textContent = "访问记录已更新";
    } catch (_) {
      updateTotal(localCount());
      if (status) status.textContent = "当前浏览器的访问记录";
    }
  };
  render(1000, false);
  load();
  window.addEventListener("storage", event => {
    const value = Number(event.newValue);
    if (counter && event.key === key && Number.isSafeInteger(value) && value >= 1000) updateTotal(value);
  });
})();
