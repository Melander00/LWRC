const https = require("https");
const LeagueWS = require("./leagueSocket");
const axios = require("axios").default;

process.removeAllListeners("warning")
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let Credentials = null;
const SetCredentials = (creds) => {
    Credentials = creds;

    if(creds)
    ConnectToWS();
}

const HTTPSAgent = new https.Agent({rejectUnauthorized: false});
const GetAxiosConfig = () => {
    const config = {
        baseURL: `${Credentials.protocol}://${Credentials.address}:${Credentials.port}`,
        httpsAgent: HTTPSAgent,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Basic " + Buffer.from(`riot:${Credentials.password}`).toString("base64"),
        }
    }
    
    return config;
}

const LCURequest = (method = "GET", url = "/", body = {}) => {
    return new Promise((resolve, reject) => {
        if(!Credentials) return;

        axios.request({
            ...GetAxiosConfig(),
            method,
            url,
            data: body,
        }).then(response => {
            resolve(response);
        }).catch(err => {
            reject(err);
        })
    })  
}

/** @type {LeagueWS} */
let ws = null;
let ReadyToSub = false;
const SubscribeQ = [];

const ConnectToWS = () => {
    if(ws) {
        ws.terminate();
        ws = null;
        ReadyToSub = false;
    }

    ws = new LeagueWS(`wss://riot:${Credentials.password}@${Credentials.address}:${Credentials.port}/`);
    ws.on("open", () => {
        console.log("[LW RC] Connected to wss");
        ReadyToSub = true;
        SubscribeQ.forEach(item => {
            ws.subscribe(item.topic, item.callback);
        })
    })
}

const SubscribeToWS = (topic, callback) => {
    if(!ReadyToSub) return SubscribeQ.push({topic, callback});
    ws.subscribe(topic, callback);
}

const UnsubscribeFromWS = (topic, callback) => {
    if(!ReadyToSub) return;
    ws.unsubscribe(topic, callback);
}

module.exports = {
    SetCredentials,
    LCURequest,
    SubscribeToWS,
    UnsubscribeFromWS
}