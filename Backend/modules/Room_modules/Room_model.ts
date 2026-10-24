import mongoose, { Schema, Document, Types } from "mongoose";
import { boolean } from "zod";

export interface IRoom extends Document {
  roomcode: string;
  host: Types.ObjectId;
  protectedMode : boolean;
  chat: {
    name: String;
    senderId: Types.ObjectId;
    chat: String;
    time: Date;
    role : String;
  }[];
  isActive: boolean;
  createdAt: Date;
}

const roomSchema = new Schema<IRoom>({
  roomcode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  host: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  chat: [
    {
      name: {
        type: String,
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      chat: {
        type: String,
        maxlength: 1000,
        trim: true,
      },
      time: {
        type: Date,
        default: Date.now,
      },
      role : {
        type : String
      },
    },
  ],

     protectedMode : {
     type : Boolean,
     deafult : false,
    
  },
  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Room = mongoose.model<IRoom>("Room", roomSchema);
