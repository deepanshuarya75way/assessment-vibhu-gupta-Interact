import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocket } from "../Api/ws";
import { useSelector } from "react-redux";
// ── Grid Config ────────────────────────────────────────────────────────────
function getGridConfig(n) {
  if (n === 1) return { cols: 1, rows: 1 };
  if (n === 2) return { cols: 2, rows: 1 };
  if (n === 3) return { cols: 3, rows: 1 };
  if (n === 4) return { cols: 2, rows: 2 };
  if (n <= 6) return { cols: 3, rows: 2 };
  if (n <= 9) return { cols: 3, rows: 3 };
  return { cols: 4, rows: Math.ceil(n / 4) };
}

// Mobile: max 2 cols
function getMobileGridConfig(n) {
  if (n === 1) return { cols: 1, rows: 1 };
  if (n === 2) return { cols: 2, rows: 1 };
  if (n <= 4) return { cols: 2, rows: 2 };
  if (n <= 6) return { cols: 2, rows: 3 };
  return { cols: 2, rows: Math.ceil(n / 2) };
}

// ── Icons ──────────────────────────────────────────────────────────────────

const WhiteboardBtn = ({ active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: 44,
      height: 44,
      borderRadius: 12,
      border: "none",
      background: active ? "#DCFCE7" : "#FEE2E2",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    }}
  >
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* board */}
      <rect
        x="3"
        y="4"
        width="22"
        height="15"
        rx="2"
        stroke={active ? "#16A34A" : "#DC2626"}
        strokeWidth="2"
      />
      {/* legs */}
      <line
        x1="10"
        y1="19"
        x2="8"
        y2="25"
        stroke={active ? "#16A34A" : "#DC2626"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="19"
        x2="20"
        y2="25"
        stroke={active ? "#16A34A" : "#DC2626"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* writing lines */}
      <line
        x1="7"
        y1="10"
        x2="16"
        y2="10"
        stroke={active ? "#16A34A" : "#DC2626"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="14"
        x2="13"
        y2="14"
        stroke={active ? "#16A34A" : "#DC2626"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        color: active ? "#16A34A" : "#DC2626",
        letterSpacing: 0.3,
      }}
    ></span>
  </button>
);

const MicIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const MicOffIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const CamIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const CamOffIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h1a2 2 0 0 1 2 2v9.34" />
    <line x1="16" y1="12" x2="23" y2="7" />
    <line x1="23" y1="17" x2="16" y2="12" />
  </svg>
);
const PhoneOffIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c1.12.45 2.3.78 3.53.98a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.18 2C6.72 21.5 2.5 17.28 2.5 12a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72c.2 1.23.53 2.41.98 3.53a2 2 0 0 1-.45 2.11L8.76 18.1" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const MicOffSmall = () => (
  <svg
    className="w-3 h-3"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const ScreenShareIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <polyline points="7 10 12 5 17 10" />
    <line x1="12" y1="5" x2="12" y2="15" />
  </svg>
);
const ScreenShareOffIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <polyline points="7 15 12 20 17 15" />
    <line x1="12" y1="20" x2="12" y2="10" />
  </svg>
);

// ── Hook: detect mobile ────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── Avatar ─────────────────────────────────────────────────────────────────
const AvatarPlaceholder = ({ name = "?", small = false }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]">
      <div
        className={`${small ? "w-8 h-8 text-xs" : "w-14 h-14 text-xl"} rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold`}
      >
        {initials}
      </div>
      {!small && (
        <p className="mt-2 text-[#e8e8e8]/60 text-sm font-medium">{name}</p>
      )}
    </div>
  );
};

// ── Tile Overlay ───────────────────────────────────────────────────────────
const TileOverlay = ({ displayName, micOn, small = false }) => (
  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
    <div className="flex items-center gap-1 min-w-0">
      <div
        className={`${small ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[9px]"} rounded-md bg-orange-500 flex items-center justify-center font-bold text-white flex-shrink-0`}
      >
        {displayName?.charAt(0)?.toUpperCase()}
      </div>
      {!small && (
        <span className="text-[#e8e8e8] text-xs font-medium truncate">
          {displayName}
        </span>
      )}
    </div>
    {!micOn && (
      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500/90 text-white flex-shrink-0">
        <MicOffSmall />
      </span>
    )}
  </div>
);

