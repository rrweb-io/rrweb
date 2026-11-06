<!-- markdownlint-disable MD043 -->

# Shadow DOM

rrweb 可以录制 open Shadow DOM，以及录制期间通过 `attachShadow()` 创建的 closed Shadow DOM。
录制器保存根引用，页面上的 `host.shadowRoot` 仍然返回 `null`，不会把 closed 改成 open。

## 录制前已经存在的 closed 根

浏览器不会通过普通 DOM API 暴露已有 closed 根。持有根引用的应用、浏览器扩展或 CDP 集成可以显式注册：

```js
import { record } from '@rrweb/record';

const root = host.attachShadow({ mode: 'closed' });
root.innerHTML = '<p>组件内容</p>';

record.registerShadowRoot(root);
const stop = record({ emit: saveEvent });
```

在录制期间调用 `record.registerShadowRoot(root)` 会重新生成全量快照，
建立已有内容的节点基线，之后继续记录增量变化。尚未插入文档的根会在宿主插入时采集。
注册同一个根不会重复安装它的观察器。

单独使用 `rrweb-snapshot` 时，可以使用同包导出的 `registerShadowRoot(root)`，然后调用 `snapshot()`。

## iframe 与回放

根内同源 iframe 使用现有的同源采集机制。跨域 iframe 仍需在父页面和子页面配置
`recordCrossOriginIframes: true`，详见[跨域 iframe](./cross-origin-iframes.zh_CN.md)。

closed 根沿用现有 Shadow DOM 事件格式。回放器会在沙箱中重建为 open 根，以便应用后续变更；原页面中的根仍然保持 closed。

## 能力边界

- 录制器启动之前创建的根，包括声明式 closed Shadow DOM，需要调用方提供根引用；仅升级依赖无法自动找回它们。
- 录制停止期间创建的 closed 根也需要显式注册。
- iframe 中的 closed 根必须在相应文档开始观察后创建，或通过负责采集该文档的 recorder 注册。
- 普通 DOM 变更、输入、点击、鼠标移动、媒体事件、滚动和 adopted stylesheets 复用内置采集链路；
  此能力不额外提供 Canvas 或 closed 根内文本选区的支持。
- 仍应配置适合业务的输入脱敏和排除采集规则。
