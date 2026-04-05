import { VideoCameraAddOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
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
            <div className="flex flex-col items-center justify-start h-screen mt-[10%]">
                <h1>Welcome to Video Call</h1>
                <div className="flex items-center justify-center gap-4">
                    <Button type="primary" onClick={handleCreateRoom} icon={<VideoCameraAddOutlined/>} className="p-5!">
                        Create New Room
                    </Button>
                    <div className="flex items-center gap-2">
                        <Input placeholder="Enter Room ID"
                               className="p-3!"
                               onChange={(e) => setRoomId(e.target.value)}
                        />
                        <Button type="primary" onClick={handleJoinRoom} disabled={roomId === ""} className="p-5!">
                            Join
                        </Button>
                    </div>
                </div>
            </div>
    );
}