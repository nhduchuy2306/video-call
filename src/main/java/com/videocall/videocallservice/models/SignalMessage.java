package com.videocall.videocallservice.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SignalMessage {
	private String type;
	private String roomId;
	private String senderId;
	private Object data;
}
