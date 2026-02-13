# 隐私保护

在录制用户会话时,隐私保护是一个至关重要的问题。rrweb 提供了全面的隐私控制功能,帮助您在捕获有意义的会话数据的同时保护敏感的用户信息。本指南涵盖了所有与隐私相关的配置选项以及实施隐私保护会话录制的最佳实践。

## 目录

- [快速开始](#快速开始)
- [隐私选项参考](#隐私选项参考)
- [理解差异](#理解差异)
- [常见模式](#常见模式)
- [最佳实践](#最佳实践)
- [性能考虑](#性能考虑)

## 快速开始

以下是最常见的隐私配置,帮助您快速入门:

### 基础隐私设置

```typescript
import { record } from 'rrweb';

record({
  emit(event) {
    // 将事件发送到您的后端
  },
  // 默认遮蔽所有输入字段
  maskAllInputs: true,
  // 阻止包含敏感内容的元素
  blockClass: 'rr-block',
  // 遮蔽文本内容
  maskTextClass: 'rr-mask',
});
```

### 推荐的隐私配置

```typescript
record({
  emit(event) {
    // 将事件发送到您的后端
  },
  // 遮蔽
  maskAllInputs: true,
  maskInputOptions: {
    password: true, // 始终遮蔽密码(默认行为)
  },
  maskTextClass: 'rr-mask',
  maskTextSelector: '[data-sensitive]',

  // 阻止
  blockClass: 'rr-block',
  blockSelector: '[data-private]',

  // 忽略
  ignoreClass: 'rr-ignore',

  // 精简 DOM 以减少负载
  slimDOMOptions: {
    script: true,
    comment: true,
    headFavicon: true,
    headWhitespace: true,
    headMetaDescKeywords: true,
    headMetaSocial: true,
  },
});
```

## 隐私选项参考

### blockClass

**类型:** `string | RegExp`  
**默认值:** `'rr-block'`

具有此类名的元素将不会被录制。相反,它们将以相同尺寸的占位符形式重放,保持布局而不暴露内容。

**示例:**

```typescript
// 使用默认类名
record({
  emit(event) {
    /* ... */
  },
  blockClass: 'rr-block', // 默认值
});
```

```html
<!-- 在您的 HTML 中 -->
<div class="rr-block">此内容将被阻止并显示为占位符</div>
```

**使用正则表达式:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  blockClass: /^(private|secret|confidential)$/,
});
```

```html
<div class="private">已阻止</div>
<div class="secret">已阻止</div>
<div class="confidential">已阻止</div>
```

**使用场景:**

- 隐藏包含敏感信息的整个部分(例如,财务数据、个人详细信息)
- 阻止第三方小部件或广告
- 隐藏可能包含 PII 的用户生成内容

**类型定义:** 参见 `@rrweb/types` 中的 [`blockClass`](../../packages/types/src/index.ts)

---

### blockSelector

**类型:** `string`  
**默认值:** `undefined`

用于识别应被阻止的元素的 CSS 选择器。这比基于类的阻止提供了更大的灵活性。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  blockSelector: '[data-private], .sensitive-info, #user-details',
});
```

```html
<div data-private>这将被阻止</div>
<section class="sensitive-info">这将被阻止</section>
<div id="user-details">这将被阻止</div>
```

**使用场景:**

- 基于数据属性阻止元素
- 使用单个选择器阻止多种元素类型
- 比基于类的阻止更精确的控制

---

### ignoreClass

**类型:** `string`  
**默认值:** `'rr-ignore'`

具有此类名的元素将不会录制 `input`、`textarea`、`select` 的输入值变化。元素本身仍会被录制。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  ignoreClass: 'rr-ignore',
});
```

```html
<input type="text" class="rr-ignore" placeholder="输入事件被忽略" />
```

**使用场景:**

- 忽略可能包含敏感查询的搜索字段的输入事件
- 防止录制临时或草稿内容
- 忽略特定表单字段的输入值变化

**类型定义:** 参见 `packages/rrweb/src/types.ts` 中的 [`recordOptions`](../../packages/rrweb/src/types.ts)

---

### ignoreSelector

**类型:** `string`  
**默认值:** `undefined`

用于识别应忽略其输入事件的元素的 CSS 选择器。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  ignoreSelector: '[data-no-record], .no-track',
});
```

```html
<input type="text" data-no-record placeholder="未录制" />
<textarea class="no-track">交互被忽略</textarea>
```

**使用场景:**

- 基于数据属性忽略输入事件
- 比基于类的忽略更灵活
- 为复杂场景组合多个选择器

---

### ignoreCSSAttributes

**类型:** `Set<string>`  
**默认值:** `undefined`

要忽略的 CSS 属性名集合,用于过滤样式声明变更（`setProperty` / `removeProperty`）。这可以减少负载大小并提高性能。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  ignoreCSSAttributes: new Set([
    'background-color',
    'color',
    'border-color',
  ]),
});
```

**使用场景:**

- 忽略高频 CSS 属性更新
- 通过排除非关键样式变更来减少负载
- 过滤对调试意义不大的样式变化

**类型定义:** 参见 `packages/rrweb/src/types.ts` 中的 [`recordOptions`](../../packages/rrweb/src/types.ts)

---

### maskTextClass

**类型:** `string | RegExp`  
**默认值:** `'rr-mask'`

具有此类名的元素及其子元素的所有文本内容将用星号(`*`)遮蔽。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextClass: 'rr-mask',
});
```

