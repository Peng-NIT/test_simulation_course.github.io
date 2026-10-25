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

const generatedPddl = `(:init
  (at wire_1 wire_area)
  (hazard-mapped live_zone_1)
  (route-open route_left))
(:goal
  (and (stripped wire_1)
       (at wire_1 terminal_slot)))`;
const pddlDraft = document.querySelector("#pddl-draft");
const draftState = document.querySelector("#draft-state");
const authorRun = document.querySelector("#author-run");
const authorNote = document.querySelector("#author-note");
const reviewSteps = [...document.querySelectorAll(".review-step")];
let authorRunId = 0;

authorRun.addEventListener("click", async () => {
  const runId = ++authorRunId;
  authorRun.disabled = true;
  reviewSteps.forEach((step, index) => {
    step.classList.toggle("active", index === 0);
    step.classList.remove("complete");
  });
  authorNote.textContent = "大语言模型正在把对象、目标、约束和协作关系映射为 PDDL。";
  draftState.textContent = "分析任务语义";
  await pause(reducedMotion ? 0 : 600);
  reviewSteps[0].classList.replace("active", "complete");
  reviewSteps[1].classList.add("active");
  pddlDraft.textContent = "";
  pddlDraft.classList.add("is-writing");
  draftState.textContent = "AI 正在生成";
  for (let index = 1; index <= generatedPddl.length; index += 1) {
    if (runId !== authorRunId) return;
    pddlDraft.textContent = generatedPddl.slice(0, index);
    if (!reducedMotion) await pause(14);
  }
  pddlDraft.classList.remove("is-writing");
  reviewSteps[1].classList.replace("active", "complete");
  reviewSteps[2].classList.add("active");
  draftState.textContent = "检查谓词中";
  await pause(reducedMotion ? 0 : 650);
  if (runId !== authorRunId) return;
  reviewSteps[2].classList.replace("active", "complete");
  reviewSteps[3].classList.add("active");
  draftState.textContent = "AI 草稿 · 待确认";
  authorNote.textContent = "草稿已通过示例检查；学生确认对象、目标和安全路线后，才允许交给规划器。";
  authorRun.querySelector("span").textContent = "重新生成 PDDL 草稿";
  authorRun.disabled = false;
});

const choiceButtons = [...document.querySelectorAll(".choice-list button")];
const hintButton = document.querySelector("#hint-choice");
const submitChoice = document.querySelector("#submit-choice");
const blankToken = document.querySelector("#blank-token");
const choiceCode = document.querySelector("#choice-code");
const choiceFeedback = document.querySelector("#choice-feedback");
const choiceHint = document.querySelector("#choice-hint");
const traceLines = [...document.querySelectorAll(".trace-line")];
let selectedChoice = "";

choiceButtons.forEach(button => button.addEventListener("click", () => {
  selectedChoice = button.dataset.answer;
  choiceButtons.forEach(item => item.classList.toggle("selected", item === button));
  choiceButtons.forEach(item => item.classList.remove("correct", "wrong"));
  blankToken.textContent = button.textContent;
  choiceCode.textContent = `(${button.textContent} route_left)`;
  choiceFeedback.textContent = "已补全，等待验证前置条件";
  traceLines[0].classList.add("complete");
  traceLines[1].classList.add("active");
  traceLines[2].classList.remove("active", "complete");
  traceLines[3].classList.remove("active", "complete");
}));

hintButton.addEventListener("click", () => {
  choiceHint.textContent = "AI 提示：Plan 只能使用当前处于可通行状态的路线。请比较 open、blocked 与 holding 三个谓词的语义。";
  choiceHint.classList.add("is-shown");
});

submitChoice.addEventListener("click", async () => {
  if (!selectedChoice) {
    choiceFeedback.textContent = "请先选择一个谓词";
    return;
  }
  const selectedButton = choiceButtons.find(button => button.dataset.answer === selectedChoice);
  const isCorrect = selectedChoice === "open";
  selectedButton.classList.add(isCorrect ? "correct" : "wrong");
  traceLines[1].classList.replace("active", "complete");
  traceLines[2].classList.add("active");
  choiceFeedback.textContent = isCorrect ? "前置条件成立，Plan 已生成" : "前置条件不成立，规划在此停止";
  await pause(reducedMotion ? 0 : 650);
  if (isCorrect) {
    traceLines[2].classList.replace("active", "complete");
    traceLines[3].classList.add("active");
    choiceHint.textContent = "正确：route-open 既补全了 Problem，也为 safe-route 动作提供了前置条件。";
  } else {
    choiceHint.textContent = "当前谓词无法表达“路线可用”。请根据提示修改后再次提交。";
  }
});

const failureCases = {
  route: {
    code: "(route-selected route_direct)\n(clearance live_zone_1 0.00)",
    rule: "进入带电区域安全包络",
    fix: "改用 route_left，并重新规划"
  },
  height: {
    code: "safe_z = 0.82 m\nline_clearance = 0.03 m",
    rule: "末端与高压线净距小于阈值",
    fix: "降低 safe_z，并重新检查整段轨迹"
  },
  arms: {
    code: "left_hold = true\narm_clearance = 0.01 m",
    rule: "左右臂连杆安全距离不足",
    fix: "增加等待路点，错开双臂动作时序"
  }
};
const caseButtons = [...document.querySelectorAll(".case-tabs button")];
const riskScene = document.querySelector("#risk-scene");
const failureCode = document.querySelector("#failure-code");
const failureRule = document.querySelector("#failure-rule");
const failureFix = document.querySelector("#failure-fix");
const failureStatus = document.querySelector("#failure-status");
const playFailure = document.querySelector("#play-failure");
let activeFailure = "route";

const setFailureCase = name => {
  activeFailure = name;
  caseButtons.forEach(button => button.classList.toggle("active", button.dataset.case === name));
  riskScene.className = `risk-scene case-${name}`;
  failureCode.textContent = failureCases[name].code;
  failureRule.textContent = failureCases[name].rule;
  failureFix.textContent = failureCases[name].fix;
  failureStatus.textContent = "等待执行";
  failureCode.parentElement.classList.remove("is-error");
  playFailure.querySelector("span").textContent = "播放错误执行";
};

caseButtons.forEach(button => button.addEventListener("click", () => setFailureCase(button.dataset.case)));
playFailure.addEventListener("click", async () => {
  playFailure.disabled = true;
  riskScene.className = `risk-scene case-${activeFailure} is-running`;
  failureStatus.textContent = "逐帧检查中";
  playFailure.querySelector("span").textContent = "正在接近危险边界…";
  await pause(reducedMotion ? 0 : 2450);
  riskScene.className = `risk-scene case-${activeFailure} is-stopped`;
  failureStatus.textContent = "已拦截";
  failureCode.parentElement.classList.add("is-error");
  playFailure.querySelector("span").textContent = "重新播放错误执行";
  playFailure.disabled = false;
});
setFailureCase(activeFailure);
