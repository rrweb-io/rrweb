# rrvideo

rrvideo 是用于将 [rrweb](https://github.com/rrweb-io/rrweb) 录制的数据转为视频格式的工具。

## 安装 rrvideo

1. 安装 [ffmpeg](https://ffmpeg.org/download.html)。
2. 安装 [Node.JS](https://nodejs.org/en/download/)。
3. 执行 `npm i -g rrvideo` 以安装 rrvideo CLI。

## 使用 rrvideo

### 将一份 rrweb 录制的数据（JSON 格式）转换为视频。

```shell
rrvideo --input PATH_TO_YOUR_RRWEB_EVENTS_FILE
```

运行以上命令会在执行文件夹中生成一个 `rrvideo-output.mp4` 文件。

### 指定输出路径

```shell
rrvideo --input PATH_TO_YOUR_RRWEB_EVENTS_FILE --output OUTPUT_PATH
```

### 对回放进行配置

通过编写一个 rrvideo 配置文件再传入 rrvideo CLI 的方式可以对回放进行一定的配置。

```shell
rrvideo --input PATH_TO_YOUR_RRWEB_EVENTS_JSON_FILE --config PATH_TO_YOUR_RRVIDEO_CONFIG_FILE
```

rrvideo 配置文件可参考[示例](./rrvideo.config.example.json)。