// ── Remote Video Tile ──────────────────────────────────────────────────────
const RemoteVideo = React.memo(
  ({ userId, streamRef, peerStates, small, streamVersion }) => {
    const users = useSelector((store) => store.User.users);
    const videoEl = useRef(null);
    const user = users.find(
      (u) => u.userId === userId || u.socketId === userId,
    );
    const displayName = user?.name || user?.username || userId;
    const { micOn = true, camOn = true } = peerStates[userId] || {};

    useEffect(() => {
      const stream = streamRef.current[userId];
      if (videoEl.current && stream) videoEl.current.srcObject = stream;
    }, [userId, streamRef, users, streamVersion]);

    return (
      <div className="relative w-full h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/[0.05]">
        <video
          ref={videoEl}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${!camOn ? "opacity-0" : "opacity-100"}`}
        />
        {!camOn && <AvatarPlaceholder name={displayName} small={small} />}
        <TileOverlay displayName={displayName} micOn={micOn} small={small} />
      </div>
    );
  },
);

// ── Control Button ─────────────────────────────────────────────────────────
const ControlBtn = ({ onClick, active, danger = false, children, label }) => (
  <button
    onClick={onClick}
    title={label}
    className={`
      flex items-center justify-center w-12 h-12 sm:w-11 sm:h-11 rounded-2xl sm:rounded-xl border transition-all duration-200 active:scale-95
      ${
        danger
          ? "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
          : active
            ? "bg-white/[0.07] border-white/[0.1] text-[#e8e8e8] hover:bg-white/12"
            : "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
      }
    `}
  >
    {children}
  </button>
);

// ── Screen Viewer ──────────────────────────────────────────────────────────
const ScreenViewer = ({
  isLocalShare,
  localScreenRef,
  remoteStream,
  presenterName,
}) => {
  const remoteVideoEl = useRef(null);
  useEffect(() => {
    if (!isLocalShare && remoteVideoEl.current && remoteStream) {
      remoteVideoEl.current.srcObject = remoteStream;
    }
  }, [isLocalShare, remoteStream]);

  return (
    <div className="relative w-full h-full bg-[#0d0d0d] rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.06] flex items-center justify-center">
      {isLocalShare ? (
        <video
          ref={localScreenRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
      ) : (
        <video
          ref={remoteVideoEl}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm rounded-lg px-2 py-1 pointer-events-none">
        <span
          className={`w-1.5 h-1.5 rounded-full ${isLocalShare ? "bg-green-400" : "bg-blue-400"} animate-pulse`}
        />
        <span className="text-white/90 text-[10px] sm:text-xs font-medium">
          {isLocalShare
            ? "You are presenting"
            : `${presenterName} is presenting`}
        </span>
      </div>
    </div>
  );
};

// ── Whiteboard Canvas ──────────────────────────────────────────────────────
const PALETTE = ["#1a1a1a", "#ffffff", "#f97316", "#facc15", "#34d399", "#60a5fa", "#f472b6", "#f87171"];

const WhiteboardCanvas = ({ socket, roomcode, isOwner }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#1a1a1a");
  const [lineWidth, setLineWidth] = useState(3);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const drawLine = useCallback((ctx, from, to, strokeColor, width, erasing) => {
    ctx.save();
    ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Receive remote draw events
  useEffect(() => {
    if (!socket) return;
    const handleDraw = ({ from, to, color: c, lineWidth: lw, erasing }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawLine(canvas.getContext("2d"), from, to, c, lw, erasing);
    };
    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Re-fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    socket.on("whiteboard-draw", handleDraw);
    socket.on("whiteboard-clear", handleClear);
    return () => {
      socket.off("whiteboard-draw", handleDraw);
      socket.off("whiteboard-clear", handleClear);
    };
  }, [socket, drawLine]);

  // Fill white on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e.nativeEvent ?? e, canvasRef.current);
  };

  const moveDraw = (e) => {
    e.preventDefault();
    if (!drawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    const pos = getPos(e.nativeEvent ?? e, canvas);
    const erasing = tool === "eraser";
    const strokeColor = erasing ? "#ffffff" : color;
    const strokeWidth = erasing ? lineWidth * 6 : lineWidth;
    drawLine(canvas.getContext("2d"), lastPos.current, pos, strokeColor, strokeWidth, false);
    socket?.emit("whiteboard-draw", {
      roomcode,
      from: lastPos.current,
      to: pos,
      color: strokeColor,
      lineWidth: strokeWidth,
      erasing: false,
    });
    lastPos.current = pos;
  };

  const endDraw = () => { drawing.current = false; lastPos.current = null; };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket?.emit("whiteboard-clear", { roomcode });
  };

  const WIDTHS = [2, 4, 8];

  return (
    <div className="relative w-full h-full bg-[#0d0d0d] rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.06] flex flex-col">
      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[#1a1a1a]/95 border-b border-white/[0.06] flex-wrap">
        {/* Tool buttons */}
        <div className="flex gap-1">
          {[
            { id: "pen",    label: "✏️" },
            { id: "eraser", label: "⬜" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              title={id.charAt(0).toUpperCase() + id.slice(1)}
              className={`w-8 h-8 rounded-lg text-sm border transition-all duration-150 ${
                tool === id
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-white/[0.05] border-white/10 text-white/60 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10" />

        {/* Palette */}
        <div className="flex gap-1 items-center">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className="rounded-full transition-all duration-150 flex-shrink-0"
              style={{
                width: 18,
                height: 18,
                background: c,
                outline: color === c && tool === "pen" ? "2px solid #f97316" : "2px solid transparent",
                outlineOffset: 1,
                border: c === "#ffffff" ? "1px solid #ffffff30" : "none",
                transform: color === c && tool === "pen" ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); setTool("pen"); }}
            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0 ml-0.5"
            title="Custom color"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10" />

        {/* Stroke widths */}
        <div className="flex items-center gap-1.5">
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              title={`${w}px`}
              className={`rounded-full flex items-center justify-center transition-all border ${
                lineWidth === w ? "border-orange-500" : "border-white/10"
              } bg-white/[0.04] hover:bg-white/10`}
              style={{ width: 22, height: 22 }}
            >
              <div
                className="rounded-full"
                style={{
                  width: w + 2,
                  height: w + 2,
                  background: lineWidth === w ? "#f97316" : "rgba(255,255,255,0.5)",
                }}
              />
            </button>
          ))}
        </div>

        {/* Clear — owner only */}
        {isOwner && (
          <>
            <div className="w-px h-5 bg-white/10 ml-auto" />
            <button
              onClick={clearBoard}
              className="px-3 py-1 rounded-lg text-xs font-semibold border bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all"
            >
              Clear
            </button>
          </>
        )}
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="w-full h-full"
          style={{
            cursor: tool === "eraser" ? "cell" : "crosshair",
            touchAction: "none",
            display: "block",
          }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Badge */}
      <div className="absolute top-[52px] left-2 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm rounded-lg px-2 py-1 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-white/90 text-[10px] sm:text-xs font-medium">
          Whiteboard
        </span>
      </div>
    </div>
  );
};

