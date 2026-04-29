import { io } from 'socket.io-client';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://chatapp-42e7.onrender.com');
const socket = io(socketUrl, {
  autoConnect: false  // don't connect until user joins a room
});

export default socket;

//https://chatapp-42e7.onrender.com