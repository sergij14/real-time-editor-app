module.exports = class {
  constructor(client) {
    this.client = client;
  }

  getOrAddDoc = async (id) => {
    const data = await this.client.get(id);
    if (data) return JSON.parse(data);
    await this.client.set(id, "");
    return "";
  };

  getUsers = async (docId) => {
    const users = await this.client.get(`users:${docId}`);
    return users ? JSON.parse(users) : [];
  };

  addUser = async (docId, user) => {
    const users = await this.getUsers(docId);
    const filtered = users.filter((u) => u.id !== user.id);
    filtered.push(user);
    await this.client.set(`users:${docId}`, JSON.stringify(filtered));
  };

  removeUser = async (docId, socketId) => {
    const users = await this.getUsers(docId);
    const filtered = users.filter((u) => u.id !== socketId);
    await this.client.set(`users:${docId}`, JSON.stringify(filtered));
  };
};
