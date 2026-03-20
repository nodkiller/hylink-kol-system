# Hylink KOL System — Part 2: 实际页面审计与精确修改指令

> 本文档基于对线上系统 (hylink-kol-system.vercel.app) 的逐页浏览审计编写。
> 每一条建议都附带了「当前状态」→「问题诊断」→「修改指令」，可直接提供给 Claude Code 执行。

---

## 〇、当前系统架构速览

### 已有页面（共 5 个）

| 路由 | 页面名称 | 当前状态 |
|------|---------|---------|
| `/login` | 登录页 | 极简，已登录自动跳转 /kols |
| `/dashboard` | 仪表盘 | 有内容，但偏重财务数据 |
| `/kols` | KOL Database | 基础表格，仅 1 条数据 |
| `/campaigns` | Campaign 列表 | 极简卡片列表 |
| `/influencer-search` | 搜索 KOL | 仅一个搜索框，依赖 RapidAPI |
| `/roi` | ROI Dashboard | 框架已搭，缺少数据填充 |

### 已有侧边栏导航

```
[Chery Logo]
Management
├── Dashboard
├── KOL Database
├── Campaigns
├── Search Influencers
└── ROI Dashboard
[KOL Management Platform]
[Powered by Hylink Australia]
```

### 已有顶栏

```
[Admin] [Admin] [Sign out]
```

---

## 一、逐页问题诊断与修改指令

### 1. 侧边栏 (Sidebar) — 全局组件

#### 当前问题

1. **品牌单一**：侧边栏顶部固定显示 "Chery" logo，暗示系统被绑定在单一客户上。作为多客户管理平台，这不合理。
2. **导航结构扁平**：所有页面平铺在一级菜单，没有分组。随着功能增加会变得混乱。
3. **"Management" 标签多余**：导航上方的 "Management" 分组标签没有对应其他分组，是死标签。
4. **底部文案占空间**：「KOL Management Platform」和「Powered by Hylink Australia」占用了宝贵的侧边栏空间。
5. **没有折叠功能**：侧边栏无法收缩，在小屏幕上会很占空间。
6. **没有选中状态区分**：当前页面在侧边栏中没有明显的视觉高亮。
7. **没有图标**：纯文字导航，缺乏视觉辨识度。

#### 修改指令

```
【Claude Code 指令】

1. 侧边栏顶部：
   - 替换 Chery logo 为 Hylink 品牌 Logo
   - 如果需要展示当前 workspace/客户，改用顶栏下拉选择器（类似 Slack workspace switcher）
   - Logo 下方加一条分隔线

2. 导航分组重构：
   Group 1 - 核心功能:
     📊 Dashboard        /dashboard
     🔍 KOL Discovery    /influencer-search  （重命名自 "Search Influencers"）
     👥 KOL Database     /kols
     📋 Campaigns        /campaigns
   
   Group 2 - 分析与报告:
     📈 Analytics        /roi  （重命名自 "ROI Dashboard"，后续扩展）
     📝 Reports          /reports  （新页面，Phase 2 开发）
   
   Group 3 - 设置:
     ⚙️ Settings         /settings  （新页面）

3. 每个导航项添加 Lucide 图标（LayoutDashboard, Search, Users, Megaphone, BarChart3, FileText, Settings）

4. 选中状态样式：
   - 选中项：左侧 3px 主色边框 + 背景高亮（主色 10% 透明度）+ 文字颜色变为主色
   - 非选中项：灰色文字 + hover 时浅灰背景

5. 折叠功能：
   - 添加折叠按钮（在侧边栏底部或顶部，ChevronLeft/ChevronRight 图标）
   - 折叠后仅显示图标，鼠标 hover 时 tooltip 显示页面名称
   - 使用 localStorage 记住折叠状态

6. 底部用户区域：
   - 移除 "KOL Management Platform" 和 "Powered by Hylink Australia"
   - 改为用户头像 + 名称 + 角色 的小卡片
   - 点击展开菜单：Profile / Settings / Sign Out

7. 样式：
   - 背景色：#0F172A（Slate-900，深蓝黑）
   - 文字颜色：#94A3B8（Slate-400）
   - 选中文字：#FFFFFF
   - 宽度：展开 260px / 折叠 68px
   - 过渡动画：width 200ms ease
```

---

