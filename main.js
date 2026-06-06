const { ItemView, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, setIcon } = require("obsidian");

const VIEW_TYPE = "thirdspace-dashboard-view";

const DEFAULT_SETTINGS = {
  openOnStartup: true,
  refreshIntervalSeconds: 120,
  dashboardTheme: "warm"
};

const THEMES = ["warm", "sage", "night"];
const THEME_LABELS = { warm: "暖黄", sage: "青绿", night: "夜间" };

const PATHS = {
  home: "00-Home/Thirdspace 总控台.md",
  canvas: "00-Home/Thirdspace 工作台.canvas",
  projectHome: "00-Home/项目总览.md",
  hermesHome: "00-Home/Hermes 总览.md",
  systemHome: "00-Home/系统状态.md",
  todayBrief: "10-Daily/today-brief.md",
  tasks: "60-Tasks/open-tasks.md",
  radar: "70-Radar/today-hotspots.md",
  projectStatus: "20-Projects/code/status.md",
  projectWiki: "40-Wiki/Projects/code.md",
  projectLog: "20-Projects/code/progress-log.md",
  hermesLogs: "90-Agent/Hermes-Logs",
  projectUploads: "90-Agent/Project-Uploads",
  vaultSchema: "95-System/vault-schema.md",
  localOps: "95-System/local-operations.md",
  vpsDeploy: "95-System/vps-hermes-deployment.md"
};

const WORKSPACES = [
  ["00-Capture", "捕获", "临时收件箱，放随手记录、闪念、未整理输入。", "inbox", "blue"],
  ["00-Home", "主页", "主控入口，放系统状态、项目总览、Hermes 总览和工作台。", "home", "slate"],
  ["01-Sources", "来源", "原始资料库，放网页、文章、聊天记录、会议记录和外部素材。", "book-open", "cyan"],
  ["02-Clips", "剪藏", "信息剪辑区，放热点雷达剪藏、网页摘要和可二次整理片段。", "copy", "violet"],
  ["10-Daily", "每日", "每日笔记区，放今日简报、日记、当天计划和复盘。", "calendar-days", "green"],
  ["11-Weekly", "每周", "周度复盘区，放周报、周计划和一周项目回顾。", "calendar-range", "green"],
  ["12-Monthly", "每月", "月度总结区，放月计划、月报和长期趋势回顾。", "calendar", "green"],
  ["20-Projects", "项目", "项目主档案，放项目简介、状态、架构、文件地图和运行手册。", "folder-kanban", "orange"],
  ["21-Active", "进行中", "当前推进区，放正在执行、需要持续关注的项目或行动。", "play-circle", "orange"],
  ["22-On-Hold", "暂停", "等待区，放暂时搁置、缺少条件或等待他人反馈的事项。", "pause-circle", "yellow"],
  ["23-Done", "完成", "归档区，放已完成项目、阶段成果和可复用经验。", "check-circle-2", "teal"],
  ["30-Areas", "领域", "长期责任区，放学习、工作、健康、财务等持续经营主题。", "layers", "purple"],
  ["40-Wiki", "Wiki", "知识库区，放 Hermes 编译出的主题页、索引页和可链接知识。", "database", "teal"],
  ["50-Zettels", "卡片", "原子笔记区，放知识卡片、长期记忆和可复用观点。", "sticky-note", "cyan"],
  ["60-Tasks", "任务", "行动管理区，放 open tasks、next actions、waiting 和任务队列。", "list-checks", "red"],
  ["70-Radar", "雷达", "热点雷达区，放今日热点、信息源、趋势观察和外部动态。", "radio", "yellow"],
  ["80-Prompts", "请求", "Agent 入口区，放你写给 Hermes 的待处理需求和指令。", "message-square", "purple"],
  ["90-Agent", "Agent", "后台输出区，放 Hermes 日志、项目上传包、处理结果和草稿。", "bot", "slate"],
  ["95-System", "系统", "系统规则区，放 Vault 结构、语言策略、部署文档和运行规范。", "settings", "gray"]
];

const JOBS = [
  ["radar-update", "每 30 分钟", "已验证", "good", PATHS.radar],
  ["night-review", "23:30", "待验证", "wait", PATHS.hermesHome],
  ["daily-compile", "06:00", "待验证", "wait", PATHS.todayBrief],
  ["git-backup", "23:50", "已配置", "good", PATHS.systemHome]
];

