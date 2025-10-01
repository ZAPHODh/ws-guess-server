-- init-db.sql
-- Este arquivo é executado automaticamente quando o container PostgreSQL é criado pela primeira vez

-- Criar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- O Prisma vai criar as tabelas automaticamente via migrations
-- Este arquivo serve apenas para configurações iniciais do banco
