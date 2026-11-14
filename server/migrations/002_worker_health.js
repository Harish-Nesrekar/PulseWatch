module.exports = {
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pulsewatch_worker_health (
        worker_id CHAR(36) NOT NULL,
        status VARCHAR(16) NOT NULL,
        started_at DATETIME(3) NOT NULL,
        heartbeat_at DATETIME(3) NOT NULL,
        cycle_started_at DATETIME(3) NULL,
        last_cycle_at DATETIME(3) NULL,
        last_check_at DATETIME(3) NULL,
        PRIMARY KEY (worker_id),
        INDEX idx_worker_health_status_heartbeat (status, heartbeat_at),
        CONSTRAINT chk_worker_health_status
          CHECK (status IN ('starting', 'running', 'stopping', 'stopped'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
};
