package com.videocall.videocallservice.services;

import com.videocall.videocallservice.models.Room;

public interface RoomService {
	Room createRoom();

	Room getRoom(String roomId);
}
