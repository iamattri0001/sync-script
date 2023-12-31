import React, { useEffect, useState, useRef } from "react";
import Aside from "../components/Aside";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import { ACTION } from "../actions/socketEvents";
import { FcInfo } from "react-icons/fc";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";

import toastSettings from "../constants/toastSettings";

const EditorPage = () => {
  const location = useLocation();
  if (!location.state) return <Navigate to={"/"} />;

  const socketRef = useRef(null);
  const codeRef = useState("");

  const reactNavigate = useNavigate();
  const { roomId } = useParams();

  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    async function init() {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleSocketError(err));
      socketRef.current.on("connect_failed", (err) => handleSocketError(err));

      socketRef.current.emit(ACTION.JOIN, {
        roomId,
        username: location.state?.username,
      });

      const handleSocketError = (err) => {
        console.error(err);
        toast.error("Socket connection failed, try again", toastSettings);
        reactNavigate("/");
      };

      socketRef.current.on(ACTION.JOINED, ({ clients, username, socketId }) => {
        if (username !== location.state?.username)
          toast.success(`${username} has joined`, toastSettings);
        setActiveUsers(clients);
        socketRef.current.emit(ACTION.SYNC_CODE, {
          code: codeRef.current,
          socketId,
        });
      });

      socketRef.current.on(ACTION.DISCONNCTED, ({ username, socketId }) => {
        toast(`${username} has left`, {
          ...toastSettings,
          icon: <FcInfo className="text-[24px]" />,
        });

        setActiveUsers((prevState) => {
          let newUsers = [...prevState];
          newUsers = newUsers.filter((user) => user.socketId !== socketId);
          return newUsers;
        });
      });
    }
    init();

    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTION.JOINED);
      socketRef.current.off(ACTION.DISCONNCTED);
    };
  }, []);
  return (
    <div className="min-h-screen text-primary-50 flex">
      <Aside activeUsers={activeUsers} />
      <div className="flex-grow flex items-center justify-center">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => (codeRef.current = code)}
        />
      </div>
      <a
        className="fixed text-sm text-blue-300 hover:text-blue-400 transition-all bottom-1 right-3"
        href="https://www.linkedin.com/in/deepanshu-attri-17a895241/"
        target="_blank"
      >
        @Deepanshu Attri
      </a>
    </div>
  );
};

export default EditorPage;