### 2. 顶栏 (Top Bar) — 全局组件

#### 当前问题

1. **信息重复**：显示两个 "Admin"，一个是用户名、一个可能是角色，视觉上混乱。
2. **Sign out 按钮太突兀**：作为高频区域的顶栏，登出按钮不应该直接裸露。
3. **没有面包屑导航**：用户不知道自己在哪个层级。
4. **没有全局搜索**：缺少快速搜索入口。
5. **没有通知中心**：无法看到待办事项或系统通知。

#### 修改指令

```
【Claude Code 指令】

重构顶栏布局为三段式：

[面包屑导航]                    [全局搜索框]              [通知铃铛] [用户头像▾]

1. 左侧 - 面包屑导航：
   - 格式：Dashboard / Campaigns / q2 chery
   - 使用 > 或 / 分隔符
   - 每级可点击跳转
   - 最后一级显示当前页面标题

2. 中间 - 全局搜索（可选，Phase 2）：
   - 搜索框 placeholder："Search KOLs, campaigns..."
   - 快捷键 Cmd+K / Ctrl+K 唤起
   - 搜索结果下拉覆盖（搜 KOL / Campaign / 设置）

3. 右侧 - 操作区：
   - 🔔 通知图标：带未读数量 badge（红色小圆点）
   - 用户头像 + 名称（只显示一次 "Admin"）
   - 点击头像展开下拉菜单：
     - My Profile
     - Settings
     - ——分隔线——
     - Sign Out

4. 样式：
   - 背景：#FFFFFF
   - 底部边框：1px solid #E5E7EB
   - 高度：64px
   - padding: 0 24px
   - 阴影：0 1px 3px rgba(0,0,0,0.05)
```

---

### 3. Login Page (`/login`)

#### 当前问题

1. **过于简单**：仅一个最基础的登录表单，没有品牌展示。
2. **没有密码显示/隐藏功能**
3. **没有"忘记密码"链接**
4. **没有表单验证反馈**
5. **视觉太素**：白底黑字，毫无品牌调性。
6. **已登录用户访问 /login 直接跳转 /kols**：这个逻辑是对的，但跳转目标应该是 /dashboard。

#### 修改指令

```
【Claude Code 指令】

1. 布局改为左右分栏（flex, md:flex-row, 移动端 flex-col）
   
   左侧 (55%，深色背景 #0F172A):
   ┌──────────────────────────────────┐
   │  Hylink Logo (白色)              │
   │                                  │
   │  大标题（白色 36px bold）：        │
   │  "Smarter KOL Management,        │
   │   Better Campaign Results"        │
   │                                  │
   │  副标题（Slate-400 16px）：       │
   │  "Discover, manage and track      │
   │   KOL partnerships across         │
   │   every platform."                │
   │                                  │
   │  3 个亮点 (带 icon，Slate-300)：  │
   │  ✦ AI-powered KOL discovery       │
   │  ✦ Real-time campaign tracking    │
   │  ✦ Automated ROI reporting        │
   │                                  │
   │  底部装饰：数据可视化风格的        │
   │  SVG 抽象图形或渐变色块            │
   └──────────────────────────────────┘
   
   右侧 (45%，白色背景):
   ┌──────────────────────────────────┐
   │        垂直居中容器               │
   │                                  │
   │  "Welcome back" (24px, bold)      │
   │  "Sign in to continue" (14px)     │
   │                                  │
   │  [📧 Email input]                │
   │  [🔒 Password input] [👁 toggle] │
   │                                  │
   │  □ Remember me    Forgot password?│
   │                                  │
   │  [    Sign In (主色 full-width)  ]│
   │                                  │
   └──────────────────────────────────┘

2. 表单验证：
   - 邮箱格式验证，错误时 input 边框变红 + 错误提示文案
   - 密码非空验证
   - 登录失败时顶部 toast 提示或 form 内 error banner

3. 交互：
   - 密码输入框右侧添加 Eye/EyeOff toggle
   - 按钮提交时显示 loading spinner
   - 登录成功后跳转到 /dashboard（而非 /kols）

4. 移动端（<768px）：
   - 隐藏左侧品牌区
   - 仅显示右侧登录表单，顶部加 Logo
```

---

### 4. Dashboard (`/dashboard`)

#### 当前问题

