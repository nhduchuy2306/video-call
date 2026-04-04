import { Button, Input, Space } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const HomePage = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");

    const handleCreateRoom = async () => {
        const rooms = await fetch('http://localhost:8080/api/rooms', {method: 'POST'});
        const room = await rooms.json();
        navigate(`/room/${room.id}?caller=true`);
    }

    const handleJoinRoom = () => {
        navigate(`/room/${roomId}?caller=false`);
    }

    return (
            <div className="flex flex-col items-center justify-center h-screen border">
                <h1>Welcome to Video Call Service</h1>
                <div>
                    <Space.Compact style={{width: '100%'}}>
                        <Input placeholder="Enter Room ID" onChange={(e) => setRoomId(e.target.value)}/>
                        <Button type="primary" onClick={handleJoinRoom}>Join</Button>
                    </Space.Compact>
                    <Button type="primary" className="mt-2" onClick={handleCreateRoom}>Create Room</Button>
                </div>
            </div>
    );
}