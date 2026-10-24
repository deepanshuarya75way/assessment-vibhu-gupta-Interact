import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../Api/axios"; 

export default function SignUpPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const backendurl = import.meta.env.VITE_BACKEND_URI;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGoogleSignup = () => {
    window.open(`${backendurl}/auth/google`, "_self");
  };

  const handleSubmit = async () => {
    setError("");
    const { name, email, password } = form;

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/api/signup", { name , email  , password });
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: "Full name", name: "name", type: "text", placeholder: "John Doe" },
    {
      label: "Email address",
      name: "email",
      type: "email",
      placeholder: "john@example.com",
    },
    {
      label: "Password",
      name: "password",
      type: "password",
      placeholder: "Create a password",
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* LEFT PANEL — Form */}
      <div className="relative flex flex-col w-full lg:w-1/2 min-h-screen">
        <a
          href="/"
          className="absolute top-8 left-8 flex items-center gap-1.5 text-[#666] hover:text-[#d4d4d4] text-sm font-medium transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </a>

        <div className="flex flex-1 items-center justify-center px-8">
          <div className="flex flex-col gap-6 w-full max-w-[340px]">
            {/* Logo + Heading */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="6" cy="9" r="2.5" fill="white" />
                    <circle cx="13" cy="5" r="1.8" fill="white" opacity="0.7" />
                    <circle
                      cx="13"
                      cy="13"
                      r="1.8"
                      fill="white"
                      opacity="0.7"
                    />
                    <line
                      x1="8.4"
                      y1="9"
                      x2="11.3"
                      y2="6"
                      stroke="white"
                      strokeWidth="1.2"
                      opacity="0.6"
                    />
                    <line
                      x1="8.4"
                      y1="9"
                      x2="11.3"
                      y2="12"
                      stroke="white"
                      strokeWidth="1.2"
                      opacity="0.6"
                    />
                  </svg>
                </div>
                <span className="text-[#e5e5e5] font-semibold text-sm tracking-widest">
                  INTRACT
                </span>
              </div>
              <div>
                <h1 className="text-[#e8e8e8] text-2xl font-semibold tracking-tight">
                  Create your account
                </h1>
                <p className="text-[#666] text-sm mt-1">
                  Free forever. No credit card needed.
                </p>
              </div>
            </div>

            {/* Google */}
            <button
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#242424] border border-white/10 text-[#d4d4d4] text-sm font-medium hover:bg-[#2c2c2c] hover:border-white/20 active:scale-95 transition-all duration-150"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[#444] text-xs">or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Fields — rendered from array, no repetition */}
            <div className="flex flex-col gap-3">
              {fields.map(({ label, name, type, placeholder }) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <label className="text-[#888] text-xs font-medium">
                    {label}
                  </label>
                  <input
                    type={type}
                    name={name}
                    placeholder={placeholder}
                    value={form[name]}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#242424] border border-white/8 text-[#d4d4d4] text-sm placeholder-[#3d3d3d] outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/15 transition-all duration-150"
                  />
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 active:scale-95 transition-all duration-150 shadow-md shadow-orange-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            {/* Terms */}
            <p className="text-[#3d3d3d] text-xs leading-relaxed text-center">
              By signing up you agree to our{" "}
              <a
                href="/terms"
                className="text-[#555] hover:text-[#888] underline underline-offset-2 transition-colors"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="text-[#555] hover:text-[#888] underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>

            <p className="text-[#555] text-sm text-center">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — unchanged */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#161616] border-l border-white/6 flex-col items-center justify-center relative overflow-hidden gap-6 p-10"></div>
    </div>
  );
}