1. **过度偏重财务数据**：当前 Dashboard 大量展示 Revenue、Gross Profit、Net Profit、COGS 等纯财务指标，看起来像一个财务系统而非 KOL 管理平台。KOL 管理平台的 Dashboard 核心指标应该是运营指标（KOL 数量、Campaign 进度、内容表现、互动数据）。
2. **Financial Overview 区域数据失真**：$900K Revenue 与 $900K Gross Profit 和 $900K Net Profit 完全相同，显示100% margin，数据明显不合理或为测试数据。
3. **信息密度过高且无重点**：页面上排列了 Total KOLs、New This Month、Active Campaigns、Total Campaigns + Financial Overview + Campaign Status Distribution + KOL Pipeline + Monthly Revenue vs Cost + Campaign P&L + Recent Campaigns，模块太多且缺乏视觉层次。
4. **KOL Pipeline Overview 为空**：显示 "No KOL pipeline data yet"，空状态没有引导操作。
5. **图表含义不直觉**：Monthly Revenue vs Cost 图表的描述 "red area = Revenue, pink bars = KOL Cost, green line = Net Profit" 应该通过图例自解释，不应该依赖文字描述。
6. **Campaign P&L 表格有数据异常**：显示 $900K Revenue 但 KOL Cost 缺失，Gross Profit 也是 $900K。
7. **"Good morning, Admin" 缺乏个性**：没有用户真实姓名。
8. **缺少待办事项 / 行动项**：Dashboard 应该驱动用户行动，不仅仅展示数据。

#### 修改指令

```
【Claude Code 指令】

彻底重组 Dashboard 布局，分为三个区域：

=== 顶部区域 ===

1. 欢迎横幅：
   - "Good morning, [User Name]" + 今天日期（如 "Friday, March 21, 2026"）
   - 右侧两个快速操作按钮：
     [+ New Campaign]（Primary 按钮）
     [🔍 Find KOLs]（Secondary 按钮）

2. 四个指标卡片行（grid 4 列，移动端 2x2）：
   
   卡片 1: Total KOLs
   - 大数字 + 图标 (Users)
   - 底部："X new this month" 带绿色上箭头
   
   卡片 2: Active Campaigns  
   - 大数字 + 图标 (Megaphone)
   - 底部："X in planning" 灰色文字
   
   卡片 3: Total Engagements（新指标）
   - 大数字（如 12.5K）+ 图标 (Heart)
   - 底部："+X% vs last month" 带颜色箭头
   
   卡片 4: Budget Utilization（新指标）
   - 进度条 + 百分比 + 图标 (DollarSign)
   - 底部："$X of $Y spent"

=== 主内容区（左 65% + 右 35%）===

3. 左侧 - Campaign 进度追踪：
   标题："Active Campaigns"
   - Campaign 卡片列表（最多显示 5 个）
   - 每个卡片：
     [Campaign 名] [状态 badge] [进度条 %]
     Client: Chery · 5 KOLs · Due: Apr 15
     负责人头像组（最多 3 个 + "+2"）
   - 底部："View all campaigns →" 链接

4. 左侧 - 内容表现概览（图表）：
   标题："Content Performance"
   - 时间范围选择器（7d / 30d / 90d）
   - 折线图：Impressions + Engagements 双轴
   - 使用 Recharts，带 tooltip
   - 图例清晰，颜色区分明确

5. 右侧 - 待办事项：
   标题："Action Items"
   - 可勾选的待办列表：
     📋 3 contents pending review
     💬 2 KOLs awaiting response  
     📊 1 report due tomorrow
     📅 Campaign "q2 chery" ends in 5 days
   - 每项可点击跳转到对应页面
   - 空状态："All caught up! 🎉"

6. 右侧 - 近期活动：
   标题："Recent Activity"
   - 时间线格式：
     [用户头像] [用户名] [动作] [对象]
     例：Admin added KOL @mise_en_place_aus · 2h ago
     例：Admin created campaign "q2 chery" · 1d ago
   - 最多显示 8 条

=== 移除或降级的模块 ===

7. 将以下模块从 Dashboard 移除或移至专门的 Analytics 页面：
   - Financial Overview（移到 Analytics > Financial）
   - Campaign P&L 表格（移到 Analytics > Campaign ROI）
   - Monthly Revenue vs Cost Trend（移到 Analytics）
   
   理由：Dashboard 应聚焦运营概览和行动驱动，财务深度分析属于 Analytics 模块。

8. Campaign Status Distribution 饼图可保留，但改为：
   - 使用 Donut Chart（环形图）
   - 中间显示总 Campaign 数
   - 放在指标卡片行下方作为辅助可视化
   - 尺寸缩小，不占主要版面
```

