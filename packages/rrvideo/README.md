# rrvideo

[中文文档](./README.zh_CN.md)

rrvideo is a tool for transforming the session recorded by [rrweb](https://github.com/rrweb-io/rrweb) into a video.

## Install rrvideo

1. Install [ffmpeg](https://ffmpeg.org/download.html)。
2. Install [Node.JS](https://nodejs.org/en/download/)。
3. Run `npm i -g rrvideo` to install the rrvideo CLI。

## Use rrvideo

### Transform a rrweb session(in JSON format) into a video.

```shell
rrvideo --input PATH_TO_YOUR_RRWEB_EVENTS_FILE
```

Running this command will output a `rrvideo-output.mp4` file in the current working directory.

### Config the output path

```shell
rrvideo --input PATH_TO_YOUR_RRWEB_EVENTS_FILE --output OUTPUT_PATH
```

### Config the replay

You can prepare a rrvideo config file and pass it to CLI.

```shell
rrvideo --input PATH_TO_YOUR_RRWEB_EVENTS_JSON_FILE --config PATH_TO_YOUR_RRVIDEO_CONFIG_FILE
```

You can find an example of the rrvideo config file [here](./rrvideo.config.example.json).
