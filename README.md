# Ngwg-default-theme — pacific

Ngwg 的默认主题。风格：安静、冷、简单，像太平洋——雾灰的底色、深海蓝的
点缀、衬线正文、大量留白、零必需 JavaScript。

实现首页（含分页）、文章页、归档页、标签页、分类页。布局在 `layout/`，
可复用片段在 `partial/`，样式在 `assets/style.css`。

使用：

```yaml
# ngwg.yaml
theme: pacific
```

`pacific` 这个名字会被 Core 解析到本主题（也可用 `$NGWG_THEMES` 放置自定义
主题副本）。主题开发细节见 [Ngwg-docs/theme-development.md](../Ngwg-docs/theme-development.md)。

## 许可证 / License

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 发布。
This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

---

## English

# Ngwg-default-theme — pacific

The default theme for Ngwg. Style: quiet, cold, minimal — like the Pacific Ocean: a misty-gray base, deep-sea-blue accents, serif body text, plenty of whitespace, zero required JavaScript.

It implements the home page (with pagination), post pages, and the archive, tag and category pages. Layouts live in `layout/`, reusable partials in `partial/`, styles in `assets/style.css`.

Usage:

```yaml
# ngwg.yaml
theme: pacific
```

The name `pacific` is resolved by Core to this theme (you can also use `$NGWG_THEMES` to place a custom copy of a theme). See [Ngwg-docs/theme-development.md](../Ngwg-docs/theme-development.md) for theme development details.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