```html
<div class="rr-mask">
  此文本将被遮蔽
  <span>子文本也会被遮蔽</span>
</div>
```

**使用正则表达式:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextClass: /^mask-/,
});
```

```html
<div class="mask-pii">已遮蔽</div>
<div class="mask-sensitive">已遮蔽</div>
```

**使用场景:**

- 遮蔽用户名、电子邮件地址或其他 PII
- 在保持布局的同时隐藏敏感文本内容
- 保护机密商业信息

**类型定义:** 参见 `@rrweb/types` 中的 [`maskTextClass`](../../packages/types/src/index.ts)

---

### maskTextSelector

**类型:** `string`  
**默认值:** `undefined`

用于识别应遮蔽其文本内容的元素的 CSS 选择器。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextSelector: '[data-mask], .user-name, .email',
});
```

```html
<span data-mask>john.doe@example.com</span>
<div class="user-name">John Doe</div>
<p class="email">contact@example.com</p>
```

**使用场景:**

- 基于语义数据属性遮蔽文本
- 比基于类的遮蔽更精确的控制
- 组合多个选择器以实现全面遮蔽

---

### maskAllInputs

**类型:** `boolean`  
**默认值:** `false`

当设置为 `true` 时,默认情况下所有输入值都将被遮蔽。这是保护用户输入的最安全选项。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskAllInputs: true,
});
```

**使用场景:**

- 为所有用户输入提供最大隐私保护
- 遵守严格的数据保护法规
- 当您只需要跟踪交互而不需要实际输入值时

**注意:** 默认行为会遮蔽密码输入（`{ password: true }`），除非您显式覆盖 `maskInputOptions`。

**类型定义:** 参见 `packages/rrweb/src/types.ts` 中的 [`recordOptions`](../../packages/rrweb/src/types.ts)

---

### maskInputOptions

**类型:** `MaskInputOptions`  
**默认值:** `{ password: true }`

对应遮蔽哪些输入类型的细粒度控制。这允许您选择性地遮蔽特定输入类型,同时录制其他类型。

**类型定义:**

```typescript
type MaskInputOptions = Partial<{
  color: boolean;
  date: boolean;
  'datetime-local': boolean;
  email: boolean;
  month: boolean;
  number: boolean;
  range: boolean;
  search: boolean;
  tel: boolean;
  text: boolean;
  time: boolean;
  url: boolean;
  week: boolean;
  textarea: boolean;
  select: boolean;
  password: boolean;
}>;
```

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskInputOptions: {
    // 始终遮蔽这些
    password: true,
    email: true,
    tel: true,

    // 录制这些
    text: false,
    textarea: false,
    select: false,

    // 遮蔽数字输入
    number: true,
    range: true,
  },
});
```

**使用场景:**

- 遮蔽 PII 字段(电子邮件、电话)同时录制其他输入
- 遵守特定的隐私要求
- 平衡隐私和调试需求

