# 主题（宿主侧）

本指南从应用开发者的角度介绍主题：主题预设、Provider 配置和字号。如果你要编写读取主题值的组件，请参见[组件编写](05-authoring-components.zh-CN.md)。

## 主题预设

主题预设位于宿主应用中。参见 `apps/demo/src/themes.ts`。

一个预设包含 key、label、`isDark` 标志和 naive-ui 主题覆盖：

```ts
import type { GlobalThemeOverrides } from "naive-ui";
import type { AdminThemePreset } from "@noob-naive-ui/admin";

const preset: AdminThemePreset = {
  key: "midnight",
  label: { kind: "i18n", key: "themes.midnight" },
  themeOverrides: {
    "naive-ui": {
      common: {
        primaryColor: "#18a058",
        bodyColor: "#0f1220",
      },
    },
  },
  isDark: true,
};
```

demo 提供亮色预设（`default`）和暗色预设（`midnight`）。当存储的模式为 `"system"` 时，浏览器配色方案会选择其中之一。

外壳在偏好设置控件中展示预设列表。切换预设会更新 naive-ui 主题。

## 字号分级

naive-ui 静态设置 `body { font-size: 14px }`。框架增加了按字号分级的数值，以便内容缩放。数值可以携带按字号分级的配置：

```ts
padding: { small: "0.75rem", medium: "1rem", large: "1.25rem" }
```

叶子值可以是普通字符串，也可以是以字号为键的记录。当前字号会在运行时解析叶子值。

## 按库覆盖

宿主可以为整个库覆盖主题值。使用各包的配置 provider：

```tsx
import { AdminUiConfigProvider } from "@noob-naive-ui/ui";

<AdminUiConfigProvider
  themeOverride={{
    CardTabs: { backgroundColor: "#fafafa" },
  }}>
  {/* 应用树 */}
</AdminUiConfigProvider>
```

provider 会把你的片段合并到共享覆盖注册表中。子树内最近的 provider 生效。

## 配色方案与页面背景

naive-ui 的 `NGlobalStyle` 会根据合并后的主题写入页面背景。admin 的覆盖合并不能修改基础覆盖表。框架为此使用 `es-toolkit` 的 `toMerged`，因此从暗色预设切回亮色时，亮色页面背景会恢复。

## Tailwind 与单一导入规则

库包不导入 `tailwindcss/utilities.css`。只有应用入口导入它。应用 CSS 如下：

```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities) source(none);
```

库 CSS 只声明 `@layer` 顺序和 `@source` 路径。Tailwind 会通过导入链拾取它们。这样可以避免浏览器中出现重复的工具类规则。

## 下一步

- [i18n（宿主侧）](03-i18n.zh-CN.md) — 宿主语言消息
- [组件编写](05-authoring-components.zh-CN.md) — 组件内部的主题变量和 i18n
