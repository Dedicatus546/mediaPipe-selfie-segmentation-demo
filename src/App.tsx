import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Results, SelfieSegmentation } from "@mediapipe/selfie_segmentation";

const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `/${file}`;
  },
});
selfieSegmentation.setOptions({
  modelSelection: 1,
});

const WIDTH = 128 * 5;
const HEIGHT = 72 * 5;

const App = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const svRef = useRef<HTMLVideoElement | null>(null);
  const avRef = useRef<HTMLVideoElement | null>(null);
  const acRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawTimer = useRef<number | null>(null);

  // 设备选择
  const onChangeDevice = async (event: ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.selectedOptions[0].value;
    if (deviceId === "none") {
      // 停掉 canvas 绘图
      stopDrawToCanvas();
      // 停掉 canvas 转 video 的播放
      if (avRef.current) {
        avRef.current.pause();
        avRef.current.srcObject = null;
      }
      return;
    }
    // 拿到流
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: {
          exact: deviceId,
        },
        width: WIDTH,
        height: HEIGHT,
      },
    });
    if (svRef.current) {
      svRef.current.srcObject = stream;
      svRef.current.play();
      // 开启绘制，从 svRef.current 获取视频图像
      startDrawToCanvas();
      // 开始以 30 帧的速度播放由 canvas 转换后的流
      if (avRef.current && acRef.current) {
        avRef.current.srcObject = acRef.current.captureStream(30);
        avRef.current.play();
      }
    }
  };

  // 选择图片文件
  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (imgRef.current) {
        if (imgRef.current.src) {
          URL.revokeObjectURL(imgRef.current.src);
        }
        imgRef.current.src = URL.createObjectURL(file);
      }
    }
  };

  // 绘制抠像后的 canvas
  const startDrawToCanvas = async () => {
    if (drawTimer.current) {
      stopDrawToCanvas();
    }
    // 对抠像使用一个临时的 canvas 控制器
    const getSelfieCanvasController = () => {
      const canvas = document.createElement("canvas") as HTMLCanvasElement;
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      return {
        draw(results: Results): void {
          const ctx = canvas.getContext("2d")!;
          ctx.globalCompositeOperation = "source-over";
          ctx.clearRect(0, 0, WIDTH, HEIGHT);
          ctx.drawImage(results.segmentationMask, 0, 0, WIDTH, HEIGHT);
          ctx.globalCompositeOperation = "source-in";
          ctx.drawImage(results.image, 0, 0, WIDTH, HEIGHT);
        },
        getCanvas(): HTMLCanvasElement {
          return canvas;
        },
      };
    };
    const selfieCanvasController = getSelfieCanvasController();
    // 每次抠像后都会走这个回调
    const onResults = (results: Results) => {
      const canvas = acRef.current!;
      const ctx = canvas.getContext("2d")!;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      // 存在背景的情况下
      if (imgRef.current?.src) {
        ctx.drawImage(imgRef.current, 0, 0, WIDTH, HEIGHT);
      }
      selfieCanvasController.draw(results);
      ctx.drawImage(selfieCanvasController.getCanvas(), 0, 0, WIDTH, HEIGHT);
    };
    const fn = async () => {
      // 注册回调
      selfieSegmentation.onResults(onResults);
      // 喂数据给 SelfieSegmentation 对象
      await selfieSegmentation.send({ image: svRef.current! });
      // 开始下一次绘制
      drawTimer.current = requestAnimationFrame(fn);
    };
    // 开始绘制
    drawTimer.current = requestAnimationFrame(fn);
  };

  // 清除绘制定时器
  const stopDrawToCanvas = () =>
    drawTimer.current && cancelAnimationFrame(drawTimer.current);

  // 获取设备列表
  const getDeviceList = async () => {
    // 尝试获取摄像头和麦克风，这样才能获取正确的设备列表
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => track.stop());
    // 更新设备列表
    const deviceList = await navigator.mediaDevices.enumerateDevices();
    setDevices(deviceList.filter((item) => item.kind === "videoinput"));
  };

  useEffect(() => {
    getDeviceList();
  }, []);

  // 设定统一的宽高
  useEffect(() => {
    const setResolution = (el: HTMLVideoElement | HTMLCanvasElement | null) => {
      if (el) {
        el.width = WIDTH;
        el.height = HEIGHT;
      }
    };
    setResolution(svRef.current);
    setResolution(avRef.current);
    setResolution(acRef.current);
  }, []);

  return (
    <div>
      <select onChange={onChangeDevice} defaultValue={"none"}>
        <option value={"none"}>选择视频输入设备</option>
        {devices.map((device) => (
          <option value={device.deviceId} key={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
      <br />
      <div
        style={{
          display: "flex",
        }}
      >
        <div>
          源流
          <br />
          <video ref={svRef}></video>
        </div>
        <div>
          选择背景图
          <input type="file" onChange={onFileChange} />
          <br />
          <img
            ref={imgRef}
            style={{
              width: WIDTH,
              height: HEIGHT,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
        }}
      >
        <div>
          抠像后画布
          <br />
          <canvas ref={acRef}></canvas>
        </div>
        <div>
          抠像后画布转视频流
          <br />
          <video ref={avRef}></video>
        </div>
      </div>
    </div>
  );
};

export default App;
