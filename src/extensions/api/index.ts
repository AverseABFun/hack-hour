import { Server } from "http";
import { prisma } from "../../lib/prisma.js";
import { emitter } from "../../lib/emitter.js";
import { express, Request } from "../../lib/bolt.js";
import { WebSocket, WebSocketServer } from 'ws';
import { Event } from "../../lib/emitter.js";
import { Session } from "@prisma/client";

express.get('/', async (req, res) => {
    await res.send('Hello World!');
});

express.get('/sessions', async (req, res) => {
    
});

async function syncPollEvent(event: Event, session: Session, req: Request) {
    const token = req.;

    if (!token) {
        return;
    }

    const user = await prisma.user.findUnique({
        where: {
            apiKey: token,
        },
    }); 

    if (!user) {
        return;
    }

    if (user.id === session.userId) {
        client.send(JSON.stringify({
            type: event,
            userId: user.id,
        }));
    }    
}


async function syncEvent(event: Event, session: Session, client: WebSocket) {
    const token = (client as any).meta.token;

    if (!token) {
        return;
    }

    const user = await prisma.user.findUnique({
        where: {
            apiKey: token,
        },
    }); 

    if (!user) {
        return;
    }

    if (user.id === session.userId) {
        client.send(JSON.stringify({
            type: event,
            userId: user.id,
        }));
    }    
}

// Create a WSS instance but don't start it yet
emitter.on('init', (server: Server) => {
    const wss = new WebSocketServer({
        server: server,
    });

    // Get user id filter
    wss.on('connection', (ws) => {
        (ws as any).meta = {
            token: '',
        };

        ws.on('message', (message) => {
            console.log(`Received message => ${message}`);

            // Convert raw data to JSON
            const data = JSON.parse(String(message));

            if (data.type === 'subscribe') {
                // Attach metadata to the websocket connection
                (ws as any).meta.token = data.token;

                // Send a confirmation message
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    ok: true,
                }));
            }
        });
    });

    emitter.on('minute', async () => {
        wss.clients.forEach(async (client) => {
            const token = (client as any).meta.token;

            if (!token) {
                return;
            }

            const user = await prisma.user.findUnique({
                where: {
                    apiKey: token,
                },
            }); 
            
            if (user) {
                const results = await prisma.session.findMany({
                    where: {
                        userId: user.id,
                        completed: false,
                        cancelled: false,
                    },
                });
            
                if (results.length > 0) {
                    client.send(JSON.stringify({
                        type: 'session',
                        id: results[0].messageTs,
                        minutes: results[0].time - results[0].elapsed,
                    }));
                }
            }
        });
    });

    emitter.on('start', (session) => {
        wss.clients.forEach(async (client) => {
            await syncEvent('start', session, client);
        });
    });

    emitter.on('complete', (session) => {
        wss.clients.forEach(async (client) => {
            await syncEvent('complete', session, client);
        });
    });

    emitter.on('cancel', (session) => {
        wss.clients.forEach(async (client) => {
            await syncEvent('cancel', session, client);
        });
    });

    emitter.on('pause', (session) => {
        wss.clients.forEach(async (client) => {
            await syncEvent('pause', session, client);
        });
    });

    emitter.on('resume', (session) => {
        wss.clients.forEach(async (client) => {
            await syncEvent('resume', session, client);
        });
    });

    console.log('🛜 WebSocket Server Initialized!');
});
