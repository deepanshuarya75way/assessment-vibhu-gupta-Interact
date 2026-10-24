import { Router }  from "express";
import express from "express"
import { 
  Createroom, 
  getroom, 
  checkownerroom, 
  storechat, 
  getchat,  
  updateRoomProtection,
  banUserFromRoom 
} from "./Room_controller.js";
import authMiddleware from "../../middleware/IsuserLoggedIn.js";

const router = express.Router()
console.log("hey")

router.post("/api/createroom" ,authMiddleware ,  Createroom)
router.post("/api/getroom"  , getroom )
router.post("/api/checkownerroom" , authMiddleware , checkownerroom )
router.post("/api/addchat/:roomcode" , storechat)
router.get("/api/getchat/:roomcode" , getchat)
router.post("/api/update-protection/:roomcode", authMiddleware, updateRoomProtection);
router.post("/api/ban-user/:roomcode", authMiddleware, banUserFromRoom);

export default router
