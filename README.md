# rrweb

rrweb 是 'record and replay the web' 的简写，旨在利用现代浏览器所提供的强大 API 录制并回放任意 web 界面中的用户操作。

**目前 rrweb 已经解决了许多录制与回放中的难点问题，但在 1.0 版本 release 之前数据结构仍有可能发生变化，请谨慎用于生产环境中。**

## 项目结构

rrweb 主要由 3 部分组成：

- **[rrweb-snapshot](https://github.com/rrweb-io/rrweb-snapshot)**，包含 snapshot 和 rebuild 两个功能。snapshot 用于将 DOM 及其状态转化为可序列化的数据结构并添加唯一标识；rebuild 则是将 snapshot 记录的数据结构重建为对应的 DOM。
- **[rrweb](https://github.com/rrweb-io/rrweb)**，包含 record 和 replay 两个功能。record 用于记录 DOM 中的所有变更（mutation）；replay 则是将记录的变更按照对应的时间一一重放。
- **[rrweb-player](https://github.com/rrweb-io/rrweb-player)**，为 rrweb player 提供一套 UI 控件，提供基于 GUI 的暂停、快进、拖拽至任意时间点播放等功能。

## Roadmap

- rrweb
  - 避免 mutation observer 异步回调导致的时序问题
  - 处理跨域请求错误
  - 实现更高效的高精度定时器
  - 实现传输数据压缩
  - 移除 inline script
  - 验证移动端录制效果
- rrweb-player
  - 改进播放器 UI 样式
  - 实现高效的进度条拖拽功能
  - 增加全屏模式
- extensions
  - 劫持 console API，记录对应的事件
  - 劫持 Ajax/fetch API，记录请求事件
  - 封装 TraceKit，记录异常事件
- 测试
  - 补充更多单元测试
  - 随机在更多网站上运行集成测试