module.exports = class ThirdspaceDashboardPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.registerView(VIEW_TYPE, (leaf) => new ThirdspaceDashboardView(leaf, this));

    this.addRibbonIcon("layout-dashboard", "打开 Thirdspace Workbench", () => this.activateView(true));
    this.addCommand({ id: "open-thirdspace-dashboard", name: "打开 Thirdspace Workbench", callback: () => this.activateView(true) });
    this.addCommand({ id: "refresh-thirdspace-dashboard", name: "刷新 Thirdspace Workbench", callback: () => this.refreshOpenViews() });
    this.addSettingTab(new ThirdspaceDashboardSettingTab(this.app, this));

    this.registerInterval(window.setInterval(() => this.refreshOpenViews(false), Math.max(30, this.settings.refreshIntervalSeconds) * 1000));
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.openOnStartup) window.setTimeout(() => this.activateView(false), 700);
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView(focus) {
    let leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (!leaves.length) {
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    }
    if (leaves.length && focus) this.app.workspace.revealLeaf(leaves[0]);
  }

  refreshOpenViews(showNotice = true) {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    leaves.forEach((leaf) => leaf.view && typeof leaf.view.refresh === "function" && leaf.view.refresh());
    if (showNotice) new Notice("Thirdspace Workbench 已刷新");
  }
};

class ThirdspaceDashboardSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Thirdspace Dashboard" });

    new Setting(containerEl)
      .setName("启动时打开 Workbench")
      .setDesc("打开 Obsidian 后自动进入 Thirdspace Workbench 视图。")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.openOnStartup).onChange(async (value) => {
        this.plugin.settings.openOnStartup = value;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("控制台主题")
      .setDesc("只影响 Thirdspace Workbench 内部，不改 Obsidian 全局主题。")
      .addDropdown((dropdown) => dropdown
        .addOption("warm", "暖黄色")
        .addOption("sage", "青绿色")
        .addOption("night", "夜间")
        .setValue(this.plugin.settings.dashboardTheme)
        .onChange(async (value) => {
          this.plugin.settings.dashboardTheme = value;
          await this.plugin.saveSettings();
          this.plugin.refreshOpenViews(false);
        }));

    new Setting(containerEl)
      .setName("自动刷新间隔")
      .setDesc("单位：秒。Workbench 会重新读取 Vault 文件。")
      .addText((text) => text.setPlaceholder("120").setValue(String(this.plugin.settings.refreshIntervalSeconds)).onChange(async (value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed >= 30) {
          this.plugin.settings.refreshIntervalSeconds = parsed;
          await this.plugin.saveSettings();
        }
      }));
  }
}

class ThirdspaceDashboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.refreshing = false;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Thirdspace Workbench"; }
  getIcon() { return "layout-dashboard"; }

  async onOpen() {
    await this.refresh();
  }

  async refresh() {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const data = await this.collectData();
      this.render(data);
    } catch (error) {
      console.error(error);
      this.contentEl.empty();
      this.contentEl.addClass("thirdspace-native-dashboard");
      const err = this.contentEl.createDiv({ cls: "tsd-error-state" });
      err.createEl("h2", { text: "Workbench 渲染失败" });
      err.createEl("p", { text: "请打开 Obsidian 开发者控制台查看错误详情。" });
    } finally {
      this.refreshing = false;
    }
  }

  async collectData() {
    const files = this.app.vault.getMarkdownFiles();
    const tasksText = await this.read(PATHS.tasks);
    const briefText = await this.read(PATHS.todayBrief);
    const radarText = await this.read(PATHS.radar);
    const uploads = this.listMarkdown(PATHS.projectUploads, files).slice(0, 40);
    const logs = this.listMarkdown(PATHS.hermesLogs, files).slice(0, 12);
    const openTasks = extractTasks(tasksText, false);
    const doneTasks = extractTasks(tasksText, true);
    const pendingUploads = uploads.filter((file) => this.frontmatter(file).status === "pending-hermes");
    const processedUploads = uploads.filter((file) => this.frontmatter(file).status === "processed");
    const folders = WORKSPACES.map(([path, label, desc, icon, tone]) => this.folderStat({ path, label, desc, icon, tone }, files));

    return {
      generatedAt: new Date(),
      files,
      openTasks,
      doneTasks,
      uploads,
      logs,
      pendingUploads,
      processedUploads,
      folders,
      briefItems: extractBrief(briefText),
      radarItems: extractRadarItems(radarText).slice(0, 6),
      radarDomains: extractDomains(radarText).slice(0, 6),
      activity: buildActivity(files),
      hotspotTimeline: buildHotspotTimeline(radarText, this.mtime(PATHS.radar)),
      folderChart: buildFolderChart(folders),
      mtimes: {
        radar: this.mtime(PATHS.radar),
        brief: this.mtime(PATHS.todayBrief),
        project: this.mtime(PATHS.projectStatus),
        latestLog: logs[0] ? logs[0].stat.mtime : null
      },
      counts: {
        notes: files.length,
        tasks: openTasks.length,
        doneTasks: doneTasks.length,
        wiki: this.listMarkdown("40-Wiki", files).length,
        clips: this.listMarkdown("02-Clips", files).length,
        processed: processedUploads.length,
        pending: pendingUploads.length,
        logs: logs.length
      }
    };
  }

  render(data) {
    const root = this.contentEl;
    root.empty();
    root.classList.remove("thirdspace-native-dashboard", "tsd-theme-warm", "tsd-theme-sage", "tsd-theme-night");
    root.classList.add("thirdspace-native-dashboard", `tsd-theme-${this.currentTheme()}`);

    const shell = root.createDiv({ cls: "tsd-shell" });
    this.renderHero(shell, data);
    this.renderHeatmap(shell, data);
    this.renderStats(shell, data);
    this.renderCharts(shell, data);
    const matrix = shell.createDiv({ cls: "tsd-matrix" });
    const left = matrix.createDiv({ cls: "tsd-column" });
    const mid = matrix.createDiv({ cls: "tsd-column" });
    const right = matrix.createDiv({ cls: "tsd-column" });
    this.renderToday(left, data);
    this.renderHotspotTimeline(left, data);
    this.renderRadar(mid, data);
    this.renderTasks(right, data);
    this.renderHermes(right, data);

    this.renderWorkspace(shell, data);
    this.renderDirectoryGuide(shell, data);
    this.bindActions(root);
    this.bindPointerEffects(root);
  }

  renderHero(parent, data) {
    const hero = parent.createDiv({ cls: "tsd-hero-card tsd-glass tsd-spotlight" });
    const copy = hero.createDiv({ cls: "tsd-hero-copy" });
    copy.createDiv({ cls: "tsd-kicker", text: "OBSIDIAN · HERMES · VPS" });
    copy.createEl("h1", { text: "Thirdspace Workbench" });
    copy.createEl("p", { text: "一个真正的本地控制台：查看今日、项目、任务、热点、Hermes 管线、同步状态和知识库入口。" });

    const actions = hero.createDiv({ cls: "tsd-hero-actions" });
    this.button(actions, "刷新", "refresh-cw", "refresh", "primary");
    this.button(actions, `主题：${THEME_LABELS[this.currentTheme()]}`, "palette", "theme");
    this.linkButton(actions, "今日简报", "calendar-days", PATHS.todayBrief);
    this.linkButton(actions, "热点雷达", "radio", PATHS.radar);
    this.linkButton(actions, "系统状态", "server", PATHS.systemHome);

    const status = hero.createDiv({ cls: "tsd-hero-status" });
    this.statusLine(status, "最近刷新", formatTime(data.generatedAt.getTime()), "info");
    this.statusLine(status, "Hermes", "常驻运行", "good");
    this.statusLine(status, "待处理包", `${data.counts.pending} 个`, data.counts.pending ? "wait" : "good");
  }

  renderHeatmap(parent, data) {
    const card = this.card(parent, "活动热力图", "GitHub 风格贡献图，按 Vault 文件修改时间生成。", PATHS.home, "heatmap full top");
    const top = card.body.createDiv({ cls: "tsd-heat-top" });
    top.createDiv({ cls: "tsd-heat-big", text: `${data.activity.total}` });
    top.createDiv({ cls: "tsd-heat-copy", text: `过去一年写入信号 · 当前连续 ${data.activity.streak} 天活跃` });

    const wrap = card.body.createDiv({ cls: "tsd-heat-wrap" });
    const grid = wrap.createDiv({ cls: "tsd-heat-grid" });
    data.activity.days.forEach((day) => {
      const cell = grid.createDiv({ cls: `tsd-heat-cell level-${day.level}` });
      cell.setAttr("title", `${day.key}: ${day.count} 次活动`);
      cell.setAttr("aria-label", `${day.key}: ${day.count} 次活动`);
    });

    const legend = card.body.createDiv({ cls: "tsd-heat-legend" });
    legend.createSpan({ text: "少" });
    for (let i = 0; i <= 4; i += 1) legend.createSpan({ cls: `tsd-legend-cell level-${i}` });
    legend.createSpan({ text: "多" });
  }

  renderStats(parent, data) {
    const grid = parent.createDiv({ cls: "tsd-stat-grid" });
    this.stat(grid, "待办", data.counts.tasks, "来自 60-Tasks", "list-checks", data.counts.tasks ? "warn" : "good");
    this.stat(grid, "热点", data.mtimes.radar ? formatRelative(data.mtimes.radar) : "等待", "today-hotspots", "radio", "info");
    this.stat(grid, "项目", 1, "已接入状态页", "folder-kanban", "orange");
    this.stat(grid, "已处理包", data.counts.processed, "project-memory-sync", "git-commit", "good");
    this.stat(grid, "Hermes 日志", data.counts.logs, "最近记录", "bot", "violet");
  }

  renderCharts(parent, data) {
    const grid = parent.createDiv({ cls: "tsd-chart-grid" });

    const done = data.counts.doneTasks;
    const open = data.counts.tasks;
    const totalTasks = Math.max(1, done + open);
    const donePct = Math.round((done / totalTasks) * 100);
    const donut = this.chartCard(grid, "任务完成率", "开放任务 / 已完成任务", "chart-no-axes-combined");
    const ring = donut.body.createDiv({ cls: "tsd-donut" });
    ring.style.setProperty("--pct", `${donePct}%`);
    ring.createDiv({ cls: "tsd-donut-core", text: `${donePct}%` });
    donut.body.createDiv({ cls: "tsd-chart-note", text: `${open} 个待办，${done} 个已完成` });

    const upload = this.chartCard(grid, "上传包处理", "本地 Skill 到 Hermes 的处理状态", "git-pull-request");
    this.bar(upload.body, "已处理", data.counts.processed, Math.max(1, data.counts.processed + data.counts.pending), "good");
    this.bar(upload.body, "待处理", data.counts.pending, Math.max(1, data.counts.processed + data.counts.pending), "wait");

    const folders = this.chartCard(grid, "Vault 分布", "主要目录文件数量", "bar-chart-3");
    data.folderChart.forEach((item) => this.bar(folders.body, item.label, item.count, item.max, item.tone));
  }

  renderHotspotTimeline(parent, data) {
    const card = this.card(parent, "今日热点时间流", "自动读取今日雷达，只展示最值得关注的热点。", PATHS.radar, "hot-timeline");
    if (!data.hotspotTimeline.length) {
      this.empty(card.body, "今日热点还没有可展示内容。等 radar-update 写入后会自动刷新。");
      return;
    }
    const timeline = card.body.createDiv({ cls: "tsd-timeline" });
    data.hotspotTimeline.slice(0, 5).forEach((item, index) => {
      const row = timeline.createDiv({ cls: `tsd-timeline-item ${index % 2 === 0 ? "left" : "right"} ${item.tone}` });
      const content = row.createDiv({ cls: "tsd-timeline-content" });
      content.createDiv({ cls: "tsd-timeline-title", text: item.title });
      content.createDiv({ cls: "tsd-timeline-desc", text: item.desc });
      content.createDiv({ cls: "tsd-timeline-time", text: item.time });
      row.createSpan({ cls: "tsd-timeline-dot" });
    });
  }

  renderToday(parent, data) {
    const card = this.card(parent, "今日工作台", "系统今天应该先告诉你的东西。", PATHS.todayBrief, "today");
    if (!data.briefItems.length) {
      this.empty(card.body, "今日简报还是种子模板。等 daily-compile 跑完，这里会自动变得有内容。");
      return;
    }
    data.briefItems.slice(0, 7).forEach((item) => this.item(card.body, item, "sparkle"));
  }

  renderRadar(parent, data) {
    const card = this.card(parent, "实时热点", "Hermes 每 30 分钟收集、提炼、写回 Obsidian。", PATHS.radar, "radar");
    if (!data.radarItems.length) {
      this.empty(card.body, "暂无可展示热点，打开原文可查看完整雷达输出。");
    } else {
      data.radarItems.forEach((item, index) => {
        const row = card.body.createDiv({ cls: "tsd-radar-row" });
        row.createDiv({ cls: "tsd-rank", text: String(index + 1).padStart(2, "0") });
        const copy = row.createDiv({ cls: "tsd-radar-copy" });
        copy.createDiv({ cls: "tsd-radar-title", text: item.title });
        copy.createDiv({ cls: "tsd-radar-meta", text: item.meta });
      });
    }
    if (data.radarDomains.length) {
      const domains = card.body.createDiv({ cls: "tsd-domain-row" });
      data.radarDomains.forEach((domain) => domains.createSpan({ text: domain }));
    }
  }

  renderTasks(parent, data) {
    const card = this.card(parent, "任务队列", "未完成任务和人工验收项。", PATHS.tasks, "tasks");
    const tasks = data.openTasks.slice(0, 8);
    if (!tasks.length) {
      this.empty(card.body, "当前没有未完成任务。可以确认是不是同步还没回来。");
      return;
    }
    tasks.forEach((task) => {
      const row = card.body.createDiv({ cls: "tsd-task-row" });
      row.createSpan({ cls: "tsd-check" });
      row.createSpan({ text: cleanDisplay(task) });
    });
  }

  renderHermes(parent, data) {
    const card = this.card(parent, "Hermes 中控", "自动化运行、日志和上传包状态。", PATHS.hermesHome, "hermes");
    JOBS.forEach(([name, time, state, tone, path]) => {
      const row = card.body.createDiv({ cls: "tsd-job-row" });
      row.dataset.path = path;
      const copy = row.createDiv({ cls: "tsd-job-copy" });
      copy.createDiv({ cls: "tsd-job-name", text: name });
      copy.createDiv({ cls: "tsd-job-time", text: time });
      row.createDiv({ cls: `tsd-pill ${tone}`, text: state });
    });

    const logs = card.body.createDiv({ cls: "tsd-log-list" });
    data.logs.slice(0, 3).forEach((file) => {
      const row = logs.createDiv({ cls: "tsd-log-row" });
      row.dataset.path = file.path;
      this.renderIcon(row, "file-text");
      row.createSpan({ text: `${file.basename} · ${formatRelative(file.stat.mtime)}` });
    });
  }

  renderWorkspace(parent, data) {
    const card = this.card(parent, "Vault 区域", "点击卡片定位目录；这里显示数量和最近更新。", PATHS.vaultSchema, "workspace full light");
    const grid = card.body.createDiv({ cls: "tsd-folder-grid" });
    data.folders.forEach((folder) => {
      const item = grid.createDiv({ cls: `tsd-folder-card ${folder.tone} ${folder.activity}` });
      item.dataset.path = folder.path;
      const head = item.createDiv({ cls: "tsd-folder-head" });
      this.renderIcon(head, folder.icon);
      head.createSpan({ text: folder.label });
      item.createDiv({ cls: "tsd-folder-path", text: folder.path });
      item.createDiv({ cls: "tsd-folder-count", text: String(folder.count) });

      item.createDiv({ cls: "tsd-folder-meta", text: folder.latest ? `最新：${formatRelative(folder.latest)}` : "暂无 Markdown 内容" });
    });
  }

  renderDirectoryGuide(parent, data) {
    const card = this.card(parent, "目录说明", "这些目录分别存放什么内容。", PATHS.vaultSchema, "directory-guide full light");
    const guide = card.body.createDiv({ cls: "tsd-directory-guide" });
    data.folders.forEach((folder) => {
      const row = guide.createDiv({ cls: `tsd-directory-row ${folder.tone}` });
      row.dataset.path = folder.path;
      const icon = row.createDiv({ cls: "tsd-directory-icon" });
      this.renderIcon(icon, folder.icon);
      const copy = row.createDiv({ cls: "tsd-directory-copy" });
      const title = copy.createDiv({ cls: "tsd-directory-title" });
      title.createSpan({ text: folder.label });
      title.createEl("code", { text: folder.path });
      copy.createDiv({ cls: "tsd-directory-desc", text: folder.desc });
      row.createDiv({ cls: "tsd-directory-count", text: `${folder.count} 篇` });
    });
  }
  card(parent, title, subtitle, path, kind = "") {
    const card = parent.createDiv({ cls: `tsd-card tsd-glass tsd-spotlight ${kind}` });
    const head = card.createDiv({ cls: "tsd-card-head" });
    const copy = head.createDiv({ cls: "tsd-card-title" });
    copy.createEl("h2", { text: title });
    if (subtitle) copy.createEl("p", { text: subtitle });
    if (path) {
      const open = head.createEl("button", { cls: "tsd-open" });
      open.dataset.path = path;
      this.renderIcon(open, "external-link");
      open.createSpan({ text: "打开" });
    }
    const body = card.createDiv({ cls: "tsd-card-body" });
    return { card, body };
  }

  chartCard(parent, title, subtitle, icon) {
    const card = parent.createDiv({ cls: "tsd-chart-card tsd-glass tsd-spotlight" });
    const head = card.createDiv({ cls: "tsd-chart-head" });
    this.renderIcon(head, icon);
    const copy = head.createDiv();
    copy.createDiv({ cls: "tsd-chart-title", text: title });
    copy.createDiv({ cls: "tsd-chart-subtitle", text: subtitle });
    const body = card.createDiv({ cls: "tsd-chart-body" });
    return { card, body };
  }

  stat(parent, label, value, hint, icon, tone) {
    const card = parent.createDiv({ cls: `tsd-stat-card tsd-glass tsd-spotlight ${tone}` });
    const head = card.createDiv({ cls: "tsd-stat-head" });
    this.renderIcon(head, icon);
    head.createSpan({ text: label });
    card.createDiv({ cls: "tsd-stat-value", text: String(value) });
    card.createDiv({ cls: "tsd-stat-hint", text: hint });
  }

  bar(parent, label, value, max, tone) {
    const row = parent.createDiv({ cls: "tsd-bar-row" });
    row.createSpan({ cls: "tsd-bar-label", text: label });
    const track = row.createSpan({ cls: "tsd-bar-track" });
    const fill = track.createSpan({ cls: `tsd-bar-fill ${tone}` });
    fill.style.width = `${Math.max(3, Math.round((value / Math.max(1, max)) * 100))}%`;
    row.createSpan({ cls: "tsd-bar-value", text: String(value) });
  }

  item(parent, text, icon) {
    const row = parent.createDiv({ cls: "tsd-item-row" });
    this.renderIcon(row, icon);
    row.createSpan({ text: cleanDisplay(text) });
  }

  empty(parent, text) {
    parent.createDiv({ cls: "tsd-empty", text });
  }

  statusLine(parent, label, value, tone) {
    const row = parent.createDiv({ cls: "tsd-status-line" });
    row.createSpan({ cls: `tsd-dot ${tone}` });
    row.createSpan({ text: label });
    row.createEl("strong", { text: value });
  }

  button(parent, label, icon, action, tone = "") {
    const button = parent.createEl("button", { cls: tone ? `tsd-button ${tone}` : "tsd-button" });
    button.dataset.action = action;
    this.renderIcon(button, icon);
    button.createSpan({ text: label });
  }

  linkButton(parent, label, icon, path) {
    const button = parent.createEl("button", { cls: "tsd-button" });
    button.dataset.path = path;
    this.renderIcon(button, icon);
    button.createSpan({ text: label });
  }

  renderIcon(parent, name) {
    const icon = parent.createSpan({ cls: "tsd-icon" });
    try { setIcon(icon, name); } catch (error) { icon.createSpan({ text: "" }); }
    return icon;
  }

  bindActions(root) {
    root.querySelectorAll("[data-path]").forEach((el) => {
      el.addEventListener("click", async () => this.openPath(el.dataset.path));
    });
    root.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", async () => {
        if (el.dataset.action === "refresh") await this.refresh();
        if (el.dataset.action === "theme") await this.toggleTheme();
      });
    });
  }

  bindPointerEffects(root) {
    root.onmousemove = (event) => {
      const rect = root.getBoundingClientRect();
      root.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      root.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    root.querySelectorAll(".tsd-spotlight").forEach((card) => {
      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
      });
    });
  }

  currentTheme() {
    return THEMES.includes(this.plugin.settings.dashboardTheme) ? this.plugin.settings.dashboardTheme : "warm";
  }

  async toggleTheme() {
    const current = this.currentTheme();
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    this.plugin.settings.dashboardTheme = next;
    await this.plugin.saveSettings();
    await this.refresh();
  }

  async openPath(path) {
    if (!path) return;
    const target = this.app.vault.getAbstractFileByPath(path);
    if (target instanceof TFile) {
      await this.openFile(target);
      return;
    }
    if (target instanceof TFolder) {
      if (this.revealInFileExplorer(target)) {
        new Notice(`已在文件列表中定位：${path}`);
        return;
      }
      const prefix = path.endsWith("/") ? path : `${path}/`;
      const latest = this.app.vault.getMarkdownFiles()
        .filter((file) => file.path.startsWith(prefix))
        .sort((a, b) => b.stat.mtime - a.stat.mtime)[0];
      if (latest) {
        await this.openFile(latest);
        new Notice(`已打开 ${path} 中最新的笔记`);
      } else {
        new Notice(`${path} 目录下暂无 Markdown 文件`);
      }
      return;
    }
    const linked = this.app.metadataCache.getFirstLinkpathDest(path, "");
    if (linked instanceof TFile) {
      await this.openFile(linked);
      return;
    }
    new Notice(`未找到：${path}`);
  }

  async openFile(file) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file);
  }

  revealInFileExplorer(target) {
    const leaves = this.app.workspace.getLeavesOfType("file-explorer");
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view && typeof view.revealInFolder === "function") {
        view.revealInFolder(target);
        this.app.workspace.revealLeaf(leaf);
        return true;
      }
    }
    const explorer = this.app.internalPlugins && this.app.internalPlugins.plugins && this.app.internalPlugins.plugins["file-explorer"];
    const instance = explorer && explorer.instance;
    if (instance && typeof instance.revealInFolder === "function") {
      instance.revealInFolder(target);
      return true;
    }
    return false;
  }

  async read(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? await this.app.vault.cachedRead(file) : "";
  }

  listMarkdown(folder, files) {
    const prefix = folder.endsWith("/") ? folder : folder + "/";
    return files.filter((file) => file.path.startsWith(prefix)).sort((a, b) => b.stat.mtime - a.stat.mtime);
  }

  folderStat(folder, files) {
    const items = this.listMarkdown(folder.path, files);
    const latest = items[0] ? items[0].stat.mtime : null;
    return Object.assign({}, folder, { count: items.length, latest, activity: latest ? ageTone(latest) : "cold" });
  }

  buildProjectTimeline(uploads, pendingUploads) {
    const initial = uploads.find((file) => file.basename.startsWith("initial"));
    const delta = uploads.find((file) => file.basename.startsWith("delta"));
    const pending = pendingUploads.length > 0;
    return [
      { title: "建立 code 项目记忆", desc: "本地 Skill 已接入项目上传流程", time: "第一步", tone: "good" },
      { title: "首次快照", desc: initial ? initial.basename : "等待首次上传", time: initial ? formatRelative(initial.stat.mtime) : "未完成", tone: initial ? "good" : "danger" },
      { title: "增量上传", desc: delta ? delta.basename : "等待下一次修改", time: delta ? formatRelative(delta.stat.mtime) : "等待", tone: delta ? "good" : "wait" },
      { title: "Hermes 云端提炼", desc: "生成项目状态、Wiki、任务和处理日志", time: pending ? "处理中" : "已完成", tone: pending ? "wait" : "good" },
      { title: "人工补充项目事实", desc: "补充项目目的、技术栈、运行方式、测试部署流程", time: "下一步", tone: "wait" }
    ];
  }

  frontmatter(file) {
    return (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {};
  }

  mtime(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file.stat.mtime : null;
  }
}