**类型定义:** 参见 `packages/rrweb-snapshot/src/types.ts` 中的 [`MaskInputOptions`](../../packages/rrweb-snapshot/src/types.ts)

---

### maskInputFn

**类型:** `(text: string, element: HTMLElement) => string`  
**默认值:** `undefined`

用于遮蔽输入值的自定义函数。这提供了对输入值遮蔽方式的完全控制。

`maskInputFn` 仅会在 `maskInputOptions` 启用的输入类型上执行（或 `maskAllInputs: true` 时）。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskInputOptions: {
    email: true,
    tel: true,
    text: true,
    password: true,
  },
  maskInputFn: (text, element) => {
    // 遮蔽电子邮件地址
    if (element.type === 'email') {
      return text.replace(/./g, '*');
    }

    // 遮蔽信用卡号但显示最后 4 位数字
    if (element.getAttribute('data-type') === 'credit-card') {
      return text.slice(0, -4).replace(/./g, '*') + text.slice(-4);
    }

    // 遮蔽电话号码但显示区号
    if (element.type === 'tel') {
      return text.slice(0, 3) + text.slice(3).replace(/./g, '*');
    }

    // 默认遮蔽
    return text.replace(/./g, '*');
  },
});
```

**高级示例 - 部分遮蔽:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskAllInputs: true,
  maskInputFn: (text, element) => {
    const maskLevel = element.getAttribute('data-mask-level');

    switch (maskLevel) {
      case 'full':
        return '*'.repeat(text.length);
      case 'partial':
        // 显示第一个和最后一个字符
        if (text.length <= 2) return '*'.repeat(text.length);
        return text[0] + '*'.repeat(text.length - 2) + text[text.length - 1];
      case 'none':
        return text;
      default:
        return text.replace(/./g, '*');
    }
  },
});
```

**使用场景:**

- 针对特定输入类型的自定义遮蔽逻辑
- 部分遮蔽(例如,显示信用卡的最后 4 位数字)
- 基于元素属性的上下文感知遮蔽
- 实施特定业务的隐私规则

**类型定义:** 参见 `packages/rrweb-snapshot/src/types.ts` 中的 [`MaskInputFn`](../../packages/rrweb-snapshot/src/types.ts)

---

### maskTextFn

**类型:** `(text: string, element: HTMLElement | null) => string`  
**默认值:** `undefined`

用于遮蔽文本内容的自定义函数。类似于 `maskInputFn`,但用于文本节点。

`maskTextFn` 仅会在 `maskTextClass` / `maskTextSelector` 命中时执行。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextSelector: '.email, .phone, .username',
  maskTextFn: (text, element) => {
    if (!element) return text;

    // 遮蔽文本中的电子邮件地址
    if (element.classList.contains('email')) {
      return text.replace(/[a-zA-Z0-9]/g, '*');
    }

    // 遮蔽电话号码
    if (element.classList.contains('phone')) {
      return text.replace(/\d/g, '*');
    }

    // 遮蔽用户名但保留长度
    if (element.classList.contains('username')) {
      return '*'.repeat(text.length);
    }

    return text;
  },
});
```

**高级示例 - 基于模式的遮蔽:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskTextSelector: '*',
  maskTextFn: (text, element) => {
    // 遮蔽电子邮件模式
    text = text.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '***@***.***',
    );

    // 遮蔽电话模式
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****');

    // 遮蔽信用卡模式
    text = text.replace(
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      '**** **** **** ****',
    );

    // 遮蔽 SSN 模式
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');

    return text;
  },
});
```

**使用场景:**

- 遮蔽文本内容中的 PII(电子邮件、电话号码、地址)
- 基于模式的遮蔽(信用卡、SSN)
- 上下文感知的文本遮蔽
- 在隐藏内容的同时保留文本结构

**类型定义:** 参见 `packages/rrweb-snapshot/src/types.ts` 中的 [`MaskTextFn`](../../packages/rrweb-snapshot/src/types.ts)

---

### slimDOMOptions

**类型:** `SlimDOMOptions | 'all' | true`  
**默认值:** `undefined`

通过排除非必要元素来减少录制的 DOM 大小的选项。这可以提高性能并减少存储需求。

**类型定义:**

