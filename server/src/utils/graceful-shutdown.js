function closeHttpServer(server, options = {}) {
  if (!server?.listening) return Promise.resolve();

  const timeoutMs = options.timeoutMs ?? 75000;

  return new Promise((resolve, reject) => {
    let completed = false;
    let idleCloseInterval;
    const clearIdleCloseInterval = () => {
      if (idleCloseInterval) clearInterval(idleCloseInterval);
    };
    const timeout = setTimeout(() => {
      if (completed) return;
      options.onTimeout?.();
      clearIdleCloseInterval();
      server.closeAllConnections?.();
    }, timeoutMs);

    server.close(error => {
      completed = true;
      clearTimeout(timeout);
      clearIdleCloseInterval();
      if (error) reject(error);
      else resolve();
    });
    server.closeIdleConnections?.();
    idleCloseInterval = setInterval(
      () => server.closeIdleConnections?.(),
      100
    );
    idleCloseInterval.unref?.();
  });
}

module.exports = {
  closeHttpServer
};
