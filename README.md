# Pacific

Ngwg 默认主题，提供文章列表、首页分页、文章和普通页面、年度归档、标签与分类页。模板混用 EJS 与 mustache，由官方 [Ngwg-files](https://github.com/Ngwgers/Ngwg-files) 渲染；日期、摘要、slug 和翻译 helper 来自 [Ngwg-feature](https://github.com/Ngwgers/Ngwg-feature)。

## 使用

在站点 `ngwg.yaml` 中声明：

```yaml
title: 我的站点
theme: pacific
themes:
  pacific: https://github.com/Ngwgers/Ngwg-default-theme.git
language: zh_CN
```

通过 Ngwg CLI 构建时，files、feature 会由 CLI 的回退声明补齐；直接使用 Core API 时，调用方应提供相应插件来源。Core 不内置主题或插件。

```fish
ngwg build
ngwg dev
```

本地开发主题可将来源改为检出目录，例如 `themes.pacific: ../Ngwg-default-theme`，直接使用该目录，不复制到主题店。

## 配置与内容

```yaml
theme:
  pacific:
    per_page: 5
    default_language: en_US
    segment_threshold: 10000
```

映射形式的 `theme` 替代 `theme: pacific`；不要在同一个 YAML 中重复定义 `theme`。普通对象深合并，数组和标量替换。主题的主要字段见 [theme.yaml](theme.yaml)：

| 字段 | 默认值 / 作用 |
| --- | --- |
| `per_page` | 10，首页每页可见文章数 |
| `default_language` | `zh_CN`，请求语言未指定时的默认翻译 |
| `layouts` | index、post、page、archive、tag、category 的模板映射 |
| `plugins.optional.seo` | 可选 SEO 插件来源，主题只提示缺失，不自动启用 |
| `segment_threshold` | 未声明时由 Ngwg-files 回退为 8000；插件同名选项优先 |

主题没有配置式导航、头像、banner 或颜色选择器。顶栏链接写在 [header.html](partial/header.html)，默认包含首页、归档和 `/about/`；使用 about 链接需自行创建 `source/about.md`。调整模板或样式可使用自己的主题检出目录或 fork。

文章放在 `source/_posts/`，例如 `2026-03-01-hello.md` 对应 `/posts/hello/`；嵌套文章保留子目录。普通页面 `source/about/index.md` 对应 `/about/`。`hidden: true` 文章仍部署自身页面，但不进入可见列表；`pinned: true` 文章排在列表前面。正文的 `<!-- more -->` 之前内容用作列表摘要。

## 阅读与前端行为

- 深色模式跟随系统 CSS 媒体查询，没有手动主题切换按钮。
- 侧栏显示标签和分类，可折叠；宽屏显示 TOC，窄屏切换为目录浮动按钮。TOC 从正文 `h2/h3/h4[id]` 构建。
- PJAX 拦截同源链接，更新标题、部分 SEO head 标签与 `.layout`，保留顶栏和页脚；换页后重建页面组件。标记 `data-no-pjax` 可退出拦截。
- Ngwg-files 的 tabs 支持交互和同名分组同步；Mermaid 代码块由主题加载浏览器运行时后绘制。
- 当前没有 `404` 布局，因此不会仅凭此主题自动生成 `public/404.html`。

### 长文分段

Ngwg-files 会按 HTML 顶层块边界分段；Pacific 打开文章后按链**顺序预取全部片段**，不等待滚动。要调整分段，可在站点配置：

```yaml
plugins:
  files:
    option:
      segment_threshold: 8000
      chunk_size: 4000
```

`chunk_size` 为负数可整体关闭；frontmatter `no_segment: true` 可关闭单篇。分段页初始 HTML 只有首段，**禁用 JavaScript 后无法阅读剩余片段**。需要无 JavaScript 完整阅读时应关闭分段。Pacific 没有完整的延迟锚点补跳机制，指向尚未到达片段的锚点不保证自动定位。

## 翻译与 Markdown

主题提供 [zh_CN](i18n/zh_CN.yaml) 与 [en_US](i18n/en_US.yaml)。部署语言由 `ngwg.yaml.language` → `$NGWG_LANG` 请求，再由 Ngwg-files 匹配主题翻译及 `default_language`。这决定 UI 文案，不会自动生成多语言文章。

Markdown 方言由 Ngwg-files 提供。TeX 默认关闭，可通过 `plugins.files.option.markdown.tex` 或文章 `tex` frontmatter 开启 KaTeX/MathJax。主题按站点使用情况引用 KaTeX CSS；Mermaid 无需主题选项，但需要 JavaScript。

## 可选 SEO

```yaml
url: https://example.com
plugins:
  seo: https://github.com/Ngwgers/Ngwg-ext-seo.git
```

加载后显示 SEO meta 和 RSS/Atom/sitemap 链接。`plugins.seo.option.generateRSS`、`generateAtom`、`generateSitemap` 控制产物；这些选项属于插件，不属于主题。

当前列表页的 `page` 不带 URL，SEO helper 会把分页、归档、标签、分类的 canonical/og:url 回退到首页，不能视为这些页面的完整 SEO 实现。

## 部署限制与开发

此主题的导航、资源、标签和分类链接大量使用 `/...` 根相对路径，建议部署在域名根目录。`baseurl: /blog/` 不会自动重写这些链接。

模板在 `layout/`，partial 在 `partial/`，浏览器资源为 [style.css](assets/style.css) 与 [pacific.js](assets/pacific.js)。修改主题插件依赖后应全量构建或重启 dev，主题热重载不会重新加载插件集。

更多契约见 [主题开发文档](https://github.com/Ngwgers/Ngwg-docs/blob/main/theme-development.md)。

## 许可证

[GNU General Public License v3.0](LICENSE)。
