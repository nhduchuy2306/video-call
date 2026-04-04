package com.videocall.videocallservice.websocket;

import com.videocall.videocallservice.models.SignalMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class SignalingController {

	private final SimpMessagingTemplate messagingTemplate;

	@MessageMapping("/signal")
	public void signal(@Payload SignalMessage message) {
		messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), message);
	}
}
