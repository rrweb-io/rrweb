<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>
<p align="center">
  <a href="https://www.rrweb.io/" style="font-weight: bold">Try rrweb</a>
</p>

# rrweb

[![Build Status](https://travis-ci.org/rrweb-io/rrweb.svg?branch=master)](https://travis-ci.org/rrweb-io/rrweb) [![Join the chat at https://gitter.im/rrweb-io/rrweb](https://badges.gitter.im/rrweb-io/rrweb.svg)](https://gitter.im/rrweb-io/rrweb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

rrweb 是 'record and replay the web' 的简写，旨在利用现代浏览器所提供的强大 API 录制并回放任意 web 界面中的用户操作。

**目前 rrweb 已经解决了许多录制与回放中的难点问题，但在 1.0 版本 release 之前数据结构仍有可能发生变化，请谨慎用于生产环境中。**

## 指南

[**📚 rrweb 使用指南 📚**](./guide.zh_CN.md)

## 项目结构

rrweb 主要由 3 部分组成：

- **[rrweb-snapshot](https://github.com/rrweb-io/rrweb-snapshot)**，包含 snapshot 和 rebuild 两个功能。snapshot 用于将 DOM 及其状态转化为可序列化的数据结构并添加唯一标识；rebuild 则是将 snapshot 记录的数据结构重建为对应的 DOM。
- **[rrweb](https://github.com/rrweb-io/rrweb)**，包含 record 和 replay 两个功能。record 用于记录 DOM 中的所有变更（mutation）；replay 则是将记录的变更按照对应的时间一一重放。
- **[rrweb-player](https://github.com/rrweb-io/rrweb-player)**，为 rrweb 提供一套 UI 控件，提供基于 GUI 的暂停、快进、拖拽至任意时间点播放等功能。

## Roadmap

- rrweb
  - 处理跨域请求错误
  - 转移至 web worker 中执行
  - 实现传输数据压缩
  - 验证移动端录制效果
- rrweb-player
  - 实现高效的进度条拖拽功能
  - 增加全屏模式
- extensions
  - 劫持 console API，记录对应的事件
  - 劫持 Ajax/fetch API，记录请求事件
  - 封装 TraceKit，记录异常事件
- 测试
  - 补充更多单元测试
  - 随机在更多网站上运行集成测试

## Internal Design

- [序列化](./docs/serialization.zh_CN.md)
- [增量快照](./docs/observer.zh_CN.md)
- [回放](./docs/replay.zh_CN.md)
- [沙盒](./docs/sandbox.zh_CN.md)

## Contribute Guide

为了保证录制和回放时可以对应到一致的数据结构，rrweb 采用 typescript 开发以提供更强的类型支持。

[Typescript 手册](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

1. Fork 需要修改的 rrweb 组件仓库
2. `npm install` 安装所需依赖
3. 修改代码并通过测试
4. 提交代码，创建 pull request

除了添加集成测试和单元测试之外，rrweb 还提供了交互式的测试工具。

[使用 REPL 工具](./guide.zh_CN.md#REPL-工具)

## Who's using rrweb

<p align="center">
  <a href="http://www.smartx.com/" target="_blank">
    <img width="260px" src="https://www.rrweb.io/logos/smartx.png">
  </a>
</p>