---

### 5. KOL Database (`/kols`)

#### 当前问题

1. **表格设计粗糙**：列头包含 Creator / Categories / Platforms / Rating，但数据展示方式为纯文字，信息层次不清晰。
2. **仅有 1 条数据 "Anita @Birges"**：空状态体验差，看不出系统的完整能力。
3. **KOL 信息展示不完整**：
   - "Storage" 显示在 Categories 里，这是一个错误分类
   - 互动率显示 "0.00%"，可能是没有采集数据
   - Rating 显示 "0.0"，无评分标准说明
4. **筛选功能有限**：仅有 Platform 下拉（Instagram/TikTok/YouTube/Xiaohongshu/Weibo）和 Tier 下拉 + "More filters" 按钮，但不知道 more filters 点开是什么。
5. **搜索框 placeholder 不够引导**："Search by name, nickname, or @handle…" 可以但缺少搜索图标。
6. **没有卡片视图**：只有表格视图，没有切换选项。
7. **"View details" 和 "Edit" 按钮样式不突出**。
8. **分页显示 "Showing 1–1 of 1"**：数据少时应该隐藏分页。

#### 修改指令

```
【Claude Code 指令】

1. 页面头部重构：
   "KOL Database" 标题 + KOL 总数 badge + [+ Add KOL] 按钮
   下方：搜索框（带 Search 图标前缀）+ 筛选区

2. 搜索 & 筛选增强：
   - 搜索框加 🔍 图标前缀
   - 筛选项改为横向 chip/pill 布局：
     [All Platforms ▾] [All Tiers ▾] [Category ▾] [Location ▾] [Sort by ▾]
   - "More filters" 改为 Filters 图标按钮，点击弹出抽屉（Drawer）或面板
   - 高级筛选面板内容：
     - 互动率范围（slider）
     - 粉丝数范围（slider）
     - 费用范围
     - 标签筛选（多选）
     - 已合作 / 未合作 toggle
   - 已选筛选条件显示为 tag，可单独 × 移除
   - 结果数量实时显示："Showing 23 KOLs"

3. 视图切换：
   - 添加 Grid/List toggle 按钮（LayoutGrid / List 图标）
   - 表格视图（List）：当前样式优化
   - 卡片视图（Grid）：3-4 列网格
   
   卡片视图设计：
   ┌────────────────────────────┐
   │ [头像 64x64]               │
   │ Anita                      │
   │ @Birges · Instagram         │
   │ Sydney, Australia          │
   │ ─────────────────────────  │
   │ 👥 184K    💬 3.2%   ⭐ 8.5│
   │ (粉丝)    (互动率)  (评分) │
   │ ─────────────────────────  │
   │ [Beauty] [Lifestyle] [Food]│
   │ ─────────────────────────  │
   │ [♡ 收藏] [📋 加入列表 ▾]  │
   └────────────────────────────┘

4. 表格视图优化：
   - 列定义：
     □ | KOL (头像+名称+handle) | Platform (图标) | Followers | Eng. Rate | Category (tags) | Rating (stars) | Actions
   - 行高 60px
   - hover 行背景高亮 #F9FAFB
   - 批量选择 checkbox + 底部批量操作条
   - 点击行可展开查看更多信息，或直接跳转详情页

5. Add KOL 弹窗/页面改进：
   - 使用 Sheet / Modal 弹窗
   - 字段分组：
     基本信息：姓名、昵称、平台、Handle、Bio
     联系方式：邮箱、电话、微信
     分类：Category tags（多选）、Tier（自动根据粉丝数计算）
     费用：报价范围（min-max）
     地区：国家、城市
   - 支持手动输入或粘贴社交媒体链接自动解析

6. 空状态优化：
   当列表为空时：
   - 居中显示一个插图（unDraw 风格）
   - 标题："No KOLs yet"
   - 副标题："Start building your KOL database by adding influencers manually or discovering them."
   - 两个 CTA：[+ Add KOL]  [🔍 Discover KOLs]

7. 数据质量修复：
   - "Storage" 分类应改为合理的默认值或为空
   - 0.00% 互动率时显示 "—" 或 "N/A" + tooltip 解释
   - 0.0 评分时显示灰色星星 + "Not rated"
   - 分页在仅 1 条数据时隐藏
```