```typescript
type SlimDOMOptions = Partial<{
  script: boolean; // 移除 script 标签
  comment: boolean; // 移除注释节点
  headFavicon: boolean; // 移除 favicon 链接
  headWhitespace: boolean; // 移除 head 中的空白
  headMetaDescKeywords: boolean; // 移除 meta description/keywords
  headMetaSocial: boolean; // 移除社交 meta 标签(og:, twitter:)
  headMetaRobots: boolean; // 移除 robots meta 标签
  headMetaHttpEquiv: boolean; // 移除 http-equiv meta 标签
  headMetaAuthorship: boolean; // 移除作者 meta 标签
  headMetaVerification: boolean; // 移除验证 meta 标签
  headTitleMutations: boolean; // 阻止 title 标签变化
}>;
```

**示例:**

```typescript
// 使用所有精简选项
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: 'all', // 更激进的预设
});

// `true` 的精简程度低于 'all'
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: true,
});

// 自定义精简选项
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: {
    script: true,
    comment: true,
    headFavicon: true,
    headWhitespace: true,
    headMetaDescKeywords: true,
    headMetaSocial: true,
    headMetaRobots: true,
    headMetaHttpEquiv: true,
    headMetaAuthorship: true,
    headMetaVerification: true,
  },
});
```

**推荐配置:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  slimDOMOptions: {
    script: true, // 重放不需要脚本
    comment: true, // 注释不可见
    headFavicon: true, // Favicon 不影响重放
    headWhitespace: true, // head 中的空白是不必要的
    headMetaDescKeywords: true, // 不需要 SEO meta 标签
    headMetaSocial: true, // 不需要社交 meta 标签
    headTitleMutations: true, // 防止过多的标题更改
  },
});
```

**使用场景:**

- 减少负载大小以提高性能
- 移除不影响重放的非视觉元素
- 排除可能包含敏感信息的元数据
- 优化存储和带宽使用

**类型定义:** 参见 `packages/rrweb-snapshot/src/types.ts` 中的 [`SlimDOMOptions`](../../packages/rrweb-snapshot/src/types.ts)

---

### keepIframeSrcFn

**类型:** `(src: string) => boolean`  
**默认值:** `() => false`

用于确定是否保留 iframe 的 `src` 属性的函数。默认情况下,出于隐私考虑会移除 iframe 的 `src` 属性。此函数允许您选择性地保留某些 iframe 源。

**示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  keepIframeSrcFn: (src) => {
    // 保留来自受信任域的 iframe
    const trustedDomains = [
      'https://www.youtube.com',
      'https://player.vimeo.com',
      'https://trusted-widget.example.com',
    ];

    return trustedDomains.some((domain) => src.startsWith(domain));
  },
});
```

**高级示例:**

```typescript
record({
  emit(event) {
    /* ... */
  },
  keepIframeSrcFn: (src) => {
    // 保留同源 iframe
    if (src.startsWith(window.location.origin)) {
      return true;
    }

    // 保留相对 URL
    if (!src.startsWith('http')) {
      return true;
    }

    // 保留特定的第三方服务
    const allowedPatterns = [
      /^https:\/\/www\.youtube\.com\/embed\//,
      /^https:\/\/player\.vimeo\.com\/video\//,
      /^https:\/\/[^/]*\.example\.com\//,
    ];

    return allowedPatterns.some((pattern) => pattern.test(src));
  },
});
```

**使用场景:**

- 保留受信任的第三方 iframe 源
- 保留同源 iframe
- 允许特定的嵌入服务(YouTube、Vimeo 等)
- 实施基于域的 iframe 策略

**类型定义:** 参见 `packages/rrweb-snapshot/src/types.ts` 中的 [`KeepIframeSrcFn`](../../packages/rrweb-snapshot/src/types.ts)

---

## 理解差异

理解何时使用阻止、忽略或遮蔽对于实施有效的隐私控制至关重要。

### 阻止 vs. 忽略 vs. 遮蔽

