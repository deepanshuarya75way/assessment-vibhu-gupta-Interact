import userModel from "./Auth_model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response } from "express";

const JWT_SEC = process.env.JWT_SECRET;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 1000,
};

const signToken = (user: { _id: any; email: string; role: string }) => {
  const JWT_SEC = process.env.JWT_SECRET;

  if (!JWT_SEC) throw new Error("JWT secret is not configured");
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    JWT_SEC,
    { expiresIn: "1h" },
  );
};

const userPayload = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const login = async (req: Request, res: Response) => {
  try {
    const JWT_SEC = process.env.JWT_SECRET;

    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const user = await userModel.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const passwordMatches = await bcrypt.compare(
      password,
      user.password as string,
    );
    if (!passwordMatches)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = signToken(user);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res
      .status(200)
      .json({ message: "Login successful", token, user: userPayload(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const JWT_SEC = process.env.JWT_SECRET;

    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });

    const userExists = await userModel.findOne({ email });
    if (userExists)
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });

    const hashedPass = await bcrypt.hash(password, 10);
    const user = await userModel.create({ name, email, password: hashedPass });

    // ✅ sign in and set cookie right away — no need to log in again
    const token = signToken(user);
    res.cookie("token", token, COOKIE_OPTIONS);

    return res
      .status(201)
      .json({ message: "Account created", token, user: userPayload(user) });
  } catch (err) {
    console.error("Signin error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (_req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
     
      secure: process.env.NODE_ENV === "production",
     
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const forgotpass = async (req: Request, res: Response) => {
  try {
    const { password, confirmpass, email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    if (!password || !confirmpass)
      return res
        .status(400)
        .json({ message: "Password and confirm password are required" });

    if (password !== confirmpass)
      return res.status(400).json({ message: "Passwords do not match" });

    const user = await userModel.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ message: "No account found with this email" });

    const hashedPass = await bcrypt.hash(password, 10);
    await userModel.findOneAndUpdate({ email }, { password: hashedPass });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getuser = async (req: Request, res: Response) => {
  try {
    const reqUser = req.user as { email: string };

    const user = await userModel
      .findOne({ email: reqUser.email })
      .select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json(userPayload(user));
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};