import { io } from 'socket.io-client';

const socket = io('https://chatapp-42e7.onrender.com', {
  autoConnect: false  // don't connect until user joins a room
});

export default socket;