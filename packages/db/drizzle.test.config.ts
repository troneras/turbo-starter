import type { Config } from "drizzle-kit";

export default {
    schema: "./schema/index.ts",
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.TEST_DATABASE_URL || "postgresql://dev:dev123@localhost:5433/cms_platform_test",
    },
} satisfies Config; 