---

### 6. Campaigns (`/campaigns`)

#### 当前问题

1. **页面过于空洞**：只有一个 Campaign "q2 chery"，整页大面积留白。
2. **Campaign 卡片信息不足**：只显示了名称、状态 badge（Executing）、客户名（Chery）、KOL 数量（0 KOLs），缺少日期、预算、进度等关键信息。
3. **状态 Tab 筛选样式不明显**：All / Draft / Planning / Executing / Completed 按钮的选中状态视觉反馈弱。
4. **没有看板视图**：Campaign 管理最适合看板（Kanban）视图展示状态流转。
5. **Campaign 卡片不可点击跳转详情**：从 DOM 结构看，campaign 卡片没有 link，不清楚是否支持跳转详情页。
6. **没有搜索功能**：无法搜索 Campaign。
7. **"New Campaign" 按钮的创建流程未知**。

#### 修改指令

```
【Claude Code 指令】

1. 页面头部：
   "Campaigns" 标题 + 总数 badge + [+ New Campaign] 按钮
   下方：
   - 搜索框："Search campaigns..."
   - 视图切换：[看板] [列表] [日历]（Grid3X3 / List / Calendar 图标）
   - 状态筛选 Tabs（改为更明显的 pill tabs）：
     All (5) | Draft (1) | Planning (2) | Executing (1) | Completed (1)
     选中 tab 有底部边框或背景色

2. 看板视图（默认视图）：
   四列横向排列，按状态分组：
   
   | Draft        | Planning     | Executing    | Completed    |
   |:-------------|:-------------|:-------------|:-------------|
   | [Campaign A] | [Campaign B] | [q2 chery]   | [Campaign D] |
   | [Campaign E] |              |              |              |
   
   每张卡片设计：
   ┌──────────────────────────┐
   │ [客户 Logo]  Campaign名  │
   │ Client: Chery            │
   │ ─────────────────────── │
   │ 📅 Mar 1 - Apr 30, 2026  │
   │ 👥 5 KOLs                │
   │ 💰 $15,000 budget        │
   │ ─────────────────────── │
   │ ████████░░ 60% complete  │
   │ ─────────────────────── │
   │ [负责人头像] [负责人头像] │
   └──────────────────────────┘
   
   - 卡片可拖拽（使用 dnd-kit），拖拽到其他列改变状态
   - 点击卡片跳转到 Campaign 详情页

3. 列表视图：
   表格形式展示，列：
   Campaign | Client | Status | KOLs | Budget | Timeline | Progress | Owner

4. 日历视图（Phase 2）：
   在日历上显示 Campaign 时间段条形图

5. New Campaign 创建流程：
   使用 Sheet/Modal 或多步骤向导（Stepper）：
   
   Step 1 - 基本信息：
   - Campaign 名称（text input）
   - 客户选择（select / combobox，从已有客户列表选或新建）
   - 品牌名称
   - 描述（textarea）
   
   Step 2 - 时间 & 预算：
   - 开始日期 / 结束日期（date picker range）
   - 总预算（number input + 货币选择）
   - 状态（Draft / Planning / Executing）
   
   Step 3 - 目标 & 平台：
   - 目标平台（多选 checkbox：Instagram / TikTok / YouTube / 小红书 / 微博）
   - KPI 目标（reach / engagement / conversions）
   - 目标值（number inputs）
   
   Step 4 - 确认：
   - 汇总展示所有信息
   - [Create Campaign] 按钮

6. Campaign 详情页（新页面 /campaigns/:id）：
   
   头部：
   [← Back] Campaign 名称 [Executing badge] [⋯ 更多操作]
   Client: Chery · Mar 1 - Apr 30, 2026 · Budget: $15,000
   
   Tab 导航：
   Overview | KOLs | Content | Schedule | Analytics
   
   Overview Tab:
   - Brief 信息卡片
   - 进度里程碑时间线
   - 关键指标卡片（KOL 数量 / 已发布内容 / 总互动 / 预算使用）
   
   KOLs Tab:
   - 已分配 KOL 列表 + 每个 KOL 的状态
   - [+ Add KOL] 按钮（从 KOL 库中选择或搜索新的）
   - 每个 KOL 状态流转：Invited → Confirmed → Creating → Review → Published → Done
   - 可以看到每个 KOL 的费用、内容类型、排期
   
   Content Tab（Phase 2）:
   - 待审核内容列表
   - 图片/视频预览
   - 审批按钮（Approve / Request Changes / Reject）
   
   Schedule Tab:
   - 日历视图显示每个 KOL 的发布排期
   - 甘特图风格
   
   Analytics Tab:
   - 该 Campaign 的数据汇总图表
   - 每个 KOL 的数据对比
```

