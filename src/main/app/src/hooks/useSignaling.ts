import { Client, type IMessage } from '@stomp/stompjs';
import { useCallback, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalType = 'joined' | 'offer' | 'answer' | 'ice' | 'reject';

export interface SignalMessage {
    type: SignalType;
    roomId: string;
    senderId: string;
    data: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, never>;
}

interface PendingSignal {
    type: SignalType;
    data: SignalMessage['data'];
}

export interface UseSignalingOptions {
    roomId: string;
    onMessage: (message: SignalMessage) => void;
}

export interface UseSignalingReturn {
    sendSignal: (type: SignalType, data: SignalMessage['data']) => void;
    initWebSocket: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSignaling({roomId, onMessage}: UseSignalingOptions): UseSignalingReturn {
    const clientId = useRef<string>(crypto.randomUUID());
    const stompClient = useRef<Client | null>(null);
    const isConnected = useRef<boolean>(false);
    const pendingSignals = useRef<PendingSignal[]>([]);

    // Stable ref để tránh stale closure trong subscribe callback
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stompClient.current?.connected) {
                void stompClient.current.deactivate();
            }
        };
    }, []);

    const doSend = useCallback((type: SignalType, data: SignalMessage['data']): void => {
        stompClient.current?.publish({
            destination: '/app/signal',
            body: JSON.stringify({
                type,
                roomId,
                senderId: clientId.current,
                data,
            } satisfies SignalMessage),
        });
    }, [roomId]);

    const sendSignal = useCallback((type: SignalType, data: SignalMessage['data']): void => {
        const client = stompClient.current;

        if (!client || !client.connected) {
            pendingSignals.current.push({type, data});
            return;
        }
        doSend(type, data);
    }, [doSend]);

    const initWebSocket = useCallback((): void => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
            onConnect: () => {
                isConnected.current = true;

                client.subscribe(`/topic/room/${roomId}`, (raw: IMessage) => {
                    const message = JSON.parse(raw.body) as SignalMessage;

                    // Lọc message của chính mình —
                    // STOMP broadcast tới tất cả subscriber kể cả sender
                    if (message.senderId === clientId.current) return;

                    onMessageRef.current(message);
                });

                // Flush signals bị buffer lúc WS chưa ready (bao gồm 'joined')
                pendingSignals.current.forEach(({type, data}) => doSend(type, data));
                pendingSignals.current = [];
            },
            onStompError: (frame) => console.error('[Signaling] STOMP error:', frame),
        });

        stompClient.current = client;
        client.activate();
    }, [roomId, doSend]);

    return {sendSignal, initWebSocket};
}