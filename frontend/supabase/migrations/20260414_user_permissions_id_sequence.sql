CREATE SEQUENCE IF NOT EXISTS user_permissions_id_seq AS bigint;

ALTER SEQUENCE user_permissions_id_seq OWNED BY user_permissions.id;

SELECT setval(
  'user_permissions_id_seq',
  COALESCE((SELECT MAX(id) FROM user_permissions), 0) + 1,
  false
);

ALTER TABLE user_permissions
  ALTER COLUMN id SET DEFAULT nextval('user_permissions_id_seq');