---

### 7. Search Influencers (`/influencer-search`)

#### 当前问题

1. **功能过于简陋**：只有一个搜索框，placeholder "Enter an @username to search…"，描述说 "Powered by RapidAPI"。
2. **搜索局限性大**：只支持按 username 搜索，不支持关键词、标签、地区等多维搜索。
3. **仅限 Instagram**：描述写 "Search Instagram creators by username or keyword"，其他平台不支持。
4. **搜索结果不可见**：页面默认显示 "Enter a keyword or @username above to discover creators"，空状态太简陋。
5. **与 KOL Database 割裂**：搜索发现的 KOL 如何加入到内部 KOL 库？流程不清晰。

#### 修改指令

```
【Claude Code 指令】

1. 页面标题改为 "KOL Discovery"（而非 "Influencer Discovery"），路由改为 /discovery

2. 搜索区域重构：
   大搜索框（居中，宽度 70%）：
   - Placeholder："Search by name, @handle, keyword, or paste profile URL..."
   - 搜索框内左侧：🔍 图标
   - 搜索框内右侧：平台选择下拉（All / Instagram / TikTok / YouTube / 小红书）

3. 搜索框下方添加快速筛选：
   横向 chip 排列：
   [Platform ▾] [Followers ▾] [Engagement ▾] [Location ▾] [Category ▾] [Cost ▾]
   
   每个 chip 点击展开下拉面板设置范围

4. 搜索结果区域：
   - 搜索前：展示推荐/热门 KOL（从内部数据库推荐）
   - 搜索中：Skeleton 加载占位
   - 搜索后：
     - 结果数量提示："Found 24 creators matching 'beauty australia'"
     - 排序选择器：Relevance / Followers / Engagement Rate
     - Grid (3列) 或 List 视图切换
     - KOL 卡片（复用 KOL Database 的卡片组件）

5. 卡片上的操作按钮：
   - [♡ Save to Library]：一键保存到内部 KOL 库
   - [📋 Add to Campaign ▾]：选择一个 Campaign 直接添加
   - [View Full Profile]：跳转外部社交媒体页面或内部详情

6. 多平台支持路线：
   Phase 1：Instagram（当前 RapidAPI）
   Phase 2：TikTok、YouTube
   Phase 3：小红书、微博（需要对应 API）

7. 空状态优化：
   搜索无结果时：
   - 插图 + "No results found for '[query]'"
   - 建议操作："Try different keywords or adjust filters"
   - "Or add this KOL manually →" 链接到 Add KOL
```

---

### 8. ROI Dashboard (`/roi`)

#### 当前问题

1. **页面标题太窄**："KOL ROI Dashboard" + "Compare KOL cost-per-lead against paid media channels" — 这个定位太局限，仅对比 CPL 一个指标。
2. **大量空白表格**：Channel Comparison、KOL Performance Breakdown、Benchmark Entries 三个表格全部为空，空状态文案不一致且缺乏引导。
3. **KOL Lead Funnel**（Total Leads → Test Drives → Conversions）是汽车行业特定的漏斗，不够通用。
4. **"Add Channel Benchmark" 按钮**：手动添加 benchmark 数据的流程不够直觉。
5. **数据维度单一**：仅关注 Cost per Lead / Test Drive Rate / Conversion Rate，缺少社媒常用指标（Impressions / Reach / Engagement / CPE / CPM / EMV）。
6. **没有时间维度**：无法选择时间范围查看趋势。
7. **页面结构松散**：各模块之间缺乏视觉联系。

#### 修改指令

