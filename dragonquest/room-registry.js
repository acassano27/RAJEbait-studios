window.RoomAddons = (() => {
  const rooms = new Map();

  return {
    register(roomId, room) {
      if (rooms.has(roomId)) {
        throw new Error(`Duplicate room add-on: ${roomId}`);
      }
      rooms.set(roomId, room);
    },
    getAll() {
      return Object.fromEntries(rooms);
    },
  };
})();
