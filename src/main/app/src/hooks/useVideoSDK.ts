import React, { useCallback, useEffect, useRef } from 'react';
import { type SignalMessage, useSignaling } from './useSignaling';
import { type OnCallRejected, type OnIncomingCall, useWebRTC } from './useWebRTC';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseVideoSDKOptions {
    roomId: string;
    isCaller: boolean;
    onIncomingCall?: OnIncomingCall;
    onCallRejected?: OnCallRejected;
    setHasRemote?: (hasRemote: boolean) => void;
}

export interface UseVideoSDKReturn {
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
    join: () => Promise<void>;
    toggleMic: () => void;
    toggleCam: () => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    startRecording: () => void;
    stopRecording: () => void;
    outRoomChat?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECORDING_MIME_TYPES: string[] = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
];

const defaultIncomingCallUI: OnIncomingCall = (accept, reject) => {
    if (window.confirm('Có cuộc gọi đến. Bạn có muốn nghe không?')) {
        void accept();
    } else {
        reject();
    }
};

const defaultCallRejected: OnCallRejected = () =>
        alert('Người dùng đã từ chối cuộc gọi.');

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVideoSDK({
                                roomId,
                                isCaller,
                                onIncomingCall,
                                onCallRejected,
                                setHasRemote
                            }: UseVideoSDKOptions): UseVideoSDKReturn {

    // ─── Refs ─────────────────────────────────────────────────────────────────
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedBlobsRef = useRef<Blob[]>([]);

    // ─── Bridge ref: signaling → webrtc ──────────────────────────────────────
    // useSignaling cần onMessage ổn định (không re-create Client mỗi render).
    // Dùng ref để trỏ tới handleMessage mới nhất từ useWebRTC mà không
    // tạo dependency cycle giữa hai hook.
    const handleMessageRef = useRef<(msg: SignalMessage) => void>(() => {
    });

    const {sendSignal, initWebSocket} = useSignaling({
        roomId,
        onMessage: (message) => handleMessageRef.current(message),
    });

    const {initPeerConnection, handleMessage, getVideoSender, cleanup} = useWebRTC({
        isCaller,
        sendSignal,
        onIncomingCall: onIncomingCall ?? defaultIncomingCallUI,
        onCallRejected: onCallRejected ?? defaultCallRejected,
    });

    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    // ─── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            cleanup();
        };
    }, [cleanup]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            console.log('[VideoSDK] Browser closing...');
            sendSignal('leave', {});
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [sendSignal]);

    // ─── Join ─────────────────────────────────────────────────────────────────
    const join = useCallback(async (): Promise<void> => {
        // 1. Camera + mic
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        } catch (err) {
            console.error('[VideoSDK] getUserMedia failed:', err);
            throw err;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        // 2. PeerConnection
        initPeerConnection(stream, (remoteStream) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
                setHasRemote?.(true);
            }
        });

        // 3. WebSocket + 'joined' handshake
        initWebSocket();
        setTimeout(() => {
            sendSignal('joined', {});
        }, 300);
    }, [initPeerConnection, initWebSocket, sendSignal, setHasRemote]);

    // ─── Media controls ───────────────────────────────────────────────────────
    const toggleMic = useCallback((): void => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = !track.enabled;
    }, []);

    const toggleCam = useCallback((): void => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) track.enabled = !track.enabled;
    }, []);

    // ─── Screen share ─────────────────────────────────────────────────────────
    const replaceLocalVideoTrack = useCallback((newTrack: MediaStreamTrack): void => {
        localStreamRef.current?.getVideoTracks().forEach((t) => {
            t.stop();
            localStreamRef.current!.removeTrack(t);
        });
        localStreamRef.current?.addTrack(newTrack);
    }, []);

    const stopScreenShare = useCallback(async (): Promise<void> => {
        let cameraStream: MediaStream;
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({video: true});
        } catch (err) {
            console.error('[VideoSDK] Failed to reacquire camera:', err);
            return;
        }

        const cameraTrack = cameraStream.getVideoTracks()[0];
        const sender = getVideoSender();
        if (sender) await sender.replaceTrack(cameraTrack);

        replaceLocalVideoTrack(cameraTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }, [getVideoSender, replaceLocalVideoTrack]);

    const startScreenShare = useCallback(async (): Promise<void> => {
        let screenStream: MediaStream;
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({video: true});
        } catch (err) {
            console.error('[VideoSDK] getDisplayMedia failed:', err);
            return;
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = getVideoSender();

        if (!sender) {
            console.error('[VideoSDK] No video sender found');
            screenTrack.stop();
            return;
        }

        await sender.replaceTrack(screenTrack);
        replaceLocalVideoTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = new MediaStream([screenTrack]);

        screenTrack.onended = () => void stopScreenShare();
    }, [getVideoSender, replaceLocalVideoTrack, stopScreenShare]);

    // ─── Recording ────────────────────────────────────────────────────────────
    const downloadBlob = useCallback((blob: Blob): void => {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `recording-${Date.now()}.webm`,
            style: 'display:none',
        });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }, []);

    const uploadRecording = useCallback((blob: Blob): void => {
        const formData = new FormData();
        formData.append('file', blob, `recording-${Date.now()}.webm`);

        fetch('http://localhost:8080/api/recordings/upload', {method: 'POST', body: formData})
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    console.log('[VideoSDK] Recording uploaded');
                })
                .catch((err: unknown) => console.error('[VideoSDK] Upload failed:', err));
    }, []);

    const startRecording = useCallback((): void => {
        const mimeType = RECORDING_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
        if (!mimeType) {
            console.error('[VideoSDK] No supported MIME type for MediaRecorder');
            return;
        }
        if (!localStreamRef.current) return;

        recordedBlobsRef.current = [];

        const recorder = new MediaRecorder(localStreamRef.current, {mimeType});
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = ({data}: BlobEvent) => {
            if (data?.size > 0) recordedBlobsRef.current.push(data);
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedBlobsRef.current, {type: mimeType});
            downloadBlob(blob);
            uploadRecording(blob);
        };

        recorder.start(100);
    }, [downloadBlob, uploadRecording]);

    const stopRecording = useCallback((): void => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current?.stop();
        }
    }, []);

    // ─── Out room Chat ────────────────────────────────────────────────────────
    const outRoomChat = useCallback((): void => {
        console.log('[VideoSDK] Leaving room...');

        // 1. notify remote
        sendSignal('leave', {});

        // 2. stop local media
        localStreamRef.current?.getTracks().forEach((track) => {
            track.stop();
        });
        localStreamRef.current = null;

        // 3. clear video UI
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        // 4. update UI state
        setHasRemote?.(false);

        // 5. cleanup WebRTC
        cleanup();
    }, [cleanup, sendSignal, setHasRemote]);

    // ─── Return public API ────────────────────────────────────────────────────
    return {
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
    };
}