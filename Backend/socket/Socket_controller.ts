const roomUsers: Record<
  string,
  { name: string; role: string; userId: string }[]
> = {};

export function socketcontroller(io: any) {
  console.log("socket setup");

  io.on("connection", (socket: any) => {
    console.log("USER CONNECTED:", socket.id);

    socket.on("owner-join", (data: any) => {
      socket.join(`Owner-${data.roomcode}`);
      socket.join(data.roomcode);
      socket.name = data.name;
      socket.roomcode = data.roomcode;
      socket.role = data.role;

      if (!roomUsers[data.roomcode]) roomUsers[data.roomcode] = [];

      const alreadyExists = roomUsers[data.roomcode].find(
        (u) => u.userId === socket.id,
      );
      if (!alreadyExists) {
        roomUsers[data.roomcode].push({
          name: data.name,
          role: data.role,
          userId: socket.id,
        });
      }

      io.to(data.roomcode).emit("users-update", roomUsers[data.roomcode]);
      console.log("Owner joined:", socket.id, roomUsers[data.roomcode]);
    });

    socket.on("user-join-request", (data: any) => {
      socket.roomcode = data.roomcode;
      socket.name = data.name;
      socket.role = data.role;

      io.to(`Owner-${data.roomcode}`).emit("newjoinreq", {
        name: data.name,
        userId: socket.id,
        role: data.role,
        message: `${data.name} wants to join`,
      });
    });

    socket.on("acceptJoinRequest", (data: any) => {
      const targetSocket = io.sockets.sockets.get(data.userId);

      if (!targetSocket) {
        console.log("Socket not found:", data.userId);
        return;
      }

      targetSocket.join(data.roomcode);

      if (!roomUsers[data.roomcode]) roomUsers[data.roomcode] = [];

      const alreadyExists = roomUsers[data.roomcode].find(
        (u) => u.userId === data.userId,
      );
      if (!alreadyExists) {
        roomUsers[data.roomcode].push({
          name: data.name,
          role: data.role,
          userId: data.userId,
        });
      }

      // Tell new user they were accepted — they will mount VideoStream
      // and then emit "user-ready-rtc" once listeners are registered
      io.to(data.userId).emit("requestAccepted");

      // Send updated user list to whole room
      io.to(data.roomcode).emit("users-update", roomUsers[data.roomcode]);

      // ✅ REMOVED: Do NOT emit "user-join-rtc" here anymore
      // The new user's VideoStream hasn't mounted yet, so existing users
      // would send offers before the new user has registered listeners.
      // Instead, the new user emits "user-ready-rtc" once they are set up.

      console.log("User accepted:", data.name, roomUsers[data.roomcode]);
    });

    // ✅ FIX: New user emits this after VideoStream mounts and listeners are ready
    // We then tell all existing room members to start the offer process
    socket.on("user-ready-rtc", (data: any) => {
      const { roomcode } = data;
      console.log("User ready for RTC:", socket.id, "in room:", roomcode);

      // Emit to everyone else in the room (existing users)
      // They will create a peer and send an offer to this new user
      socket.to(roomcode).emit("user-join-rtc", {
        userId: socket.id,
        name: socket.name,
      });
    });

    // ── WebRTC signaling ────────────────────────────────────────────────────

    socket.on("offer", (data: any) => {
      const { offer, roomcode, to } = data;
      socket.to(to).emit("videocall", {
        from: socket.id,
        offer,
      });
    });

    socket.on("answer", (data: any) => {
      const { answer, to } = data;
      socket.to(to).emit("answer-received", {
        from: socket.id,
        answer,
      });
    });
    // Node/Express socket.io server mein
    socket.on("media-state", ({ roomcode, micOn, camOn }: any) => {
      socket.to(roomcode).emit("media-state", {
        from: socket.id,
        micOn,
        camOn,
      });
    });
    socket.on("ice-candidate", (data: any) => {
      const { candidate, to } = data;
      socket.to(to).emit("ice-candidate", {
        from: socket.id,
        candidate,
      });
    });

    // ── Room management ─────────────────────────────────────────────────────

    socket.on("rejectJoinRequest", (data: any) => {
      io.to(data.userId).emit("requestRejected");
    });
    socket.on("screen-share-state", ({ roomcode, sharing }: any) => {
      socket
        .to(roomcode)
        .emit("screen-share-state", { from: socket.id, sharing });
    });
    socket.on("send-message", (data: any) => {
      io.to(data.room).emit("receive-message", {
        name: data.name,
        room: data.room,
        text: data.text,
        time: data.time,
      });
    });

    socket.on("whiteboard", (data: any) => {
      console.log("whiteboard", data);
      if (data?.roomcode) {
        socket.to(data.roomcode).emit("whiteboard", {
          from: socket.id,
          ...data,
        });
      }
    });
    socket.on("whiteboard-draw", (data) =>
      socket.to(data.roomcode).emit("whiteboard-draw", data),
    );
    socket.on("whiteboard-clear", (data) =>
      socket.to(data.roomcode).emit("whiteboard-clear", data),
    );
    socket.on("disconnect", (reason: any) => {
      console.log("Disconnected:", socket.id, reason);

      if (socket.roomcode && roomUsers[socket.roomcode]) {
        roomUsers[socket.roomcode] = roomUsers[socket.roomcode].filter(
          (u) => u.userId !== socket.id,
        );

        io.to(socket.roomcode).emit("users-update", roomUsers[socket.roomcode]);
        io.to(socket.roomcode).emit("userLeft", {
          name: socket.name,
          userId: socket.id,
        });

        if (roomUsers[socket.roomcode].length === 0) {
          delete roomUsers[socket.roomcode];
        }
      }
    });
  });
}
