import { WebcastPushConnection } from '../src/index';

// Username of someone who is currently live
let tiktokUsername = "savannita";

const numberOfConnections = 20; // replace with the number of connections you want

const connections = Array.from({ length: numberOfConnections }, (_, index) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const connection = new WebcastPushConnection(tiktokUsername);
            connection.connect().then(state => {
                console.info(`Client ${index} Connected to roomId ${state.roomId}`);
                resolve(connection);
            }).catch(error => {
                console.error(`Client ${index} Failed to connect: ${error.response?.status} ${error.messages}`);
                resolve(null);
            });
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