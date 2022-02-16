const express = require("express");
const { Server } = require("socket.io");
const path = require("path");
const LCUConnector = require("lcu-connector");
const { SetCredentials, LCURequest, SubscribeToWS } = require("./LeagueRequest");
const IPADDRESS = Object.values(require('os').networkInterfaces()).reduce((r, list) => r.concat(list.reduce((rr, i) => rr.concat(i.family==='IPv4' && !i.internal && i.address || []), [])), [])[0];

const app = express();
const PORT = 4242;

app.use(express.static(path.join(__dirname, "www")));

const server = app.listen(PORT, () => {
    //console.log("[LW RC] Listening on port:", PORT)
    console.log(`[LW RC] Open http://${IPADDRESS}:${PORT}/ in webbrowser`);
})

const io = new Server().listen(server);
io.on("connection", socket => {

    LCURequest("GET", "/lol-gameflow/v1/gameflow-phase").then(response => {
        io.emit("GameflowPhase", response.data);
    }).catch(err => {
        console.error(err);
    })

    socket.on("accept-check", () => {
        //return console.log("ACCEPTED");

        LCURequest("POST", "/lol-matchmaking/v1/ready-check/accept").then(response => {
            socket.emit("reply", response);
        }).catch(err => {
            socket.emit("reply", err);
        })
    })

    socket.on("decline-check", () => {
        //return console.log("DECLINED");

        LCURequest("POST", "/lol-matchmaking/v1/ready-check/decline").then(response => {
            socket.emit("reply", response);
        }).catch(err => {
            socket.emit("reply", err);
        })
    })
})

SubscribeToWS("OnJsonApiEvent_lol-gameflow_v1_gameflow-phase", response => {
    io.emit("GameflowPhase", response.data);
})

const connector = new LCUConnector();
connector.on("connect", creds => {
    SetCredentials(creds);
    console.log("[LW RC] Connected to LCU");

    //SubscribeToWS("OnJsonApiEvent_lol-gameflow_v1_gameflow-phase", data => {console.log(data);})
})
connector.on("disconnect", () => {
    SetCredentials(null);
    console.log("[LW RC] Disconnected from LCU");
})
connector.start();