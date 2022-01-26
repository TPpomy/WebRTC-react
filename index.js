const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
const mysql = require("mysql");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const dbsql = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "webrtc",
});
dbsql.connect();

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

  socket.on("answerCall", (data, name) => {
    io.to(data.to).emit("callAccepted", data.signal, name);
    let sql = "INSERT INTO interaction(`u_call`, `u_receiver`) VALUES (?,?)";
    console.log(name);
    dbsql.query(sql, [socket.id, data.to]);
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
      io.to(calling.a).emit("leaveCall");
      io.to(calling.b).emit("leaveCall");
      //dbsql.query("DELETE FROM `interaction`");
      dbsql.query(
        "DELETE FROM `interaction` WHERE (`u_call` = ? OR `u_receiver` = ?) AND (`u_call` = ?  OR `u_receiver` = ?)",
        [calling.a, calling.a, calling.b, calling.b]
      );
    }
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
