<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>
<p align="center">
  <a href="https://www.rrweb.io/" style="font-weight: bold">Try rrweb</a>
</p>

# rrweb

**[rrweb 社区新的征程](http://www.myriptide.com/rrweb-community-cn/)**

[![Join the chat at slack](https://img.shields.io/badge/slack-@rrweb-teal.svg?logo=slack)](https://join.slack.com/t/rrweb/shared_invite/zt-siwoc6hx-uWay3s2wyG8t5GpZVb8rWg)
![total gzip size](https://img.badgesize.io/https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js?compression=gzip&label=total%20gzip%20size)
![recorder gzip size](https://img.badgesize.io/https://cdn.jsdelivr.net/npm/rrweb@latest/dist/record/rrweb-record.min.js?compression=gzip&label=recorder%20gzip%20size)
[![](https://data.jsdelivr.com/v1/package/npm/rrweb/badge)](https://www.jsdelivr.com/package/npm/rrweb)

> 我已开通 Github Sponsor， 您可以通过赞助的形式帮助 rrweb 的开发。

rrweb 是 'record and replay the web' 的简写，旨在利用现代浏览器所提供的强大 API 录制并回放任意 web 界面中的用户操作。

## 指南

[**📚 rrweb 使用指南 📚**](./guide.zh_CN.md)

[**🍳 场景示例 🍳**](./docs/recipes/index.zh_CN.md)

## 项目结构

rrweb 主要由 3 部分组成：

- **[rrweb-snapshot](https://github.com/rrweb-io/rrweb/tree/master/packages/rrweb-snapshot/)**，包含 snapshot 和 rebuild 两个功能。snapshot 用于将 DOM 及其状态转化为可序列化的数据结构并添加唯一标识；rebuild 则是将 snapshot 记录的数据结构重建为对应的 DOM。
- **[rrweb](https://github.com/rrweb-io/rrweb)**，包含 record 和 replay 两个功能。record 用于记录 DOM 中的所有变更（mutation）；replay 则是将记录的变更按照对应的时间一一重放。
- **[rrweb-player](https://github.com/rrweb-io/rrweb/tree/master/packages/rrweb-player/)**，为 rrweb 提供一套 UI 控件，提供基于 GUI 的暂停、快进、拖拽至任意时间点播放等功能。

## Roadmap

- rrdom: rrweb 数据专用的 DOM 实现 [#419](https://github.com/rrweb-io/rrweb/issues/419)
- storage engine: 对大规模 rrweb 数据进行去重
- 更多的 E2E 测试
- 在常见场景下对 mutation 数据进行压缩
- 基于新的插件 API 提供更多插件，包括:
  - XHR 插件
  - fetch 插件
  - GraphQL 插件
  - ...

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

## Core Team Members

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Yuyz0112">
        <img
          src="https://avatars.githubusercontent.com/u/13651389?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>Yuyz0112</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Mark-Fenng">
        <img
          src="https://avatars.githubusercontent.com/u/27533910?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>Mark-Fenng</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/eoghanmurray">
        <img
          src="https://avatars.githubusercontent.com/u/156780?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>eoghanmurray</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Juice10">
        <img
          src="https://avatars.githubusercontent.com/u/4106?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>Juice10</b></sub>
      </a>
    </td>
  </tr>
</table>

## Who's using rrweb

<p align="center">
  <a href="http://www.smartx.com/" target="_blank">
    <img width="260px" src="https://www.rrweb.io/logos/smartx.png">
  </a>
</p>