| 特性           | 阻止              | 忽略         | 遮蔽              |
| -------------- | ----------------- | ------------ | ----------------- |
| **元素被录制** | ❌ 否(显示占位符) | ✅ 是        | ✅ 是             |
| **内容可见**   | ❌ 否             | ✅ 是        | ⚠️ 已遮蔽(星号)   |
| **交互被录制** | ❌ 否             | ❌ 否        | ✅ 是             |
| **布局保留**   | ✅ 是(尺寸)       | ✅ 是        | ✅ 是             |
| **使用场景**   | 隐藏整个部分      | 忽略输入事件 | 隐藏内容,保持结构 |

### 何时使用每种方法

#### 使用**阻止**当:

- 您想完全隐藏页面的某个部分
- 内容高度敏感(财务数据、医疗记录)
- 您不需要看到布局或结构
- 您想隐藏第三方小部件或广告

```typescript
// 示例: 阻止敏感部分
blockClass: 'rr-block',
blockSelector: '[data-sensitive], .financial-info, .medical-records',
```

#### 使用**忽略**当:

- 您想看到元素但不录制用户交互
- 您需要保留视觉外观
- 您只想防止录制输入事件
- 您正在跟踪 UI 行为但不跟踪输入值

```typescript
// 示例: 忽略搜索字段的输入事件
ignoreClass: 'rr-ignore',
ignoreSelector: '[data-no-track], .search-input, .draft-content',
```

#### 使用**遮蔽**当:

- 您想隐藏内容但保留结构
- 您需要看到内容存在而不透露它
- 您想保持布局和元素尺寸
- 您正在调试 UI 问题但需要保护 PII

```typescript
// 示例: 在保留布局的同时遮蔽 PII
maskTextClass: 'rr-mask',
maskTextSelector: '.user-name, .email, .phone',
maskAllInputs: true,
maskInputOptions: {
  email: true,
  tel: true,
  password: true,
},
```

### 视觉对比

```html
<!-- 原始内容 -->
<div class="user-profile">
  <h2>John Doe</h2>
  <p class="email">john.doe@example.com</p>
  <input type="text" value="123 Main St" />
</div>

<!-- 使用阻止(blockClass="user-profile") -->
<!-- 重放为具有相同尺寸的灰色占位符框 -->

<!-- 使用忽略(input 上的 ignoreClass) -->
<div class="user-profile">
  <h2>John Doe</h2>
  <p class="email">john.doe@example.com</p>
  <input type="text" value="123 Main St" />
  <!-- 输入事件未录制 -->
</div>

<!-- 使用遮蔽(maskTextClass="user-profile", maskAllInputs=true) -->
<div class="user-profile">
  <h2>********</h2>
  <p class="email">*********************</p>
  <input type="text" value="***********" />
</div>
```

---

## 常见模式

### 模式 1: 遮蔽所有 PII

在保持调试可用性的同时提供全面的 PII 保护:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // 默认遮蔽所有输入
  maskAllInputs: true,

  // 明确遮蔽 PII 输入类型
  maskInputOptions: {
    email: true,
    tel: true,
    password: true,
    text: true, // 可能包含姓名、地址等
  },

  // 遮蔽包含 PII 的文本内容
  maskTextClass: 'rr-mask',
  maskTextSelector: '.user-name, .email, .phone, .address, [data-pii]',

  // 针对特定模式的自定义遮蔽
  maskTextFn: (text, element) => {
    // 遮蔽电子邮件模式
    text = text.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '***@***.***',
    );
    // 遮蔽电话模式
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****');
    return text;
  },
});
```

### 模式 2: 阻止敏感部分

隐藏包含敏感信息的整个部分:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // 阻止敏感部分
  blockClass: /^(private|secret|confidential|sensitive)$/,
  blockSelector: [
    '[data-private]',
    '.financial-info',
    '.medical-records',
    '.payment-details',
    '#user-settings',
    '.admin-panel',
  ].join(', '),

  // 同时遮蔽可能泄露的任何文本
  maskTextClass: 'rr-mask',
});
```

### 模式 3: 自定义遮蔽函数

实施特定业务的遮蔽逻辑:

