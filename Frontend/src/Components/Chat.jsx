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
  const socketRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const room = useSelector((store) => store.User.roomcode);
  const name = useSelector((store) => store.User.name);
  const role = useSelector((store) => store.User.role);

  // ── Expose socket handle ──────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    socket: socketRef.current,
  }));

  // ── Auto scroll ───────────────────────────────────────────────────────────

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

  // ── Socket events ─────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const showStatus = (msg) => {
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(""), 3000);
    };

    const handleNewJoinReq = (data) => onNewJoinRequest?.(data);

    const handleUserJoined = (data) => {
      showStatus(`👋 ${data.name} joined`);
      onUserJoined?.(data);
    };

    const handleUserLeft = (data) => {
      showStatus(`🚶 ${data.name} left`);
      onUserLeft?.(data);
    };

    const handleReceiveMessage = (data) => {
      if (data.name === name) return;
      setMessages((prev) => [...prev, normalizeMessage(data, name)]);
    };

    socket.on("newjoinreq", handleNewJoinReq);
    socket.on("userJoined", handleUserJoined);
    socket.on("userLeft", handleUserLeft);
    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("newjoinreq", handleNewJoinReq);
      socket.off("userJoined", handleUserJoined);
      socket.off("userLeft", handleUserLeft);
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [name, onNewJoinRequest, onUserJoined, onUserLeft]);

  // ── Fetch chat history ────────────────────────────────────────────────────

  useEffect(() => {
    if (!room) return;

    const fetchChats = async () => {
      try {
        setIsFetching(true);
        const { data } = await api.get(`/room/api/getchat/${room}`);
        const normalized = data.chat.map((msg) => normalizeMessage(msg, name));
        setMessages(normalized);
      } catch (err) {
        console.error("[Chat] Failed to fetch chat history:", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchChats();
  }, [room, name]);

  // ── Send message ──────────────────────────────────────────────────────────
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

    // Optimistic update
    setMessages((prev) => [...prev, { ...msgData, isSelf: true }]);
    setNewMessage("");
    inputRef.current?.focus();

    // Emit to socket
    socket.emit("send-message", msgData);

    // Persist to DB
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
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-white/5 z-10">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-mono">ROOM CODE</span>
          <span className="text-sm font-semibold text-gray-200 tracking-wide">{room}</span>
        </div>

        {role === "Owner" ? (
          <div className="flex items-center gap-3 bg-[#242424] px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-xs text-gray-300 font-medium">Room Protected</span>
            <button
              type="button"
              onClick={handleToggleProtection}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isProtectedRoom ? "bg-orange-500" : "bg-[#333]"
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${isProtectedRoom ? "translate-x-4" : "translate-x-0"
                  }`}
              />
            </button>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${isProtectedRoom
              ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
              : "bg-white/5 border-white/5 text-gray-400"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isProtectedRoom ? "bg-orange-400 animate-pulse" : "bg-gray-500"}`} />
            {isProtectedRoom ? "Protected Mode ON" : "Open Room"}
          </div>
        )}
      </div>
      {/* Status Banner */}
      {statusMessage && (
        <div className="absolute top-16 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-orange-500/10 border border-orange-500/30 backdrop-blur-lg px-5 py-1.5 rounded-full shadow-md">
            <p className="text-orange-400 text-xs font-medium tracking-wide">
              {statusMessage}
            </p>
          </div>
        </div>
      )}

      {/* Send Error Banner */}
      {sendError && (
        <div className="absolute top-16 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-lg px-5 py-1.5 rounded-full shadow-md">
            <p className="text-red-400 text-xs font-medium tracking-wide">
              ⚠️ {sendError}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide"
      >
        <div className="flex flex-col justify-end min-h-full space-y-5">
          {/* Loading skeleton */}
          {isFetching && (
            <div className="flex flex-col space-y-3 px-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <div className="h-9 rounded-2xl bg-white/5 animate-pulse w-40" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isFetching && messages.length === 0 && (
            <p className="text-center text-gray-500 text-sm italic mt-16">
              Start the conversation 🚀
            </p>
          )}

          {/* Message list */}
          {!isFetching &&
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.isSelf ? "justify-end" : "justify-start"}`}
              >
                <div className="flex items-end gap-2 max-w-[75%]">
                  {/* Avatar — other user */}
                  {!msg.isSelf && (
                    <div className="w-7 h-7 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xs font-semibold text-orange-400 shrink-0">
                      {getInitial(msg.name)}
                    </div>
                  )}

                  {/* Bubble */}
                  <div>
                    {/* Sender name — other user only */}
                    {!msg.isSelf && (
                      <p className="text-[10px] text-gray-500 mb-1 px-1">
                        {msg.name}
                      </p>
                    )}

                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed shadow-md break-words ${
                        msg.isSelf
                          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-md"
                          : "bg-[#2a2a2a] text-gray-200 border border-white/5 rounded-2xl rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>

                    <p
                      className={`text-[10px] text-gray-500 mt-1 px-1 ${
                        msg.isSelf ? "text-right" : "text-left"
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 bg-[#121212]/80 backdrop-blur-lg">
        <div className="flex items-center gap-2 bg-[#1f1f1f] rounded-2xl px-3 py-2 border border-white/5 focus-within:border-orange-500/40 transition">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-200 placeholder-gray-500"
          />

          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 transition shadow-md active:scale-95"
            aria-label="Send message"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});