// ── Camera Sidebar (shared between screen share and whiteboard) ────────────
const CameraSidebar = ({
  sidebarWidth,
  localVideoRef,
  camOn,
  micOn,
  myName,
  isMobile,
  remoteUserIds,
  remoteStreams,
  peerStates,
  streamVersions,
}) => (
  <div
    className="flex-shrink-0 flex flex-col gap-1.5 sm:gap-2 overflow-y-auto overflow-x-hidden py-0.5"
    style={{ width: sidebarWidth }}
  >
    {/* My tile */}
    <div
      className="relative w-full flex-shrink-0 bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/[0.05]"
      style={{ aspectRatio: "1 / 1" }}
    >
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${!camOn ? "opacity-0" : "opacity-100"}`}
      />
      {!camOn && <AvatarPlaceholder name={myName} small />}
      <TileOverlay displayName="You" micOn={micOn} small />
    </div>

    {/* Remote tiles */}
    {remoteUserIds.map((userId) => (
      <div
        key={userId}
        className="relative w-full flex-shrink-0"
        style={{ aspectRatio: "1 / 1" }}
      >
        <RemoteVideo
          userId={userId}
          streamRef={remoteStreams}
          peerStates={peerStates}
          small
          streamVersion={streamVersions[userId] || 0}
        />
      </div>
    ))}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export function VideoStream() {
  const { roomcode } = useParams();
  const isMobile = useIsMobile();

  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteStreams = useRef({});
  const iceBufRef = useRef({});
  const cleanupRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const screenVideoRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteScreenInfo, setRemoteScreenInfo] = useState(null);
  const [remoteUserIds, setRemoteUserIds] = useState([]);
  const [peerStates, setPeerStates] = useState({});
  const [streamVersions, setStreamVersions] = useState({});
  const [whiteboard, setWhiteboard] = useState(false);

  const myName = useSelector((store) => store.User.name || "You");
  const users = useSelector((store) => store.User.users);
  const role = useSelector((store) => store.User.role);
  const anyoneSharing = screenSharing || !!remoteScreenInfo;
  const totalParticipants = remoteUserIds.length + 1;
  const desktopGrid = getGridConfig(totalParticipants);
  const mobileGrid = getMobileGridConfig(totalParticipants);
  const { cols, rows } = isMobile ? mobileGrid : desktopGrid;
  const isSmallTile = totalParticipants > 4;

  // Local video sync
  useEffect(() => {
    const el = localVideoRef.current;
    const stream = localStreamRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = null;
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [totalParticipants, anyoneSharing, whiteboard]);

  const toggleMic = () => {
    const newVal = !micOn;
    setMicOn(newVal);
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = newVal));
    socketRef.current?.emit("media-state", { roomcode, micOn: newVal, camOn });
  };

  const toggleCam = () => {
    const newVal = !camOn;
    setCamOn(newVal);
    localStreamRef.current
      ?.getVideoTracks()
      .forEach((t) => (t.enabled = newVal));
    socketRef.current?.emit("media-state", { roomcode, micOn, camOn: newVal });
  };

  async function toggleScreenShare() {
    if (screenSharing) {
      localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
      const camVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camVideoTrack) {
        camVideoTrack.enabled = true;
        Object.values(peersRef.current).forEach((peer) => {
          const sender = peer
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(camVideoTrack);
        });
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      socketRef.current?.emit("screen-share-state", {
        roomcode,
        sharing: false,
      });

      setCamOn(true);
      socketRef.current?.emit("media-state", { roomcode, micOn, camOn: true });
      setScreenSharing(false);
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      localScreenStreamRef.current = screenStream;
      screenStream.getVideoTracks()[0].onended = () => toggleScreenShare();
      if (screenVideoRef.current)
        screenVideoRef.current.srcObject = screenStream;
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenVideoTrack);
      });
      socketRef.current?.emit("screen-share-state", {
        roomcode,
        sharing: true,
      });
      setScreenSharing(true);
    } catch (err) {
      console.error("[ScreenShare] FAILED:", err.name, err.message);
    }
  }

  const getUserMediaStream = useCallback(async () => {
    try {
      const existing = localStreamRef.current;
      const allLive = existing
        ?.getTracks()
        .every((t) => t.readyState === "live");
      if (existing && allLive) {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.srcObject = existing;
        }
        return existing;
      }
      existing?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("[getUserMedia] FAILED:", err.name, err.message);
      return null;
    }
  }, []);

  const handleWhiteboardEvent = (data) => {
    if (data?.data !== undefined) {
      setWhiteboard(Boolean(data.data));
    } else {
      setWhiteboard((prev) => !prev);
    }
  };

  const toggleWhiteboard = () => {
    const next = !whiteboard;
    setWhiteboard(next);
    const socket = socketRef.current || getSocket();
    socket?.emit("whiteboard", {
      roomcode,
      message: next ? "white board open" : "white board closed",
      data: next,
    });
  };

  useEffect(() => {
    let isMounted = true;
    const setup = async () => {
      const stream = await getUserMediaStream();
      if (!stream || !isMounted) return;
      const socket = getSocket();
      if (!socket) return;
      socketRef.current = socket;

      const createPeer = (userId) => {
        if (peersRef.current[userId]) peersRef.current[userId].close();
        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        localStreamRef.current
          ?.getTracks()
          .forEach((track) => peer.addTrack(track, localStreamRef.current));
        const incomingStream = new MediaStream();
        remoteStreams.current[userId] = incomingStream;
        peer.ontrack = (event) => {
          incomingStream.addTrack(event.track);
          if (isMounted) {
            setStreamVersions((prev) => ({
              ...prev,
              [userId]: (prev[userId] || 0) + 1,
            }));
            setRemoteUserIds((prev) =>
              prev.includes(userId) ? prev : [...prev, userId],
            );
          }
        };
        peer.onicecandidate = (event) => {
          if (event.candidate)
            socket.emit("ice-candidate", {
              candidate: event.candidate,
              to: userId,
              roomcode,
            });
        };
        peer.onconnectionstatechange = () =>
          console.log(`[${userId}] connectionState: ${peer.connectionState}`);
        return peer;
      };

      const flushIce = async (userId) => {
        const buf = iceBufRef.current[userId] || [];
        const peer = peersRef.current[userId];
        if (!peer || buf.length === 0) return;
        for (const c of buf) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            console.error(`[${userId}] ICE flush:`, e);
          }
        }
        iceBufRef.current[userId] = [];
      };

      const handleUserJoinRtc = async ({ userId }) => {
        const peer = createPeer(userId);
        peersRef.current[userId] = peer;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", {
          offer: peer.localDescription,
          roomcode,
          to: userId,
        });
      };

      const handleVideoCall = async ({ from, offer }) => {
        const peer = createPeer(from);
        peersRef.current[from] = peer;
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIce(from);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("answer", { answer, to: from, roomcode });
      };
      const handleAnswerReceived = async ({ from, answer }) => {
        const peer = peersRef.current[from];
        if (!peer) return;
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIce(from);
      };
      const handleIceCandidate = async ({ from, candidate }) => {
        const peer = peersRef.current[from];
        if (!peer || !candidate) return;
        if (peer.remoteDescription?.type) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error(`[${from}] ICE:`, e);
          }
        } else {
          if (!iceBufRef.current[from]) iceBufRef.current[from] = [];
          iceBufRef.current[from].push(candidate);
        }
      };

      const handleUserLeft = ({ userId }) => {
        if (peersRef.current[userId]) {
          peersRef.current[userId].close();
          delete peersRef.current[userId];
        }
        delete remoteStreams.current[userId];
        setRemoteUserIds((prev) => prev.filter((id) => id !== userId));
        setPeerStates((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        setStreamVersions((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        setRemoteScreenInfo((prev) => (prev?.userId === userId ? null : prev));
      };
      const handleMediaState = ({ from, micOn, camOn }) => {
        setPeerStates((prev) => ({ ...prev, [from]: { micOn, camOn } }));
      };
      const handleScreenShareState = ({ from, sharing }) => {
        if (sharing) {
          const stream = remoteStreams.current[from];
          setRemoteScreenInfo({ userId: from, stream });
        } else {
          setRemoteScreenInfo(null);
        }
      };

      socket.on("user-join-rtc", handleUserJoinRtc);
      socket.on("videocall", handleVideoCall);
      socket.on("answer-received", handleAnswerReceived);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("media-state", handleMediaState);
      socket.on("userLeft", handleUserLeft);
      socket.on("screen-share-state", handleScreenShareState);
      socket.on("whiteboard", handleWhiteboardEvent);
      socket.emit("user-ready-rtc", { roomcode });

      cleanupRef.current = () => {
        socket.off("user-join-rtc", handleUserJoinRtc);
        socket.off("videocall", handleVideoCall);
        socket.off("answer-received", handleAnswerReceived);
        socket.off("ice-candidate", handleIceCandidate);
        socket.off("media-state", handleMediaState);
        socket.off("userLeft", handleUserLeft);
        socket.off("whiteboard", handleWhiteboardEvent);
        socket.off("screen-share-state", handleScreenShareState);
        Object.values(peersRef.current).forEach((p) => p.close());
        peersRef.current = {};
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
        localScreenStreamRef.current = null;
      };
    };
    setup();
    return () => {
      isMounted = false;
      cleanupRef.current?.();
    };
  }, [roomcode, getUserMediaStream]);

  const getPresenterName = (userId) => {
    if (!userId) return "";
    const user = users.find(
      (u) => u.userId === userId || u.socketId === userId,
    );
    return user?.name || user?.username || userId;
  };

  // ── Sidebar width responsive ──
  const sidebarWidth = isMobile ? "100px" : "168px";

  // Shared sidebar props
  const sidebarProps = {
    sidebarWidth,
    localVideoRef,
    camOn,
    micOn,
    myName,
    isMobile,
    remoteUserIds,
    remoteStreams,
    peerStates,
    streamVersions,
  };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-[#111111]">
      {/* ── Video Area ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* ═══════════════ SCREEN SHARE LAYOUT ═══════════════ */}
        {anyoneSharing ? (
          <div className="w-full h-full flex p-1.5 sm:p-2 gap-1.5 sm:gap-2">
            <div className="flex-1 min-w-0 min-h-0">
              <ScreenViewer
                isLocalShare={screenSharing}
                localScreenRef={screenVideoRef}
                remoteStream={remoteScreenInfo?.stream ?? null}
                presenterName={getPresenterName(remoteScreenInfo?.userId)}
              />
            </div>
            <CameraSidebar {...sidebarProps} />
          </div>

        /* ═══════════════ WHITEBOARD LAYOUT ═══════════════ */
        ) : whiteboard ? (
          <div className="w-full h-full flex p-1.5 sm:p-2 gap-1.5 sm:gap-2">
            {/* Whiteboard canvas — takes remaining space */}
            <div className="flex-1 min-w-0 min-h-0">
              <WhiteboardCanvas
                socket={socketRef.current}
                roomcode={roomcode}
                isOwner={role === "Owner"}
              />
            </div>
            {/* Camera strip — same as screen share */}
            <CameraSidebar {...sidebarProps} />
          </div>

        /* ═══════════════ NORMAL GRID LAYOUT ═══════════════ */
        ) : (
          <div className="w-full h-full flex items-center justify-center p-1.5 sm:p-2">
            {totalParticipants === 1 ? (
              // Solo — centred square
              <div
                className="relative bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/[0.05]"
                style={{
                  width: isMobile ? "75vw" : "min(35%, calc(100vh - 140px))",
                  aspectRatio: "1 / 1",
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${!camOn ? "opacity-0" : "opacity-100"}`}
                />
                {!camOn && <AvatarPlaceholder name={myName} />}
                <TileOverlay displayName="You" micOn={micOn} />
              </div>
            ) : (
              // Grid
              <div
                className="w-full h-full min-h-0"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                  gap: isMobile ? "4px" : "6px",
                }}
              >
                {/* My tile */}
                <div
                  className="relative bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/[0.05]"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${!camOn ? "opacity-0" : "opacity-100"}`}
                  />
                  {!camOn && (
                    <AvatarPlaceholder
                      name={myName}
                      small={isSmallTile || isMobile}
                    />
                  )}
                  <TileOverlay
                    displayName="You"
                    micOn={micOn}
                    small={isMobile && isSmallTile}
                  />
                </div>

                {/* Remote tiles */}
                {remoteUserIds.map((userId) => (
                  <div key={userId} style={{ aspectRatio: "1 / 1" }}>
                    <RemoteVideo
                      userId={userId}
                      streamRef={remoteStreams}
                      peerStates={peerStates}
                      small={isSmallTile || isMobile}
                      streamVersion={streamVersions[userId] || 0}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Control Bar ── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-2.5 px-4 border-t border-white/[0.05] bg-[#1a1a1a]/80 backdrop-blur-sm">
        {role === "Owner" ? (
          <WhiteboardBtn active={whiteboard} onClick={toggleWhiteboard} />
        ) : (
          <div />
        )}

        <ControlBtn
          onClick={toggleMic}
          active={micOn}
          label={micOn ? "Mute mic" : "Unmute mic"}
        >
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </ControlBtn>
        <ControlBtn
          onClick={toggleCam}
          active={camOn}
          label={camOn ? "Camera off" : "Camera on"}
        >
          {camOn ? <CamIcon /> : <CamOffIcon />}
        </ControlBtn>
        {!isMobile && (
          <ControlBtn
            onClick={toggleScreenShare}
            active={screenSharing}
            label={screenSharing ? "Stop sharing" : "Share screen"}
          >
            {screenSharing ? <ScreenShareOffIcon /> : <ScreenShareIcon />}
          </ControlBtn>
        )}
        <div className="w-px h-5 bg-white/10" />
        <ControlBtn
          onClick={() => window.history.back()}
          danger
          label="Leave call"
        >
          <PhoneOffIcon />
        </ControlBtn>
      </div>
    </div>
  );
}