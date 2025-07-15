import type { Config } from "drizzle-kit";

export default {
    schema: "./schema/index.ts",
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL || "postgresql://dev:dev123@localhost:5432/cms_platform_dev",
    },
} satisfies Config;