```typescript
record({
  emit(event) {
    /* ... */
  },

  maskInputFn: (text, element) => {
    const fieldType = element.getAttribute('data-field-type');

    switch (fieldType) {
      case 'credit-card':
        // 仅显示最后 4 位数字
        return text.slice(0, -4).replace(/./g, '*') + text.slice(-4);

      case 'ssn':
        // 仅显示最后 4 位数字
        return '***-**-' + text.slice(-4);

      case 'account-number':
        // 显示前 2 位和后 2 位数字
        if (text.length <= 4) return '*'.repeat(text.length);
        return text.slice(0, 2) + '*'.repeat(text.length - 4) + text.slice(-2);

      case 'email':
        // 仅显示域名
        const [, domain] = text.split('@');
        return '***@' + (domain || '***');

      default:
        return text.replace(/./g, '*');
    }
  },

  maskTextFn: (text, element) => {
    if (!element) return text;

    const maskLevel = element.getAttribute('data-mask-level');

    if (maskLevel === 'full') {
      return '*'.repeat(text.length);
    }

    if (maskLevel === 'partial') {
      // 遮蔽中间部分
      if (text.length <= 4) return '*'.repeat(text.length);
      const visibleChars = Math.ceil(text.length * 0.2);
      return (
        text.slice(0, visibleChars) +
        '*'.repeat(text.length - visibleChars * 2) +
        text.slice(-visibleChars)
      );
    }

    return text;
  },
});
```

### 模式 4: 组合多个隐私选项

用于最大保护的全面隐私配置:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // 阻止
  blockClass: 'rr-block',
  blockSelector: '[data-private], .sensitive-section',

  // 忽略
  ignoreClass: 'rr-ignore',
  ignoreSelector: '[data-no-track]',
  ignoreCSSAttributes: new Set([
    'data-user-id',
    'data-session-id',
    'data-analytics',
  ]),

  // 遮蔽
  maskAllInputs: true,
  maskInputOptions: {
    email: true,
    tel: true,
    password: true,
  },
  maskTextClass: 'rr-mask',
  maskTextSelector: '[data-pii]',

  // 自定义函数
  maskInputFn: (text, element) => {
    // 自定义遮蔽逻辑
    return text.replace(/./g, '*');
  },

  // 精简 DOM
  slimDOMOptions: {
    script: true,
    comment: true,
    headFavicon: true,
    headMetaSocial: true,
  },

  // Iframe 控制
  keepIframeSrcFn: (src) => {
    return src.startsWith(window.location.origin);
  },
});
```

### 模式 5: 开发环境 vs. 生产环境

针对不同环境的不同配置:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

record({
  emit(event) {
    /* ... */
  },

  // 在开发环境中限制较少以便调试
  maskAllInputs: !isDevelopment,

  maskInputOptions: isDevelopment
    ? {
        password: true, // 在开发环境中仅遮蔽密码
      }
    : {
        // 在生产环境中遮蔽所有内容
        email: true,
        tel: true,
        password: true,
        text: true,
        textarea: true,
      },

  // 仅在生产环境中阻止敏感部分
  blockSelector: isDevelopment
    ? undefined
    : '[data-private], .sensitive-section',

  // 在生产环境中精简 DOM 以提高性能
  slimDOMOptions: isDevelopment ? undefined : 'all',
});
```

---

## 最佳实践

### 1. 从最大隐私保护开始

从最严格的设置开始,然后根据需要选择性地放宽:

```typescript
record({
  emit(event) {
    /* ... */
  },
  maskAllInputs: true,
  blockClass: 'rr-block',
  maskTextClass: 'rr-mask',
  slimDOMOptions: 'all',
});
```

### 2. 使用数据属性进行语义标记

使用数据属性对隐私控制的元素进行语义标记:

```html
<div data-private>已阻止的内容</div>
<span data-pii>已遮蔽的内容</span>
<input data-no-track type="text" />
```

```typescript
record({
  emit(event) {
    /* ... */
  },
  blockSelector: '[data-private]',
  maskTextSelector: '[data-pii]',
  ignoreSelector: '[data-no-track]',
});
```

### 3. 记录您的隐私决策

