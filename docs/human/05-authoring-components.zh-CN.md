# 组件编写

本指南说明如何在框架包（例如 `packages/ui`）中编写组件。内容包括主题变量、复合组件模式和组件 i18n。

宿主侧配置是另一件事。应用开发者的视角请参见[主题（宿主侧）](02-theming.zh-CN.md)和[i18n（宿主侧）](03-i18n.zh-CN.md)。

## 组件内的主题变量

组件从 CSS 自定义属性读取值。registry 包把声明的默认值映射为变量名。**这里没有全局主题 store**。默认值位于组件源码中，并在每次调用时传给辅助函数。

变量名示例：

```css
--noob-ui-card-tabs-background-color: #fff;
```

名称形式为 `--<前缀>-<组件>-<变量>`。

### 1. 声明主题变量结构

`NoobUiThemeComponents` 是 ui 包的空增强钩子。声明你的组件片段：

```ts
// packages/ui/src/components/card-tabs/theme.ts（示例）
declare module "@noob-naive-ui/ui" {
  interface NoobUiThemeComponents {
    CardTabs: CardTabsThemeVars;
  }
}
```

合并后的接口提供有类型的覆盖和有类型的组件 key。

### 2. 把默认值映射为 CSS 变量

`useUiTheme(componentId, defaults)` 把组件的默认值映射为 CSS 自定义属性记录：

```tsx
import { useUiTheme } from "@noob-naive-ui/ui";

// card-tabs/root.tsx
const getDefaults = () => ({
  backgroundColor: nThemeVars.value.bodyColor,
  activeCardColor: nThemeVars.value.cardColor,
});
const themeVars = useUiTheme("CardTabs", getDefaults);

return () => (
  <div style={themeVars.value}>
    {/* 以内联 CSS 变量的形式绑定 */}
  </div>
);
```

`defaults` 可以是普通对象或 getter。当默认值依赖响应式来源时请使用 getter。例如 naive-ui 的 `useThemeVars()` 返回一个 ref。getter 在 computed 内部运行，因此主题变化时依赖会重新求值。

辅助函数还会合并共享注册表中宿主提供的覆盖片段。同一变量的组件默认值会被宿主覆盖。

`useUiTheme` 是 registry 包 `useTheme` 的薄封装：

```ts
useTheme({
  libraryId: "noob-naive-ui:ui",
  cssPrefix: "noob-ui",
  componentId: "CardTabs",
  defaults,
});
```

### 3. 安全引用变量名

`useUiCssVarsFor(componentId)` 返回有类型的辅助函数：

```ts
const { $css, $var, $tw } = useUiCssVarsFor("CardTabs");

$css("--noob-ui-card-tabs-background-color"); // key 本身
$var("--noob-ui-card-tabs-background-color"); // var(...) 包装
$tw("bg-(--noob-ui-card-tabs-background-color)"); // tailwind 类形式
```

在 JSX 中使用它们。这三个辅助函数是防漂移保护：参数类型被限制为结构推导出的确切 CSS 变量名（`backgroundColor` → `--noob-ui-…-background-color`）。如果你重命名了结构属性，使用旧变量名的引用会无法通过类型检查，因此过期的 JSX 字符串会在编译时被标记，而不是悄悄失效。你需要更新被标记的用法；不会有任何自动更新。

### 4. Tailwind 类与 CSS 变量

Tailwind 会扫描源码文本以寻找类候选。它不会执行 JavaScript。这决定了组件应如何使用工具类。

受支持的模式的第一个部分是：静态工具类按名称读取 CSS 变量：

```tsx
class="bg-(--noob-ui-card-tabs-background-color)"
```

Tailwind 在构建时只生成一次这条规则：

```css
.bg-\\(--noob-ui-card-tabs-background-color\\) {
  background-color: var(--noob-ui-card-tabs-background-color);
}
```

第二个部分是：动态值通过内联 style 注入变量：

```tsx
<div
  style={themeVars.value}
  class={$tw<"bg">("bg-(--noob-ui-card-tabs-background-color)")}>
```

Tailwind 在扫描时能找到这个字面量类字符串。运行时值的变化只会更新 CSS 变量，因此不需要生成任何新的工具类规则。

在类名中插值表达式的写法是错误的：

```tsx
// 错误 —— Tailwind 在扫描时无法求值这些表达式
class={`bg-[${getBackground()}]`}
class={`bg-(${getMyCssVar()})`}
```

扫描器看不到完整的字面量候选，因此不会生成任何规则，元素也就没有背景。完整的字面量字符串（例如三元分支中的写法）仍然可以正常扫描；只有插值的片段会失效。

## 复合组件模式

框架组件采用类似 Vuetify 0 的命名空间 API。复合组件导出 `{ Root, Sub }`，而不是一个巨型组件：

```ts
// packages/ui/src/components/card-tabs/index.ts
export const CardTabs = { Root, Tab };
```

`Root` 负责布局和状态。`Tab` 向共享控制器注册。控制器通过 Vue 的 provide/inject 提供：

```ts
// runtime.ts
const controller = createTabController(options);
provide(CONTROLLER_PROVIDE_KEY, controller);
```

子组件读取同一个控制器，并在卸载时注销。CardTabs 控制器按 DOM 顺序维护标签，并提供键盘导航。

## 组件 i18n

翻译自身字符串的组件会创建局部 composer：

```tsx
import { createComponentI18n } from "@noob-naive-ui/i18n";
import exampleMessages from "../../locales/Example.json";

const { t } = createComponentI18n({
  messages: exampleMessages,
  libraryId: "noob-naive-ui:ui",
  componentId: "Example",
});

// t("title") 针对当前语言解析 Example.json
```

`getComponentI18n` 从子组件解析最近的组件 composer：

```tsx
const { t } = getComponentI18n();
```

缺失的 key 会通过根 composer 回退到宿主消息。

### 声明语言结构

框架从覆盖注册表推导语言类型。每个包声明一次完整结构：

```ts
// packages/ui/src/registry.ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:ui": {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: NoobUiThemeComponents;
    };
  }
}
```

单个组件再注册自己的消息片段：

```ts
// packages/ui/src/components/example/i18n.ts
declare module "@noob-naive-ui/ui" {
  interface NoobUiLocale {
    Example: NoobUiExampleLocale;
  }
}
```

重要：只做类型增强的副作用模块必须被编译图中的某个文件导入。否则 TypeScript 永远看不到该增强，组件 key 会解析为 `never`。

```ts
import "./i18n"; // 注册 NoobUiLocale 增强
```

## 新组件清单

1. 在 `packages/ui/src/components/` 下创建组件目录。
2. 在增强文件中声明主题变量结构。
3. 调用 `useUiTheme`，并传入默认值 getter。
4. 添加单独的 i18n 增强文件并导入它。
5. 从包的 barrel 导出复合命名空间。

## 下一步

- [主题（宿主侧）](02-theming.zh-CN.md) — 预设与 Provider
- [i18n（宿主侧）](03-i18n.zh-CN.md) — 宿主消息
- [架构](04-architecture.zh-CN.md) — 包的作用与数据流
