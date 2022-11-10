import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import {
  SupportedModels,
  BodySegmenter,
  createSegmenter,
} from "@tensorflow-models/body-segmentation";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
`;

const Section = styled.section`
  width: 50%;
  height: 50%;
  box-sizing: border-box;
`;

const Video = styled.video`
  display: block;
  width: 100%;
  height: 100%;
`;
const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const SelectDiv = styled.div`
  position: fixed;
  bottom: 50px;
  width: 400px;
  left: 0;
  right: 0;
  margin: 0 auto;
  display: flex;
`;

const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
  },
});
selfieSegmentation.setOptions({
  modelSelection: 1,
});
selfieSegmentation.onResults((result) => console.log(result));

const App = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("none");
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const afterVideoRef = useRef<HTMLVideoElement | null>(null);
  const afterTransCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const onChangeDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId,
      },
    });
    if (sourceVideoRef.current) {
      sourceVideoRef.current.srcObject = stream;
      sourceVideoRef.current.play();
      selfieSegmentation.send({ image: sourceVideoRef.current });
    }
  };

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

  return (
    <Container>
      <Section
        style={{
          borderRight: "1px solid black",
          borderBottom: "1px solid black",
        }}
      >
        <Video ref={sourceVideoRef}></Video>
      </Section>
      <Section
        style={{
          borderRight: "1px solid black",
          borderBottom: "1px solid black",
        }}
      >
        <Canvas ref={afterTransCanvasRef}></Canvas>
      </Section>
      <Section>
        <Video ref={afterVideoRef}></Video>
      </Section>
      <SelectDiv>
        <select
          defaultValue="none"
          onChange={(e) => {
            onChangeDevice(e.target.selectedOptions[0].value);
          }}
        >
          <option value="none" disabled>
            选择设备
          </option>
          {devices.map((item) => {
            return (
              <option key={item.deviceId} value={item.deviceId}>
                {item.label}
              </option>
            );
          })}
        </select>
        <input type="file" />
      </SelectDiv>
    </Container>
  );
};

export default App;
