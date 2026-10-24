import { useState, useEffect } from "react";
import api from "../Api/axios";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { AskName } from "./AskName";
import { setName, setRole } from "../Redux/Features/UserSlice";

export default function HeroSection() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roomcode, setRoomcode] = useState("");
  const [message, setMessage] = useState("");
  const [showAskName, setShowAskName] = useState(false);

  const [isprotected, setIsprotected] = useState(false);
  const [tempRoomcode, setTempRoomcode] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const name = useSelector((store) => store.User.name);
  const userid = useSelector((store) => store.User.userId);

  useEffect(() => {
    if (name && showAskName && tempRoomcode) {
      setTimeout(() => {
        navigate(`/${tempRoomcode}`);
        setShowAskName(false);
        setTempRoomcode("");
      }, 300);
    }
  }, [name, showAskName, tempRoomcode, navigate]);

  useEffect(() => {
    dispatch((setName(null)))
  }, [])

  const createRoom = async () => {
    try {
      setError("");
      setLoading(true);
      const { data } = await api.post("/room/api/createroom", { roomisprotected: isprotected });

      // ✅ FIX: Set Owner role immediately upon room creation
      dispatch(setRole("Owner"));

      setTempRoomcode(data.roomcode);
      navigate(`/${data.roomcode}`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create room. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  function handleprotected() {
    setIsprotected((prev) => !prev);
  }
  
  const handlejoinroom = async (e) => {
    try {
      if (e) e.preventDefault();
      setError("");

      if (!roomcode.trim()) {
        setError("Please enter a room code.");
        return;
      }

      // 1. Fetch room details
      const { data, status } = await api.post("/room/api/getroom", { roomcode });
      console.log(data, status);

      if (status === 200) {

        // 2. ✅ FIX: Read directly from data.protectedMode, not data.message.protectedMode
        if (data.message.protectedMode && !userid) {
          setError("This room is protected. You must be logged in to join.");
          return;
        }

        // 3. Check if current user is the owner
        if (userid != null) {
          try {
            const checkownerroom = await api.post(
              "/room/api/checkownerroom",
              { roomcode }
            );
            console.log("checkownerroom", checkownerroom)
            if (checkownerroom.data.isOwner == true) {
              dispatch(setRole("Owner"));
            }
          } catch (ownerErr) {
            dispatch(setRole("Participant"));
          }
        }

        setTempRoomcode(roomcode);
        setShowAskName(true);

      } else {
        setMessage("Room not found");
        setTimeout(() => {
          setMessage("");
        }, 3000);
      }

    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to join room. Try again.";
      setError(errorMsg);
    }
  };

  if (showAskName) {
    return (
      <>
        <section className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6">
          <div className="flex flex-col items-center text-center gap-7 max-w-lg w-full blur-sm pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-orange-400 text-xs font-medium tracking-widest">
                VIDEO · COLLAB · AI
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="text-5xl sm:text-6xl font-bold text-[#e8e8e8] leading-[1.1] tracking-tight">
                Meet without
                <br />
                <span className="text-orange-400">boundaries.</span>
              </h1>
            </div>
          </div>
        </section>

        <AskName />
      </>
    );
  }

  return (
    <section className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6">
      
        <div className="flex items-center justify-between w-full max-w-xs px-4 py-3 rounded-xl bg-[#242424] border border-white/5">
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-[#e8e8e8]">Password Protection</span>
            <span className="text-xs text-[#777]">Require room authentication</span>
          </div>
          <button
            type="button"
            onClick={handleprotected}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isprotected ? "bg-orange-500" : "bg-[#333]"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isprotected ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>
      <div className="flex flex-col items-center text-center gap-7 max-w-lg w-full">
        {message && (
          <div className="px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs w-full max-w-xs">
            {message}
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          <span className="text-orange-400 text-xs font-medium tracking-widest">
            Meet And Call
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-5xl sm:text-6xl font-bold text-[#e8e8e8] leading-[1.1] tracking-tight">
            Meet without
            <br />
            <span className="text-orange-400">boundaries.</span>
          </h1>
          <p className="text-[#777] text-base leading-relaxed max-w-sm mx-auto">
            HD video, real-time collaboration, and AI-powered tools — all in one
            place.
          </p>
        </div>

        {error && (
          <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs w-full max-w-xs">
            {error}
          </div>
        )}


        <button
          onClick={createRoom}
          disabled={loading}
          className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 active:scale-95 transition-all duration-150 shadow-lg shadow-orange-500/20 w-full max-w-xs justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <rect
              x="1"
              y="4"
              width="10"
              height="8"
              rx="2"
              fill="white"
              opacity="0.95"
            />
            <path d="M12 7l4-2.5v8L12 10V7z" fill="white" opacity="0.9" />
          </svg>
          {loading ? "Creating..." : "Start Instant Meeting"}
        </button>

        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[#444] text-xs tracking-widest">OR</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <div className="flex items-center w-full max-w-xs rounded-xl bg-[#242424] border border-white/5 overflow-hidden focus-within:border-orange-500/40 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all duration-150">
          <div className="flex items-center gap-2 flex-1 px-4 py-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="text-[#555] shrink-0"
            >
              <rect
                x="1.5"
                y="1.5"
                width="11"
                height="11"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M4.5 7h5M7 4.5v5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <input
              name="roomcode"
              value={roomcode}
              onChange={(e) => setRoomcode(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlejoinroom()}
              type="text"
              placeholder="Enter a code or link"
              className="flex-1 bg-transparent text-[#d4d4d4] text-sm placeholder-[#444] outline-none"
            />
          </div>
          <button
            onClick={handlejoinroom}
            className="px-4 py-3 text-sm font-semibold text-orange-400 hover:text-orange-300 hover:bg-orange-500/5 transition-colors duration-150 border-l border-white/5"
          >
            Join
          </button>
        </div>

        <p className="text-[#444] text-xs">
          No account needed to join a meeting.
        </p>

        <div className="flex items-center gap-8 pt-2 border-t border-white/5 w-full max-w-xs justify-center" />
      </div>
    </section>
  );
}
