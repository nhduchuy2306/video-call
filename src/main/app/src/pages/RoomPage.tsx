import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { BsCameraVideo, BsCameraVideoOff } from "react-icons/bs";
import { CiLogout } from "react-icons/ci";
import { HiMiniComputerDesktop } from "react-icons/hi2";
import { MdFiberManualRecord } from "react-icons/md";
import { PiMicrophoneLight, PiMicrophoneSlash } from "react-icons/pi";
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useVideoSDK } from "../hooks/useVideoSDK.ts";

interface RoomPageParams extends Record<string, string> {
    id: string;
}

const RoomPage = () => {
    const {id: roomId} = useParams<RoomPageParams>();
    const [params] = useSearchParams();
    const isCaller = params.get('caller') === 'true';
    const navigate = useNavigate();

    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [recording, setRecording] = useState(false);
    const [hasRemote, setHasRemote] = useState(false);

    const {
        localVideoRef,
        remoteVideoRef,
        join,
        toggleMic,
        toggleCam,
        startScreenShare,
        stopScreenShare,
        startRecording,
        stopRecording,
        outRoomChat
    } = useVideoSDK({
        roomId: roomId!,
        isCaller: isCaller,
        setHasRemote: setHasRemote,
    });

    useEffect(() => {
        join().catch((err: unknown) => console.error('[RoomPage] Failed to join room:', err));
    }, [join]);

    const handleToggleControl = (type: string, start: () => void, stop?: () => void) => {
        if (type === 'mic') {
            setMicOn(prev => !prev);
            start();
        } else if (type === 'cam') {
            setCamOn(prev => !prev);
            start();
        } else if (type === 'screen') {
            setScreenSharing(prev => !prev);
            if (screenSharing) {
                start();
            } else {
                stop?.();
            }
        } else if (type === 'recording') {
            setRecording(prev => !prev);
            if (recording) {
                start();
            } else {
                stop?.();
            }
        }
    }

    const handleOutRoom = () => {
        console.log('[RoomPage] Leaving room...');
        outRoomChat?.();
        navigate("/");
    }

    return (
            <div className="flex flex-col items-stretch justify-evenly h-screen bg-black w-full">
                {/* Video area */}
                <div className="flex items-center justify-center gap-4 mb-4 w-full h-full">
                    <video
                            ref={localVideoRef}
                            className="rounded"
                            autoPlay
                            playsInline
                            muted
                    />
                    <video
                            ref={remoteVideoRef}
                            className="rounded"
                            autoPlay
                            playsInline
                            hidden={!hasRemote}
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3 flex-wrap bg-white w-full p-4">
                    <Button className="p-5! rounded-full!"
                            onClick={() => handleToggleControl("mic", toggleMic)}
                            icon={micOn ? <PiMicrophoneLight/> : <PiMicrophoneSlash/>}
                    ></Button>
                    <Button className="p-5! rounded-full!"
                            onClick={() => handleToggleControl("cam", toggleCam)}
                            icon={camOn ? <BsCameraVideo/> : <BsCameraVideoOff/>}
                    ></Button>
                    <Button className="p-5! rounded-full!"
                            onClick={() => handleToggleControl("screen", startScreenShare, stopScreenShare)}
                            icon={<HiMiniComputerDesktop/>}
                    ></Button>
                    <Button className="p-5! rounded-full!"
                            onClick={() => handleToggleControl("recording", startRecording, stopRecording)}
                            icon={<MdFiberManualRecord/>}
                    ></Button>
                    <Button className="p-5! rounded-full! bg-red-500 text-white"
                            onClick={handleOutRoom}
                            icon={<CiLogout/>}
                    ></Button>
                </div>
            </div>
    );
};

export default RoomPage;