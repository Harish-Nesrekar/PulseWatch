
module.exports = {
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id CHAR(36) NOT NULL,
        user_id VARCHAR(191) NOT NULL,
        monitor_id VARCHAR(191) NULL,
        incident_id VARCHAR(191) NULL,

        event_key VARCHAR(191) NOT NULL,
        type VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NULL,
        link VARCHAR(512) NULL,

        read_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

        PRIMARY KEY (id),

        UNIQUE KEY uq_notifications_user_event (
          user_id,
          event_key
        ),

        INDEX idx_notifications_user_unread (
          user_id,
          read_at,
          created_at
        ),

        INDEX idx_notifications_user_created (
          user_id,
          created_at
        ),

        CONSTRAINT chk_notifications_type
          CHECK (
            type IN (
              'MONITOR_DOWN',
              'MONITOR_RECOVERED'
            )
          ),

        CONSTRAINT fk_notifications_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_notifications_monitor
          FOREIGN KEY (monitor_id)
          REFERENCES monitors(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_notifications_incident
          FOREIGN KEY (incident_id)
          REFERENCES incidents(id)
          ON DELETE SET NULL

      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
};