添加注释解释为什么某些元素被阻止、遮蔽或忽略:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // 根据合规要求阻止财务信息
  blockSelector: '.financial-info, .payment-details',

  // 为隐私合规要求遮蔽 PII
  maskTextSelector: '[data-pii]',

  // 忽略搜索输入以保护用户隐私
  ignoreSelector: '.search-input',
});
```

### 4. 测试您的隐私配置

始终测试您的隐私配置以确保其按预期工作:

```typescript
// 在开发环境中测试
const testPrivacy = () => {
  // 检查敏感元素是否被阻止
  const blockedElements = document.querySelectorAll('.rr-block');
  console.log('已阻止的元素:', blockedElements.length);

  // 检查 PII 是否被遮蔽
  const maskedElements = document.querySelectorAll('.rr-mask');
  console.log('已遮蔽的元素:', maskedElements.length);

  // 验证应遮蔽的目标元素是否已正确标记
  const maskTargets = document.querySelectorAll('[data-pii], .rr-mask');
  console.log('遮蔽目标元素数:', maskTargets.length);
};
```

### 5. 使用渐进增强

根据元素敏感性逐步应用隐私控制:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // 级别 1: 阻止高度敏感的内容
  blockSelector: '.top-secret, .confidential',

  // 级别 2: 遮蔽中度敏感的内容
  maskTextSelector: '.sensitive, [data-pii]',

  // 级别 3: 忽略与较不敏感内容的交互
  ignoreSelector: '.draft, .temporary',
});
```

### 6. 考虑用户同意

根据用户同意调整隐私设置:

```typescript
const userConsent = getUserConsentLevel(); // 'minimal', 'standard', 'full'

const privacyConfig = {
  minimal: {
    maskAllInputs: true,
    blockSelector: '[data-private]',
    maskTextSelector: '[data-pii]',
  },
  standard: {
    maskAllInputs: true,
    maskInputOptions: { password: true, email: true },
    maskTextSelector: '[data-pii]',
  },
  full: {
    maskAllInputs: false,
    maskInputOptions: { password: true },
  },
};

record({
  emit(event) {
    /* ... */
  },
  ...privacyConfig[userConsent],
});
```

### 7. 定期隐私审计

定期审查和更新您的隐私配置:

```typescript
// 创建隐私审计函数
const auditPrivacy = () => {
  const report = {
    blockedElements: document.querySelectorAll('[class*="rr-block"]').length,
    maskedElements: document.querySelectorAll('[class*="rr-mask"]').length,
    ignoredElements: document.querySelectorAll('[class*="rr-ignore"]').length,
    sensitiveInputs: document.querySelectorAll(
      'input[type="password"], input[type="email"]',
    ).length,
  };

  console.log('隐私审计报告:', report);
  return report;
};

// 在开发环境中运行审计
if (process.env.NODE_ENV === 'development') {
  auditPrivacy();
}
```

### 8. 平衡隐私和调试

在隐私和调试能力之间找到适当的平衡:

```typescript
record({
  emit(event) {
    /* ... */
  },

  // 遮蔽敏感输入
  maskInputOptions: {
    password: true,
    email: true,
    tel: true,
  },

  // 但允许非敏感输入以便调试
  maskInputFn: (text, element) => {
    // 允许调试友好的输入
    if (element.getAttribute('data-debug-friendly') === 'true') {
      return text;
    }

    // 遮蔽其他所有内容
    return text.replace(/./g, '*');
  },
});
```

### 9. 使用 TypeScript 实现类型安全

利用 TypeScript 确保正确的隐私配置:

```typescript
import type { recordOptions } from 'rrweb';

const privacyConfig: Partial<recordOptions<Event>> = {
  maskAllInputs: true,
  maskInputOptions: {
    email: true,
    tel: true,
    password: true,
  },
  blockClass: 'rr-block',
  maskTextClass: 'rr-mask',
};

record({
  emit(event) {
    /* ... */
  },
  ...privacyConfig,
});
```

### 10. 记录隐私政策

维护隐私实施的清晰文档:

```typescript
/**
 * 隐私配置
 *
 * 此配置实施我们的隐私政策:
 * - 所有密码输入都被遮蔽(合规要求)
 * - 电子邮件和电话输入被遮蔽(GDPR 要求)
 * - 财务信息被阻止(PCI-DSS 要求)
 * - 用户生成的内容被遮蔽(隐私政策)
 *
 * 最后审查: 2024-01-15
 * 下次审查: 2024-07-15
 */
const privacyConfig = {
  maskAllInputs: true,
  blockSelector: '.financial-info',
  maskTextSelector: '[data-pii]',
};
```

