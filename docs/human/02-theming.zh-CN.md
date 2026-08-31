# 主题

框架的主题分为两层。naive-ui 负责组件颜色。`@noob-naive-ui/registry` 包负责框架组件的 CSS 自定义属性。

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

外壳在偏好设置控件中展示预设列表。切换预设会同时更新 naive-ui 主题和 CSS 自定义属性。

## 框架组件的 CSS 自定义属性

框架组件从 CSS 自定义属性读取值。示例：

```css
--noob-ui-card-tabs-background-color: #fff;
```

组件通过三种方式绑定这些属性：

- **默认值** — 由每个组件提供（`useUiTheme` getter）。
- **Provider 覆盖** — 来自应用配置 provider 的部分值。
- **计算值** — 由默认值推导而来（例如 CardTabs 的 col-template 字符串）。

getter 形式很重要。`useTheme` 接受普通对象或 getter 函数。当默认值依赖响应式来源（例如 naive-ui 的 `useThemeVars()`）时，请使用 getter：

```ts
const getDefaults = () => ({
  backgroundColor: nThemeVars.value.bodyColor,
  activeCardColor: nThemeVars.value.cardColor,
});
const vars = useUiTheme("CardTabs", getDefaults);
```

getter 在 computed 内部运行，因此响应式来源变化时会重新求值。

## 配色方案与页面背景

naive-ui 的 `NGlobalStyle` 会根据合并后的主题写入页面背景。admin 的覆盖合并不能修改基础覆盖表。框架为此使用 `es-toolkit` 的 `toMerged`，因此从暗色预设切回亮色时，亮色页面背景会恢复。

## 字号分级

naive-ui 静态设置 `body { font-size: 14px }`。框架增加了按字号分级的数值，以便内容缩放：

```ts
padding: { small: "0.75rem", medium: "1rem", large: "1.25rem" }
```

叶子值可以是普通字符串，也可以是以字号为键的记录。当前字号会在运行时解析叶子值。

## Tailwind 与单一导入规则

库包不导入 `tailwindcss/utilities.css`。只有应用入口导入它。应用 CSS 如下：

```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities) source(none);
```

库 CSS 只声明 `@layer` 顺序和 `@source` 路径。Tailwind 会通过导入链拾取它们。这样可以避免浏览器中出现重复的工具类规则。

## 下一步

- [i18n](03-i18n.zh-CN.md) — 组件级语言模式
- [架构](04-architecture.zh-CN.md) — 包的作用与数据流
