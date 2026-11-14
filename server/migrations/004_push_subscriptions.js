
module.exports = {
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id CHAR(36) NOT NULL,
        user_id VARCHAR(191) NOT NULL,
        endpoint TEXT NOT NULL,
        endpoint_hash CHAR(64) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        expiration_time BIGINT NULL,
        user_agent VARCHAR(512) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ON UPDATE CURRENT_TIMESTAMP(3),

        PRIMARY KEY (id),
        UNIQUE KEY uq_push_subscription_endpoint_hash (endpoint_hash),
        INDEX idx_push_subscriptions_user (user_id),

        CONSTRAINT fk_push_subscriptions_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_delivery_outbox (
        id CHAR(36) NOT NULL,
        notification_id CHAR(36) NOT NULL,
        user_id VARCHAR(191) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        next_attempt_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        locked_at DATETIME(3) NULL,
        sent_at DATETIME(3) NULL,
        last_error VARCHAR(1000) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

        PRIMARY KEY (id),
        UNIQUE KEY uq_push_outbox_notification (notification_id),
        INDEX idx_push_outbox_pending (
          status,
          next_attempt_at,
          created_at
        ),

        CONSTRAINT chk_push_outbox_status
          CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),

        CONSTRAINT fk_push_outbox_notification
          FOREIGN KEY (notification_id)
          REFERENCES notifications(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_push_outbox_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
};
