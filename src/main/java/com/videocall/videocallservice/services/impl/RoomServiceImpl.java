package com.videocall.videocallservice.services.impl;

import java.util.UUID;

import com.videocall.videocallservice.models.Room;
import com.videocall.videocallservice.repositories.RoomRepository;
import com.videocall.videocallservice.services.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

	private final RoomRepository roomRepository;

	@Override
	public Room createRoom() {
		return roomRepository.save(new Room());
	}

	@Override
	public Room getRoom(String roomId) {
		return roomRepository.findById(UUID.fromString(roomId)).orElse(null);
	}
}
