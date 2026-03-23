import { io, Socket } from 'socket.io-client';

function getWsUrl(): string {
  // NEXT_PUBLIC_WS_URL is baked at build time
  // Production: https://werewolf.ans-game.fun (goes through Cloudflare + nginx, which handles /socket.io/)
  // Development: http://localhost:3001 (direct to NestJS)
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const WS_URL = getWsUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ['polling', 'websocket'],
    });
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  const s = getSocket();
  // If already connected with a different token, disconnect first
  // so the server picks up the new JWT identity on reconnect
  if (s.connected) {
    s.disconnect();
  }
  s.auth = { token };
  s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Returns a promise that resolves when the socket is connected.
 * If already connected, resolves immediately.
 * Rejects after a timeout (default 5s).
 */
export function waitForConnection(timeoutMs = 5000): Promise<Socket> {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);

  return new Promise<Socket>((resolve, reject) => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      reject(new Error('Socket connection timeout'));
    }, timeoutMs);

    const onConnect = () => {
      clearTimeout(timer);
      resolve(s);
    };

    s.once('connect', onConnect);

    // If not yet connecting, start connecting
    if (!s.active) {
      s.connect();
    }
  });
}
