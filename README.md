# Thirdspace Dashboard

English | [中文](#中文)

Thirdspace Dashboard is a native Obsidian dashboard plugin for a Thirdspace-style personal knowledge system.

It turns Markdown files written by local tools, sync jobs, or background agents into a visual workbench inside Obsidian. The dashboard focuses on daily briefs, live radar notes, open tasks, Agent logs, project upload packets, and high-level Vault area status.

> This public release contains only the plugin code. It does not include personal notes, sync configuration, server addresses, logs, credentials, or private vault data.

## What It Does

- Adds a native Obsidian `ItemView` dashboard.
- Shows daily briefs, radar items, open tasks, Agent logs, and project upload status.
- Renders a GitHub-style activity heatmap from Markdown file modification times.
- Provides warm, sage, and night themes that can be switched inside the dashboard.
- Opens known files and folders from dashboard cards and buttons.
- Falls back gracefully when expected Vault files do not exist.
- Reads only local Vault files and does not upload or sync data.

## Repository Structure

```text
thirdspace-dashboard/
  main.js
  styles.css
  manifest.json
  README.md
  LICENSE
  .gitignore
```

## Install

Download or clone this repository, then copy the whole folder into your Obsidian Vault plugin directory:

```text
.obsidian/plugins/thirdspace-dashboard/
```

Then in Obsidian:

1. Open Settings.
2. Enable community plugins if needed.
3. Enable `Thirdspace Dashboard`.
4. Open the command palette and run `Open Thirdspace Workbench`.

## Expected Vault Paths

The plugin looks for these Markdown files and folders by relative path inside the current Obsidian Vault:

```text
00-Home/Thirdspace 总控台.md
00-Home/Thirdspace 工作台.canvas
00-Home/项目总览.md
00-Home/Hermes 总览.md
00-Home/系统状态.md
10-Daily/today-brief.md
60-Tasks/open-tasks.md
70-Radar/today-hotspots.md
20-Projects/code/status.md
40-Wiki/Projects/code.md
90-Agent/Hermes-Logs/
90-Agent/Project-Uploads/
95-System/vault-schema.md
```

Missing paths are safe. The dashboard will still open and show empty or default states for unavailable sections.

## Configuration

The plugin stores its own lightweight settings through Obsidian's plugin data API:

- `openOnStartup`: automatically open the workbench after Obsidian starts.
- `refreshIntervalSeconds`: periodically refresh dashboard data.
- `dashboardTheme`: switch between `warm`, `sage`, and `night`.

## Privacy And Safety

This plugin does not:

- Upload files.
- Connect to remote servers.
- Include remote sync logic.
- Bundle private notes, credentials, logs, or server addresses.

It only reads Markdown files from the current Obsidian Vault and renders them in a dashboard view.

## Upload This Plugin To GitHub

Create a new GitHub repository, then run:

```powershell
cd path/to/thirdspace-dashboard
git init
git add main.js styles.css manifest.json README.md LICENSE .gitignore
git commit -m "feat: add thirdspace dashboard plugin"
git branch -M main
git remote add origin https://github.com/<your-user>/thirdspace-dashboard.git
git push -u origin main
```

## License

MIT License. See [LICENSE](LICENSE).

---

# 中文

Thirdspace Dashboard 是一个 Obsidian 原生工作台插件，适合 Thirdspace 风格的个人知识库系统。

它会把本地工具、同步任务或后台 Agent 写入的 Markdown 文件整理成 Obsidian 内部的可视化总控台。界面重点展示今日简报、实时雷达、未完成任务、Agent 日志、项目上传包和 Vault 区域状态。

> 本仓库是可公开发布的脱敏版本，只包含插件代码，不包含个人笔记、同步配置、服务器地址、日志、凭证或私人 Vault 数据。

## 它能做什么

- 添加一个 Obsidian 原生 `ItemView` Dashboard。
- 展示今日简报、雷达条目、未完成任务、Agent 日志和项目上传状态。
- 根据 Markdown 文件修改时间生成 GitHub 风格活动热力图。
- 提供暖黄、青绿、夜间三套主题，并支持在界面内切换。
- 从卡片和按钮打开已知文件或文件夹。
- 当期望的 Vault 文件不存在时，自动显示空状态或默认状态。
- 只读取本地 Vault 文件，不上传或同步数据。

## 仓库结构

```text
thirdspace-dashboard/
  main.js
  styles.css
  manifest.json
  README.md
  LICENSE
  .gitignore
```

## 安装

下载或克隆本仓库，然后把整个文件夹复制到你的 Obsidian Vault 插件目录：

```text
.obsidian/plugins/thirdspace-dashboard/
```

然后在 Obsidian 中：

1. 打开设置。
2. 如有需要，启用第三方社区插件。
3. 启用 `Thirdspace Dashboard`。
4. 打开命令面板，执行 `Open Thirdspace Workbench`。

## 期望的 Vault 路径

插件会在当前 Obsidian Vault 中按相对路径读取这些 Markdown 文件和文件夹：

```text
00-Home/Thirdspace 总控台.md
00-Home/Thirdspace 工作台.canvas
00-Home/项目总览.md
00-Home/Hermes 总览.md
00-Home/系统状态.md
10-Daily/today-brief.md
60-Tasks/open-tasks.md
70-Radar/today-hotspots.md
20-Projects/code/status.md
40-Wiki/Projects/code.md
90-Agent/Hermes-Logs/
90-Agent/Project-Uploads/
95-System/vault-schema.md
```

这些路径不存在也没有问题。Dashboard 仍然可以打开，只是对应区域会显示为空状态或默认状态。

## 配置

插件会通过 Obsidian 的插件数据 API 保存少量本地设置：

- `openOnStartup`：Obsidian 启动后自动打开工作台。
- `refreshIntervalSeconds`：定时刷新 Dashboard 数据。
- `dashboardTheme`：在 `warm`、`sage`、`night` 之间切换。

## 隐私与安全

这个插件不会：

- 上传文件。
- 连接远程服务器。
- 包含远程同步逻辑。
- 打包私人笔记、凭证、日志或服务器地址。

它只读取当前 Obsidian Vault 中的 Markdown 文件，并在 Dashboard 视图中渲染。

## 上传这个插件到 GitHub

创建一个新的 GitHub 仓库，然后执行：

```powershell
cd path/to/thirdspace-dashboard
git init
git add main.js styles.css manifest.json README.md LICENSE .gitignore
git commit -m "feat: add thirdspace dashboard plugin"
git branch -M main
git remote add origin https://github.com/<your-user>/thirdspace-dashboard.git
git push -u origin main
```

## License

MIT License. See [LICENSE](LICENSE).
