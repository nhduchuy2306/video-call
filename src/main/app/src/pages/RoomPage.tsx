import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from 'antd';
import { useVideoSDK } from "../hooks/useVideoSDK.ts";

interface RoomPageParams extends Record<string, string> {
    id: string;
}

const RoomPage = () => {
    const { id: roomId } = useParams<RoomPageParams>();
    const [params] = useSearchParams();
    const isCaller = params.get('caller') === 'true';

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
    } = useVideoSDK({
        roomId: roomId!,
        isCaller: isCaller,
        onCallRejected: () => alert('Người dùng đã từ chối cuộc gọi.'),
    });

    // Join ngay khi component mount
    useEffect(() => {
        join().catch((err: unknown) => console.error('[RoomPage] Failed to join room:', err));
    }, [join]);

    return (
            <div className="flex flex-col items-center justify-center h-screen">
                {/* Video area */}
                <div className="flex items-center justify-center gap-4 mb-4">
                    <video
                            ref={localVideoRef}
                            className="border rounded"
                            autoPlay
                            playsInline
                            muted
                    />
                    <video
                            ref={remoteVideoRef}
                            className="border rounded"
                            autoPlay
                            playsInline
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button onClick={toggleMic}>Toggle Mic</Button>
                    <Button onClick={toggleCam}>Toggle Cam</Button>
                    <Button onClick={startScreenShare}>Share Screen</Button>
                    <Button onClick={stopScreenShare}>Stop Screen Share</Button>
                    <Button onClick={startRecording}>Start Recording</Button>
                    <Button onClick={stopRecording}>Stop Recording</Button>
                </div>
            </div>
    );
};

export default RoomPage;