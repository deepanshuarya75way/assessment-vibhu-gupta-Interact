

import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearUser } from "../Redux/Features/UserSlice";
import { getSocket } from "../Api/ws";
import api from "../Api/axios";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeMessage = (msg, selfName) => ({
  name: msg.name,
  text: msg.text ?? msg.chat ?? "",
  time:
    msg.time ??
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  isSelf: msg.name === selfName,
});

const getInitial = (name) => name?.charAt(0)?.toUpperCase() ?? "?";

// ─── Component ────────────────────────────────────────────────────────────────

export const Chat = forwardRef(function Chat(
  { onNewJoinRequest, onUserJoined, onUserLeft },
  ref
) {
  const [statusMessage, setStatusMessage] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [sendError, setSendError] = useState("");
  const [isProtectedRoom, setIsProtectedRoom] = useState(false);
  const [participants, setParticipants] = useState([]); // [{ name, userId, socketId }]
  const [showUserList, setShowUserList] = useState(false); // To toggle user list dropdown/modal


  const socketRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const room = useSelector((store) => store.User.roomcode);
  const name = useSelector((store) => store.User.name);
  const role = useSelector((store) => store.User.role);
  const userId = useSelector((store) => store.User.userId);
  // ── Expose socket handle ──────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    socket: socketRef.current,
  }));

  // ── Auto scroll ───────────────────────────────────────────────────────────
  const handleUserJoinedEvent = (data) => {
    setParticipants((prev) => [...prev, data]);
  };

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Auth guard + socket init ──────────────────────────────────────────────


  useEffect(() => {
    if (!name) {
      dispatch(clearUser());
      navigate("/");
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    socketRef.current = socket;

    const handleDisconnect = (reason) => {
      if (reason !== "io server disconnect") {
        dispatch(clearUser());
        navigate("/");
      }
    };

    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
    };
  }, [name, dispatch, navigate]);


  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room || !name) return;

    // ✅ Uses the correctly declared component scope variable instance
    socket.emit("join-room-chat", { room, name, userId: userId });

  }, [room, name, userId]);


  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const showStatus = (msg) => {
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(""), 3000);
    };

    const handleNewJoinReq = (data) => onNewJoinRequest?.(data);

    // ✅ 1. Replaces the whole array layout from the backend state snapshot
    const handleUpdateUsers = (userList) => {
      console.log("Received full user list snapshot:", userList);
      setParticipants(userList || []);
    };

    // ✅ 2. Safely appends a flat object payload when a NEW user joins later
    const handleUserJoinedEvent = (data) => {
      showStatus(`👋 ${data.name} joined`);
      setParticipants((prev) => {
        // Prevent duplicating if already caught by full snapshot array update
        const exists = prev.some((p) => p.socketId === data.socketId);
        if (exists) return prev;
        return [...prev, data];
      });
      onUserJoined?.(data);
    };

    const handleUserLeftEvent = (data) => {
      showStatus(`🚶 ${data.name} left`);
      setParticipants((prev) => prev.filter((p) => p.socketId !== data.socketId));
      onUserLeft?.(data);
    };

    const handleProtectionUpdated = (data) => {
      setIsProtectedRoom(data.protectedMode);
      showStatus(`🔒 Room status changed to: ${data.protectedMode ? "Protected" : "Open"}`);
    };

    const handleReceiveMessage = (data) => {
      if (data.name === name) return;
      setMessages((prev) => [...prev, normalizeMessage(data, name)]);
    };

    const handleKickedAlert = () => {
      alert("You have been permanently banned from this room.");
      dispatch(clearUser());
      navigate("/");
    };

    socket.on("newjoinreq", handleNewJoinReq);
    socket.on("room-users-list", handleUpdateUsers); // Receives complete Array
    socket.on("userJoined", handleUserJoinedEvent);   // Receives flat individual Object
    socket.on("userLeft", handleUserLeftEvent);
    socket.on("room-protection-updated", handleProtectionUpdated);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("you-are-kicked", handleKickedAlert);

    return () => {
      socket.off("newjoinreq", handleNewJoinReq);
      socket.off("room-users-list", handleUpdateUsers);
      socket.off("userJoined", handleUserJoinedEvent);
      socket.off("userLeft", handleUserLeftEvent);
      socket.off("room-protection-updated", handleProtectionUpdated);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("you-are-kicked", handleKickedAlert);
    };
  }, [name, onNewJoinRequest, onUserJoined, onUserLeft, dispatch, navigate]);

  // ── Fetch chat history & Room Security Status ─────────────────────────────

  useEffect(() => {
    if (!room) return;

    const fetchChatsAndStatus = async () => {
      try {
        setIsFetching(true);

        // Fetch room protection config details
        const roomRes = await api.post("/room/api/getroom", { roomcode: room });
        if (roomRes.status === 200) {
          setIsProtectedRoom(roomRes.data.protectedMode || false);
        }

        const { data } = await api.get(`/room/api/getchat/${room}`);
        const normalized = data.chat.map((msg) => normalizeMessage(msg, name));
        setMessages(normalized);
      } catch (err) {
        console.error("[Chat] Failed to load initialization details:", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchChatsAndStatus();
  }, [room, name]);

  // ── Toggle Protection Handler ─────────────────────────────────────────────

  const handleToggleProtection = async () => {
    const socket = getSocket();
    if (!socket || role !== "Owner") return;

    const targetMode = !isProtectedRoom;

    try {
      await api.post(`/room/api/update-protection/${room}`, { protectedMode: targetMode });
      socket.emit("toggle-room-protection", { room, protectedMode: targetMode });

      setIsProtectedRoom(targetMode);
      setStatusMessage(`🔒 Room protection set to: ${targetMode ? "ON" : "OFF"}`);
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err) {
      console.error("[Chat] Protection update failed:", err);
      setSendError("Could not update room settings.");
      setTimeout(() => setSendError(""), 3000);
    }
  };

  // ── Remove/Ban User Handler ───────────────────────────────────────────────
 const handleRemoveUser = async (targetUserId, targetSocketId) => {
  const socket = getSocket();
  if (!socket || role !== "Owner") return;

  try {
   console.log("hey")
    const res = await api.post(`/room/api/ban-user/${room}`, { targetUserId });
   console.log(res)
    
    socket.emit("kick-user", { room, targetSocketId });

    setParticipants((prev) => prev.filter((p) => p.socketId !== targetSocketId));
    setStatusMessage("User removed and banned permanently.");
    setTimeout(() => setStatusMessage(""), 3000);
  } catch (err) {
    console.error("Failed to ban participant:", err);
  }
};


  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const socket = getSocket();
    const trimmed = newMessage.trim();
    if (!trimmed || !socket) return;

    setSendError("");

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const msgData = { name, text: trimmed, time, room };

    setMessages((prev) => [...prev, { ...msgData, isSelf: true }]);
    setNewMessage("");
    inputRef.current?.focus();

    socket.emit("send-message", msgData);

    try {
      await api.post(`/room/api/addchat/${room}`, {
        name,
        chat: trimmed,
        userId: socket.id,
        role,
      });
    } catch (err) {
      console.error("[Chat] Failed to persist message:", err);
      setSendError("Message not saved. Please try again.");
      setTimeout(() => setSendError(""), 4000);
    }
  }, [newMessage, name, room, role]);



  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#1a1a1a] to-[#121212] relative">

      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-white/5 z-10 relative">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-mono">ROOM CODE</span>
          <span className="text-sm font-semibold text-gray-200 tracking-wide">{room}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Users Dropdown Button */}
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="p-2 rounded-xl bg-[#242424] border border-white/5 text-gray-300 text-xs font-medium hover:bg-[#2d2d2d] transition-colors"
          >
            👥 Users ({participants.length})
          </button>

          {role === "Owner" ? (
            <div className="flex items-center gap-3 bg-[#242424] px-3 py-1.5 rounded-xl border border-white/5">
              <span className="text-xs text-gray-300 font-medium">Room Protected</span>
              <button
                type="button"
                onClick={handleToggleProtection}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isProtectedRoom ? "bg-orange-500" : "bg-[#333]"
                  }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${isProtectedRoom ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-300 ${isProtectedRoom ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-white/5 border-white/5 text-gray-400"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isProtectedRoom ? "bg-orange-400 animate-pulse" : "bg-gray-500"}`} />
              {isProtectedRoom ? "Protected Mode ON" : "Open Room"}
            </div>
          )}
        </div>

        {/* Dropdown Participant Overhaul Overlay Layer */}
        {showUserList && (
          <div className="absolute right-4 top-14 w-64 rounded-xl bg-[#242424] border border-white/5 p-3 shadow-xl z-30">
            <h3 className="text-xs font-bold text-gray-400 mb-2 tracking-wider uppercase">Participants</h3>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-hide">
              {participants.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-1">No visible users</p>
              ) : (
                participants.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#1e1e1e] p-2 rounded-lg border border-white/5">
                    <span className="text-sm text-gray-200 font-medium truncate max-w-[120px]">{user.name}</span>
                    {role === "Owner" && user.name !== name && (
                      <button
                        onClick={() => handleRemoveUser(user.userId, user.socketId)}
                        className="px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold hover:bg-red-500 hover:text-white transition-all"
                      >
                        Ban
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div className="absolute top-16 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-orange-500/10 border border-orange-500/30 backdrop-blur-lg px-5 py-1.5 rounded-full shadow-md">
            <p className="text-orange-400 text-xs font-medium tracking-wide">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* Send Error Banner */}
      {sendError && (
        <div className="absolute top-16 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-lg px-5 py-1.5 rounded-full shadow-md">
            <p className="text-red-400 text-xs font-medium tracking-wide">⚠️ {sendError}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="flex flex-col justify-end min-h-full space-y-5">
          {isFetching && (
            <div className="flex flex-col space-y-3 px-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <div className="h-9 rounded-2xl bg-white/5 animate-pulse w-40" />
                </div>
              ))}
            </div>
          )}

          {!isFetching && messages.length === 0 && (
            <p className="text-center text-gray-500 text-sm italic mt-16">Start the conversation 🚀</p>
          )}

          {!isFetching &&
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isSelf ? "justify-end" : "justify-start"}`}>
                <div className="flex items-end gap-2 max-w-[75%]">
                  {!msg.isSelf && (
                    <div className="w-7 h-7 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xs font-semibold text-orange-400 shrink-0">
                      {getInitial(msg.name)}
                    </div>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.isSelf ? "bg-orange-500 text-white rounded-br-none" : "bg-[#242424] text-gray-200 border border-white/5 rounded-bl-none"
                    }`}>
                    {!msg.isSelf && <p className="text-[10px] text-orange-400/70 font-semibold mb-0.5">{msg.name}</p>}
                    <p className="leading-relaxed break-words">{msg.text}</p>
                    <span className="block text-[9px] text-right opacity-40 mt-1">{msg.time}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Input panel bar */}
      <div className="p-4 bg-[#121212] border-t border-white/5">
        <div className="flex items-center gap-2 max-w-4xl mx-auto rounded-xl bg-[#242424] border border-white/5 px-4 py-2.5 focus-within:border-orange-500/40 transition-colors">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-transparent text-gray-200 text-sm outline-none placeholder-gray-600"
          />
          <button onClick={handleSend} className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-400 active:scale-95 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

    </div>
  );

});