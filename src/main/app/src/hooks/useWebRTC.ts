import React, { useCallback, useRef } from 'react';
import { type SignalMessage, type SignalType } from './useSignaling';

// ─── Types ────────────────────────────────────────────────────────────────────

type SendSignal = (type: SignalType, data: SignalMessage['data']) => void;

export type AcceptFn = () => Promise<void>;
export type RejectFn = () => void;
export type OnIncomingCall = (accept: AcceptFn, reject: RejectFn) => void;
export type OnCallRejected = () => void;

export interface UseWebRTCOptions {
    isCaller: boolean;
    sendSignal: SendSignal;
    onIncomingCall: OnIncomingCall;
    onCallRejected: OnCallRejected;
}

export interface UseWebRTCReturn {
    peerConnRef: React.RefObject<RTCPeerConnection | null>;
    initPeerConnection: (localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void) => void;
    handleMessage: (message: SignalMessage) => void;
    getVideoSender: () => RTCRtpSender | null;
    cleanup: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        {urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']},
    ],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTC({isCaller, sendSignal, onIncomingCall, onCallRejected}: UseWebRTCOptions): UseWebRTCReturn {
    const hasJoined = useRef(false);
    const hasCreatedOffer = useRef(false);
    const peerConnRef = useRef<RTCPeerConnection | null>(null);

    const cleanup = useCallback((): void => {
        peerConnRef.current?.close();
        peerConnRef.current = null;
    }, []);

    // ─── Offer ────────────────────────────────────────────────────────────────
    const createOffer = useCallback(async (): Promise<void> => {
        try {
            if (hasCreatedOffer.current) return;
            if (peerConnRef.current?.signalingState !== 'stable') return;

            hasCreatedOffer.current = true;

            const offer = await peerConnRef.current!.createOffer();
            await peerConnRef.current!.setLocalDescription(offer);
            sendSignal('offer', offer);
        } catch (err) {
            console.error('[WebRTC] createOffer failed:', err);
        }
    }, [sendSignal]);

    const handleJoined = useCallback((): void => {
        if (isCaller) {
            if (!hasJoined.current) {
                hasJoined.current = true;
                void createOffer();
            }
        } else {
            if (!hasJoined.current) {
                hasJoined.current = true;
                sendSignal('joined', {});
            }
        }
    }, [isCaller, createOffer, sendSignal]);

    // ─── Offer received ───────────────────────────────────────────────────────

    const handleOffer = useCallback((offer: RTCSessionDescriptionInit): void => {
        onIncomingCall(
                async () => {
                    try {
                        await peerConnRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await peerConnRef.current!.createAnswer();
                        await peerConnRef.current!.setLocalDescription(answer);
                        sendSignal('answer', answer);
                    } catch (err) {
                        console.error('[WebRTC] handleOffer failed:', err);
                    }
                },
                () => {
                    sendSignal('reject', {});
                    console.log('[WebRTC] Call rejected by callee');
                },
        );
    }, [sendSignal, onIncomingCall]);

    // ─── Answer received ──────────────────────────────────────────────────────

    const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit): Promise<void> => {
        try {
            await peerConnRef.current!.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
            console.error('[WebRTC] handleAnswer failed:', err);
        }
    }, []);

    // ─── ICE candidate received ───────────────────────────────────────────────

    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
        try {
            await peerConnRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error('[WebRTC] addIceCandidate failed:', err);
        }
    }, []);

    // ─── Signal dispatcher ────────────────────────────────────────────────────

    const handleMessage = useCallback((message: SignalMessage): void => {
        switch (message.type) {
            case 'joined':
                console.log('[WebRTC] Joined signal received');
                handleJoined();
                break;
            case 'offer':
                console.log('[WebRTC] Offer received:', message.data);
                handleOffer(message.data as RTCSessionDescriptionInit);
                break;
            case 'answer':
                console.log('[WebRTC] Answer received:', message.data);
                void handleAnswer(message.data as RTCSessionDescriptionInit);
                break;
            case 'ice':
                console.log('[WebRTC] ICE candidate received:', message.data);
                void handleIceCandidate(message.data as RTCIceCandidateInit);
                break;
            case 'reject':
                console.log('REJECT RECEIVED', message);
                onCallRejected();
                break;
            case 'leave':
                console.log('[WebRTC] Leave signal received');
                cleanup();
                break;
            default:
                console.warn('[WebRTC] Unknown signal type:', message.type);
        }
    }, [handleJoined, handleOffer, handleAnswer, handleIceCandidate, onCallRejected, cleanup]);

    // ─── Init ─────────────────────────────────────────────────────────────────

    const initPeerConnection = useCallback((
            localStream: MediaStream,
            onRemoteStream: (stream: MediaStream) => void,
    ): void => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnRef.current = pc;

        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

        pc.ontrack = ({streams}: RTCTrackEvent) => onRemoteStream(streams[0]);

        pc.onicecandidate = ({candidate}: RTCPeerConnectionIceEvent) => {
            if (candidate) {
                sendSignal('ice', candidate.toJSON());
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
        }
        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
        }
    }, [sendSignal]);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const getVideoSender = useCallback((): RTCRtpSender | null => {
        return peerConnRef.current
                ?.getSenders()
                .find((s) => s.track?.kind === 'video') ?? null;
    }, []);

    return {peerConnRef, initPeerConnection, handleMessage, getVideoSender, cleanup};
}