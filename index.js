const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Running is good");
});

/////
var callingList = [];

io.on("connection", (socket) => {
  socket.emit("me", socket.id);

  socket.on("disconnect", () => {
    socket.broadcast.emit("callEnded");
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    callingList.push({ a: socket.id, b: userToCall });
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("disconnectCall", (data) => {
    // io.emit("leaveCall", data.signal);\

    const calling = callingList.find(
      (x) => x.a === socket.id || x.b === socket.id
    );

    callingList = callingList.filter(
      (x) => x.a === socket.id || x.b === socket.id
    );
    console.log("callingList", callingList);
    if (calling) {
      //console.log("callingList", callingList);

      io.to(calling.a).emit("leaveCall");
      io.to(calling.b).emit("leaveCall");
    }
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
