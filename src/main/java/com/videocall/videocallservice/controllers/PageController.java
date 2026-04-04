package com.videocall.videocallservice.controllers;

import com.videocall.videocallservice.models.RomeResponse;
import com.videocall.videocallservice.models.Room;
import com.videocall.videocallservice.services.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PageController {
	private final RoomService roomService;

	@GetMapping("/room/{roomId}")
	public ResponseEntity<?> getRoom(@PathVariable String roomId) {
		Room room = roomService.getRoom(roomId);
		if(room == null) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(RomeResponse.builder()
				.roomId(room.getId())
				.caller(false)
				.build());
	}
}
