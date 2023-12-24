import { WebcastPushConnection } from '../src/index';

// Username of someone who is currently live
let tiktokUsername = "browneyes0727";

const numberOfConnections = 5; // replace with the number of connections you want
let globalWebcastResponse = undefined;
const connections = Array.from({ length: numberOfConnections }, (_, index) => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            const connection = new WebcastPushConnection(tiktokUsername);
            try {
                const webcastResponse = await connection.connect(null, true, true, globalWebcastResponse);
                if (webcastResponse) {
                    globalWebcastResponse = webcastResponse;
                    const state = connection.setConnected();
                    
                    console.info(`Client ${index} Connected to roomId ${state.roomId}`);
                    resolve(connection);
                } else {
                    // Handle the case where webcastResponse is undefined or null
                    console.error(`Client ${index} received no response`);
                    resolve(null);
                }
            } catch(error) {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.log("ERROR ========== error.response");
                    console.log(error.response.headers);
                    } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.log("ERROR ========== error.request");
                    // console.log(error.request);
                    } else {
                    console.log("ERROR ========== error.message");
                    // Something happened in setting up the request that triggered an Error
                    console.log('Error', error.message);
                }
                console.error(`Client ${index} Failed to connect: ${error.response?.status} ${error.message}`);
                resolve(null);
            };
        }, index * 5000); // delay of 1 second
    });
});

Promise.all(connections).then((connections: any) => {
    connections.forEach((connection, index) => {
        if (connection) {
            // Define the events that you want to handle
            // In this case we listen to chat messages (comments)
            connection.on('chat', data => {
                // console.log(`${data.uniqueId} (userId:${data.userId}) writes: ${data.comment}`);
            })
        
            // And here we receive gifts sent to the streamer
            connection.on('gift', data => {
                // console.log(`${data.uniqueId} (userId:${data.userId}) sends ${data.giftId}`);
            })
        }
    });
});