```
【Claude Code 指令】

1. 重命名页面为 "Analytics"（路由保持 /roi 或改为 /analytics）

2. 添加 Sub-navigation Tabs：
   [Performance] [ROI & Cost] [Audience] [Benchmarks]

3. Performance Tab（默认）：
   
   顶部：时间范围选择器 [Last 7 days ▾] [Last 30 days] [Last 90 days] [Custom]
   
   指标卡片行（4 个）：
   - Total Impressions: 125.6K (+12.3%)
   - Total Engagements: 8.4K (+5.7%)
   - Average Engagement Rate: 3.2%
   - Total Content Published: 24
   
   图表区域（2 列）：
   左：Engagement Trend（折线图，按天/周）
   右：Platform Distribution（环形图，按平台占比）
   
   KOL 排行榜表格：
   Rank | KOL | Platform | Posts | Impressions | Engagements | Eng. Rate | CPE
   带排序功能

4. ROI & Cost Tab：
   
   指标卡片：
   - Total Spend: $15,000
   - Average CPE: $1.78
   - Average CPM: $12.50
   - Estimated EMV: $45,000 (3x ROI)
   
   Campaign ROI 对比柱状图（横向柱状图，每个 Campaign 一行）
   
   保留现有的 Channel Benchmark Comparison 但优化展示：
   - 预设常见渠道数据（Google Ads, Meta Ads, TikTok Ads 的行业平均 CPL/CPM）
   - KOL 数据自动从 Campaign 数据汇总
   - 柱状对比图可视化

5. Audience Tab（Phase 2）：
   - 触达受众画像（年龄、性别、地区分布）
   - 受众重叠分析

6. Benchmarks Tab：
   - 保留 "Add Channel Benchmark" 功能
   - 但改为引导式表单：
     Channel Name (select: Google Ads / Meta Ads / TikTok Ads / Custom)
     Period (date range)
     Total Spend
     Impressions / Clicks / Leads / Conversions
   - 自动计算 CPL / CPC / CPM
   - 与 KOL 数据并排对比

7. 通用化处理：
   - 移除 "Test Drive" 特定术语
   - 改为通用漏斗：Impressions → Clicks → Leads → Conversions
   - 允许用户自定义漏斗阶段名称（在 Settings 中配置）
```

---

## 二、新增页面建议

### 9. KOL Detail Page（新页面 `/kols/:id`）

```
【Claude Code 指令 — 新建页面】

路由：/kols/:id

布局：
┌──────────────────────────────────────────────────┐
│ [← Back to KOL Database]                          │
│                                                    │
│ [头像 80x80] Anita (@Birges)          [⋯ More]   │
│              Instagram · Sydney, AU    [Edit]      │
│              Mid-tier · 184K followers [+ Campaign]│
│              Beauty · Lifestyle · Food             │
├──────────────────────────────────────────────────┤
│ [Overview] [Analytics] [Content] [History] [Notes] │
├──────────────────────────────────────────────────┤
│                                                    │
│ === Overview Tab ===                               │
│                                                    │
│ 指标卡片行：                                        │
│ [Followers: 184K] [Eng Rate: 3.2%]                │
│ [Avg Likes: 2.1K] [Post Freq: 4/week]            │
│                                                    │
│ 左侧 60%：                                         │
│ 受众分析（图表）                                    │
│ - 性别分布（Donut）                                │
│ - 年龄分布（Bar）                                  │
│ - 地区 Top 5（Horizontal Bar）                     │
│                                                    │
│ 右侧 40%：                                         │
│ KOL 简要信息                                       │
│ - 联系方式（邮箱、电话）                            │
│ - 合作费用范围                                     │
│ - 内部标签                                         │
│ - 内部评分（5 星可编辑）                            │
│   ★★★★☆ 4.2 / 5                                  │
│   内容质量: ★★★★★                                  │
│   配合度: ★★★★☆                                    │
│   性价比: ★★★☆☆                                    │
│   回复速度: ★★★★★                                  │
│                                                    │
│ === Analytics Tab ===                              │
│ 粉丝增长趋势折线图（近 6 个月）                     │
│ 互动率趋势折线图                                   │
│ 近期内容表现表格                                   │
│                                                    │
│ === Content Tab ===                                │
│ 近期发布内容缩略图网格                              │
│ 每条内容：缩略图 + 点赞/评论/分享数                 │
│                                                    │
│ === History Tab ===                                │
│ 合作历史时间线                                     │
│ Campaign 名 | 日期 | 费用 | 表现指标 | 评价        │
│                                                    │
│ === Notes Tab ===                                  │
│ 内部备注（富文本编辑器）                            │
│ 合作注意事项                                       │
│ 历史沟通记录                                       │
└──────────────────────────────────────────────────┘
```