function extractTasks(text, done) {
  const pattern = done ? /^\s*- \[x\]\s+(.+)$/gim : /^\s*- \[ \]\s+(.+)$/gim;
  const out = [];
  let match;
  while ((match = pattern.exec(text)) !== null) out.push(stripHtmlComment(match[1]).trim());
  return out;
}

function extractBrief(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const value = line.trim();
    if (!value || value === "---") continue;
    if (/^(type|owner|status|created|modified|source|tags|date|time):/.test(value)) continue;
    if (/^#\s*Today Brief/i.test(value)) continue;
    if (/^##\s*(Priority|Project Updates|Open Tasks|Radar|Wiki Updates|Needs Review)$/i.test(value)) continue;
    if (/^#+\s+/.test(value) || /^[-*]\s+/.test(value)) out.push(cleanDisplay(value));
  }
  return out.slice(0, 10);
}

function extractRadarItems(text) {
  const sections = [];
  const lines = text.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const heading = /^###\s+(.+)$/.exec(line.trim());
    if (heading) {
      if (current) sections.push(current);
      current = { raw: heading[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.map((section, index) => {
    const domains = extractDomains(section.lines.join("\n")).slice(0, 2);
    return { title: summarizeHeading(section.raw, index + 1), meta: domains.length ? domains.join(" / ") : "Hermes radar" };
  });
}

function buildHotspotTimeline(text, fallbackMs) {
  const sections = [];
  const lines = text.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const heading = /^###\s+(.+)$/.exec(line.trim());
    if (heading) {
      if (current) sections.push(current);
      current = { raw: heading[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  const fallbackTime = fallbackMs || Date.now();
  return sections.map((section, index) => {
    const body = section.lines.join("\n");
    const explicitDate = findDateLabel(body);
    const domains = extractDomains(body).slice(0, 2);
    const title = summarizeHeading(section.raw, index + 1);
    return {
      title,
      desc: domains.length ? domains.join(" / ") : "Hermes 今日雷达",
      time: explicitDate || `${formatRelative(fallbackTime)} 更新`,
      sortTime: parseLooseDate(explicitDate) || (fallbackTime - index),
      tone: index === 0 ? "hot" : index < 3 ? "good" : "info"
    };
  }).sort((a, b) => b.sortTime - a.sortTime).slice(0, 6);
}

function findDateLabel(text) {
  const iso = text.match(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s*~\s*\d{1,2}[-/.]\d{1,2})?/);
  if (iso) return iso[0];
  const cn = text.match(/20\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日?/);
  if (cn) return cn[0].replace(/\s+/g, "");
  const month = text.match(/\d{1,2}\s*月\s*\d{1,2}\s*日?/);
  if (month) return month[0].replace(/\s+/g, "");
  return "";
}

function parseLooseDate(label) {
  if (!label) return 0;
  const normalized = label
    .replace(/年|月/g, "-")
    .replace(/日/g, "")
    .replace(/\s+/g, "")
    .split("~")[0];
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
function extractDomains(text) {
  const urls = text.match(/https?:\/\/[^\s)]+/g) || [];
  const seen = new Set();
  const out = [];
  urls.forEach((url) => {
    try {
      const domain = new URL(url.replace(/[，。；、]$/, "")).hostname.replace(/^www\./, "");
      if (!seen.has(domain)) { seen.add(domain); out.push(domain); }
    } catch (error) {}
  });
  return out;
}

function summarizeHeading(raw, index) {
  const cleaned = cleanDisplay(raw).replace(/^\d+\.\s*/, "");
  if (!looksGarbled(cleaned)) return cleaned;
  const ascii = cleaned.match(/[A-Za-z0-9][A-Za-z0-9 .+\-\/]{3,}/g) || [];
  if (ascii.length) return `${ascii.slice(0, 2).join(" ").trim()} · 查看详情`;
  return `热点条目 ${index}`;
}

function buildActivity(files) {
  const weeks = 53;
  const totalDays = weeks * 7;
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(today.getDate() - totalDays + 1);
  const counts = new Map();
  files.forEach((file) => {
    const key = dateKey(new Date(file.stat.mtime));
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const days = [];
  let total = 0;
  let max = 0;
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = dateKey(date);
    const count = counts.get(key) || 0;
    total += count;
    max = Math.max(max, count);
    days.push({ key, count });
  }
  days.forEach((day) => {
    day.level = day.count === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((day.count / Math.max(1, max)) * 4)));
  });
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].count > 0) streak += 1;
    else break;
  }
  return { days, total, streak };
}

function buildFolderChart(folders) {
  const top = folders.slice().sort((a, b) => b.count - a.count).slice(0, 5);
  const max = Math.max(1, ...top.map((item) => item.count));
  return top.map((item) => ({ label: item.label, count: item.count, max, tone: item.tone }));
}

function stripHtmlComment(text) {
  return text.replace(/<!--.*?-->/g, "");
}

function cleanDisplay(text) {
  return stripHtmlComment(text)
    .replace(/^#+\s*/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/`/g, "")
    .replace(/\[\[(.*?)\]\]/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function looksGarbled(text) {
  return /(锛|鈥|馃|€|鐑|闆|偣|鍏|涓|寮|妯|绋|堕|棿|浠|叏|瀹|悊|鏁)/.test(text);
}

function ageTone(ms) {
  const diff = Date.now() - ms;
  const day = 24 * 60 * 60 * 1000;
  if (diff <= 7 * day) return "hot";
  if (diff <= 30 * day) return "warm";
  return "cold";
}

function startOfDay(date) {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatRelative(ms) {
  if (!ms) return "未知";
  const diff = Date.now() - ms;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  return `${Math.floor(diff / day)} 天前`;
}

function formatTime(ms) {
  if (!ms) return "未知";
  return new Date(ms).toLocaleString("zh-CN", { hour12: false });
}