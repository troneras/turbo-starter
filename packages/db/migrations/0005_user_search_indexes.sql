-- Create search indexes for user management performance
CREATE INDEX "idx_users_email_search" ON "users" USING gin(to_tsvector('english', "email"));
CREATE INDEX "idx_users_name_search" ON "users" USING gin(to_tsvector('english', "name"));
CREATE INDEX "idx_users_status" ON "users" ("status");
CREATE INDEX "idx_users_created_at" ON "users" ("created_at" DESC);
CREATE INDEX "idx_user_audit_logs_target_user" ON "user_audit_logs" ("target_user_id", "created_at" DESC);
CREATE INDEX "idx_user_audit_logs_performed_by" ON "user_audit_logs" ("performed_by", "created_at" DESC);