const config = window.SITE_CONFIG || {};
const streamlitLink = document.querySelector("#streamlit-link");
const linkStatus = document.querySelector("#link-status");
const appUrl = config.streamlitAppUrl || "";

if (appUrl && !appUrl.includes("your-app")) {
  streamlitLink.href = appUrl;
} else {
  streamlitLink.removeAttribute("target");
  streamlitLink.addEventListener("click", event => {
    event.preventDefault();
    linkStatus.textContent = "Streamlit App 地址尚未配置，请在 config.js 中填写部署地址。";
    linkStatus.classList.add("notice");
  });
}

const progressBar = document.querySelector(".progress i");
const updateProgress = () => {
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (distance > 0 ? window.scrollY / distance * 100 : 0) + "%";
};
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const navLinks = [...document.querySelectorAll("nav a")];
const navSections = navLinks
  .map(link => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
if ("IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-25% 0px -60% 0px" });
  navSections.forEach(section => navObserver.observe(section));
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveals = document.querySelectorAll(".reveal");
if (reducedMotion || !("IntersectionObserver" in window)) {
  reveals.forEach(element => element.classList.add("visible"));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
  reveals.forEach(element => observer.observe(element));
}

const typeLine = document.querySelector(".type-line");
const phrase = typeLine.dataset.text;
const stageNodes = [...document.querySelectorAll(".stage-node")];
const stageLines = [...document.querySelectorAll(".pulse-line")];
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
if (reducedMotion) {
  typeLine.textContent = phrase;
  stageNodes.forEach(node => node.classList.add("is-complete"));
} else {
  const playPipeline = async () => {
    typeLine.classList.remove("is-resetting");
    typeLine.textContent = "";
    stageNodes.forEach(node => node.classList.remove("is-active", "is-complete"));
    stageLines.forEach(line => line.classList.remove("is-flowing"));
    await pause(450);
    for (let index = 1; index <= phrase.length; index += 1) {
      typeLine.textContent = phrase.slice(0, index);
      await pause(105);
    }
    await pause(350);
    for (let index = 0; index < stageNodes.length; index += 1) {
      if (index > 0) stageNodes[index - 1].classList.replace("is-active", "is-complete");
      stageNodes[index].classList.add("is-active");
      await pause(650);
      if (stageLines[index]) {
        stageLines[index].classList.add("is-flowing");
        await pause(550);
      }
    }
    stageNodes.at(-1).classList.replace("is-active", "is-complete");
    await pause(2200);
    typeLine.classList.add("is-resetting");
    await pause(280);
    playPipeline();
  };
  playPipeline();
}

const explainButton = document.querySelector("#generate-explanation");
const explainButtonText = explainButton.querySelector("span");
const explainProcess = document.querySelector("#explain-process");
const processLabels = explainProcess.querySelectorAll("span");
const explanationResult = document.querySelector("#explanation-result");
const placeholderTitle = explanationResult.querySelector(".result-placeholder strong");
const sourceCode = document.querySelector(".source-card pre");
const parameterRows = [...document.querySelectorAll(".source-card dl div")];

const runExplanation = async () => {
  explainButton.disabled = true;
  explainButton.classList.remove("is-replay");
  explanationResult.classList.remove("is-generated");
  explanationResult.classList.add("is-waiting");
  processLabels[0].textContent = "准备分析";
  placeholderTitle.textContent = "正在载入实验上下文";
  await pause(reducedMotion ? 0 : 260);
  explainButtonText.textContent = "正在分析实验内容…";
  explanationResult.classList.remove("is-waiting");
  explanationResult.classList.add("is-generating");
  explainProcess.classList.add("is-processing");

  if (!reducedMotion) {
    sourceCode.classList.add("is-highlighted");
    processLabels[0].textContent = "解析任务目标";
    placeholderTitle.textContent = "正在解析 PDDL 目标";
    await pause(850);
    sourceCode.classList.remove("is-highlighted");
    parameterRows[0].classList.add("is-highlighted");
    processLabels[0].textContent = "识别参数影响";
    placeholderTitle.textContent = "正在分析安全高度";
    await pause(700);
    parameterRows[0].classList.remove("is-highlighted");
    parameterRows[1].classList.add("is-highlighted");
    processLabels[0].textContent = "构建动作链";
    placeholderTitle.textContent = "正在组织动作规划关系";
    await pause(700);
    parameterRows[1].classList.remove("is-highlighted");
    parameterRows[2].classList.add("is-highlighted");
    processLabels[0].textContent = "评估执行风险";
    placeholderTitle.textContent = "正在生成参数因果分析";
    await pause(700);
    parameterRows[2].classList.remove("is-highlighted");
  }

  processLabels[0].textContent = "分析完成";
  explainProcess.classList.remove("is-processing");
  explanationResult.classList.remove("is-generating");
  explanationResult.classList.add("is-generated");
  explainButtonText.textContent = "重新播放深度解读";
  explainButton.classList.add("is-replay");
  explainButton.disabled = false;
};

explainButton.addEventListener("click", runExplanation);