---

## 性能考虑

隐私选项可能会影响录制性能。以下是您需要了解的内容:

### 各功能的性能影响

| 功能                  | 性能影响  | 注意事项       |
| --------------------- | --------- | -------------- |
| `blockClass`          | ⚡ 低     | 简单的类检查   |
| `blockSelector`       | ⚡⚡ 中   | CSS 选择器匹配 |
| `maskAllInputs`       | ⚡ 低     | 简单的布尔检查 |
| `maskInputOptions`    | ⚡ 低     | 基于类型的查找 |
| `maskInputFn`         | ⚡⚡⚡ 高 | 自定义函数执行 |
| `maskTextFn`          | ⚡⚡⚡ 高 | 自定义函数执行 |
| `slimDOMOptions`      | ✅ 正面   | 减少负载大小   |
| `ignoreCSSAttributes` | ✅ 正面   | 减少负载大小   |

### 优化技巧

#### 1. 优先使用内置选项而非自定义函数

```typescript
// ❌ 较慢 - 每个输入都使用自定义函数
maskInputFn: (text) => text.replace(/./g, '*'),

// ✅ 较快 - 使用内置选项
maskAllInputs: true,
```

#### 2. 使用特定选择器

```typescript
// ❌ 较慢 - 复杂选择器
blockSelector: 'div[data-private] > span.sensitive, div[data-secret] > p.confidential',

// ✅ 较快 - 简单类
blockClass: 'rr-block',
```

#### 3. 优化自定义函数

```typescript
// ❌ 较慢 - 每次调用都使用复杂正则表达式
maskTextFn: (text) => {
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***');
  text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***');
  return text;
},

// ✅ 较快 - 对不匹配的元素提前返回
maskTextFn: (text, element) => {
  if (!element || !element.classList.contains('may-contain-pii')) {
    return text;
  }
  // 仅在需要时运行昂贵的正则表达式
  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***');
},
```

#### 4. 使用 slimDOMOptions 减少负载

```typescript
// 显著减少初始快照大小
slimDOMOptions: {
  script: true,        // 脚本可能很大
  comment: true,       // 注释没有价值
  headMetaSocial: true, // 社交 meta 标签可能很大
},
```

#### 5. 缓存昂贵的计算

```typescript
// 缓存正则表达式模式
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

maskTextFn: (text) => {
  return text
    .replace(emailRegex, '***@***.***')
    .replace(phoneRegex, '***-***-****');
},
```

#### 6. 监控性能

```typescript
const startTime = performance.now();

record({
  emit(event) {
    const endTime = performance.now();
    console.log(`事件处理时间: ${endTime - startTime}ms`);
  },
  maskAllInputs: true,
  // ... 其他选项
});
```

### 负载大小对比

负载影响高度依赖页面结构和录制配置。建议在您的实际应用中测量,不要依赖固定数值。

---

## 其他资源

- [类型定义](../../packages/rrweb/src/types.ts) - 完整的 TypeScript 类型定义
- [rrweb-snapshot 类型](../../packages/rrweb-snapshot/src/types.ts) - 快照相关的类型定义
- [@rrweb/types](../../packages/types/src/index.ts) - 核心类型定义
- [主指南](../guide.md) - rrweb 通用文档

---

## 总结

隐私是会话录制的关键方面。rrweb 通过以下方式提供全面的隐私控制:

1. **阻止** - 使用占位符隐藏整个部分
2. **忽略** - 防止录制输入事件
3. **遮蔽** - 在保留结构的同时隐藏内容
4. **自定义函数** - 实施特定业务的隐私逻辑
5. **精简 DOM** - 减少负载大小并移除元数据

**关键要点:**

- 从最大隐私保护开始,然后根据需要放宽
- 使用语义数据属性以明确意图
- 彻底测试您的隐私配置
- 平衡隐私与调试需求
- 监控自定义函数的性能影响
- 记录您的隐私决策
- 定期审计和更新您的配置

通过遵循本指南中的模式和最佳实践,您可以实施强大的隐私控制,在保护用户数据的同时保持所需的调试能力。