---

### 10. Reports Page（新页面 `/reports`）

```
【Claude Code 指令 — 新建页面】

路由：/reports

功能：自动生成 Campaign 报告

布局：
1. 页面标题："Reports" + [+ Generate Report] 按钮
2. 报告列表：
   - 每行：报告标题 | Campaign | 生成日期 | 格式 | 操作（查看/下载/删除）
3. 生成报告流程：
   Step 1：选择 Campaign
   Step 2：选择报告模板（Campaign Summary / Monthly Review / KOL Performance）
   Step 3：选择日期范围
   Step 4：选择包含模块（勾选：Overview / KOL Breakdown / Content / ROI / Recommendations）
   Step 5：预览 & 导出（PDF / PPTX）

Phase 1：先做页面框架 + 手动导出 CSV
Phase 2：自动生成 PDF/PPTX 报告
```

---

### 11. Settings Page（新页面 `/settings`）

```
【Claude Code 指令 — 新建页面】

路由：/settings

Tabs：
[General] [Team] [Clients] [Integrations] [Billing]

General Tab:
- 平台名称 / Logo 上传
- 默认货币
- 时区
- 语言切换（中文/英文）
- 自定义漏斗阶段名称

Team Tab:
- 团队成员列表（名称 / 邮箱 / 角色 / 状态）
- 邀请成员
- 角色管理（Admin / Manager / Specialist / Viewer）
- 权限配置

Clients Tab:
- 客户列表管理
- 每个客户：名称、Logo、联系人、关联 Campaigns

Integrations Tab（Phase 2）:
- API 连接状态（RapidAPI / 社交平台 API）
- 邮件集成
- Webhook 配置

Billing Tab（Phase 3，如果 SaaS 化）:
- 订阅计划
- 使用量
- 发票历史
```

---

## 三、设计系统快速实施指引

### 安装依赖

```bash
# UI 组件库
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input select badge table tabs avatar dropdown-menu sheet dialog tooltip

# 图标
npm install lucide-react

# 图表
npm install recharts

# 拖拽（Campaign 看板）
npm install @dnd-kit/core @dnd-kit/sortable

# 日期
npm install date-fns
npm install react-day-picker  # 或使用 shadcn 的 calendar

# 表单
npm install react-hook-form @hookform/resolvers zod

# 动画（可选）
npm install framer-motion
```

### Tailwind 配置补充

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#312E81',
        },
        sidebar: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
}
```

### 全局 CSS 变量

```css
/* globals.css */
:root {
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 68px;
  --topbar-height: 64px;
  --content-max-width: 1400px;
  --radius: 8px;
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}
```

---

## 四、实施优先级（给 Claude Code 的执行顺序）

### 🔴 Sprint 1（最高优先级 — 立即修复）

1. ✅ 侧边栏重构（导航分组、图标、选中状态、折叠）
2. ✅ 顶栏重构（面包屑、用户菜单）
3. ✅ Login Page 全新设计
4. ✅ Dashboard 重组（移除财务过重内容，增加运营指标和待办事项）
5. ✅ KOL Database 视图优化（卡片视图、筛选增强、空状态）

### 🟡 Sprint 2（核心功能补全）

6. ✅ Campaign 详情页（/campaigns/:id）
7. ✅ Campaign 看板视图
8. ✅ KOL 详情页（/kols/:id）
9. ✅ Analytics 页面重构（从 ROI Dashboard 升级）
10. ✅ New Campaign 创建向导

### 🟢 Sprint 3（体验提升）

11. ✅ KOL Discovery 页面增强
12. ✅ Reports 页面
13. ✅ Settings 页面
14. ✅ 通知系统
15. ✅ 全局搜索

---

*本文档基于对 hylink-kol-system.vercel.app 线上系统的逐页面 accessibility tree 分析编写。每个修改指令都精确到组件级别，可直接交给 Claude Code 执行。*
